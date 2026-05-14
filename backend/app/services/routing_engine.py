import networkx as nx
import pandas as pd
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class RoutingEngine:
    def __init__(self, dfs: Dict[str, pd.DataFrame]):
        self.dfs = dfs
        self.graph = nx.DiGraph()
        self._build_graph()

    def _parse_time(self, t_str: str) -> int:
        """Parses GTFS HH:MM:SS into seconds from midnight. Handles >24h times."""
        try:
            h, m, s = map(int, t_str.split(':'))
            return h * 3600 + m * 60 + s
        except Exception:
            return 0

    def _build_graph(self):
        stops = self.dfs.get('stops', pd.DataFrame())
        routes = self.dfs.get('routes', pd.DataFrame())
        trips = self.dfs.get('trips', pd.DataFrame())
        stop_times = self.dfs.get('stop_times', pd.DataFrame())
        transfers = self.dfs.get('transfers', pd.DataFrame())

        if stop_times.empty or trips.empty:
            logger.warning("Empty GTFS data. Graph not built.")
            return

        logger.info("Building NetworkX graph...")
        
        # 1. Merge to find which route each stop_time belongs to
        # stop_times may already have a route_id column (from Prasarana GTFS).
        # We prefer the route_id from trips.txt (which matches stops.txt format: AG, KJ, etc.)
        if 'route_id' in stop_times.columns:
            stop_times = stop_times.drop(columns=['route_id'])
        st_trips = stop_times.merge(trips[['trip_id', 'route_id']], on='trip_id', how='inner')
        st_trips['stop_sequence'] = pd.to_numeric(st_trips['stop_sequence'])
        st_trips = st_trips.sort_values(['trip_id', 'stop_sequence'])

        # Create Platform Nodes and Transit Edges
        # We will calculate the average travel time between consecutive stops on each route
        st_trips['arrival_sec'] = st_trips['arrival_time'].apply(self._parse_time)
        st_trips['next_stop_id'] = st_trips.groupby('trip_id')['stop_id'].shift(-1)
        st_trips['next_arrival_sec'] = st_trips.groupby('trip_id')['arrival_sec'].shift(-1)
        
        # Filter valid consecutive stops
        edges_df = st_trips.dropna(subset=['next_stop_id', 'next_arrival_sec']).copy()
        edges_df['travel_time_sec'] = edges_df['next_arrival_sec'] - edges_df['arrival_sec']
        
        # Fix negative or zero times (e.g. crossing midnight incorrectly without >24h format, though GTFS should use >24h)
        edges_df['travel_time_sec'] = edges_df['travel_time_sec'].apply(lambda x: x if x > 0 else 120)

        # Average travel time per pair per route
        avg_travel = edges_df.groupby(['stop_id', 'next_stop_id', 'route_id'])['travel_time_sec'].mean().reset_index()

        for _, row in avg_travel.iterrows():
            u = f"{row['stop_id']}_{row['route_id']}"
            v = f"{row['next_stop_id']}_{row['route_id']}"
            time_mins = max(1.0, row['travel_time_sec'] / 60.0)
            
            self.graph.add_edge(
                u, v,
                time_cost=time_mins,
                transfer_cost=0,
                walking_cost=0,
                type='transit'
            )

        # 2. Add Boarding and Alighting Edges
        # This elegantly bakes in the +3 mins transfer penalty and allows line changes at the same station
        unique_platforms = st_trips[['stop_id', 'route_id']].drop_duplicates()
        for _, row in unique_platforms.iterrows():
            station_node = row['stop_id']
            platform_node = f"{row['stop_id']}_{row['route_id']}"
            
            # Boarding: incurs 3 mins penalty and 1 transfer count
            self.graph.add_edge(
                station_node, platform_node,
                time_cost=3.0,
                transfer_cost=1,
                walking_cost=0,
                type='boarding'
            )
            
            # Alighting: free
            self.graph.add_edge(
                platform_node, station_node,
                time_cost=0.0,
                transfer_cost=0,
                walking_cost=0,
                type='alighting'
            )

        # 3. Add Physical Walking Transfers (from transfers.txt)
        if not transfers.empty:
            for _, row in transfers.iterrows():
                from_stop = row['from_stop_id']
                to_stop = row['to_stop_id']
                if from_stop != to_stop:
                    # GTFS transfer type 2 means min_transfer_time is provided
                    time_secs = float(row.get('min_transfer_time', 180))
                    time_mins = max(1.0, time_secs / 60.0)
                    
                    self.graph.add_edge(
                        from_stop, to_stop,
                        time_cost=time_mins,
                        transfer_cost=0,
                        walking_cost=time_mins,
                        type='walking'
                    )
                    
        # 4. Fallback: link stops with the exact same name (case-insensitive)
        if not stops.empty and 'stop_name' in stops.columns:
            stops['name_lower'] = stops['stop_name'].str.lower()
            for name, group in stops.groupby('name_lower'):
                stop_ids = group['stop_id'].tolist()
                if len(stop_ids) > 1:
                    for s1 in stop_ids:
                        for s2 in stop_ids:
                            if s1 != s2 and not self.graph.has_edge(s1, s2):
                                self.graph.add_edge(
                                    s1, s2,
                                    time_cost=3.0,  # 3 mins walking time
                                    transfer_cost=0,
                                    walking_cost=3.0,
                                    type='walking'
                                )
        
        logger.info(f"Graph built with {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges.")

    def _get_weight_func(self, variant: str):
        if variant == 'fastest':
            return lambda u, v, d: d['time_cost']
        elif variant == 'fewest_transfers':
            return lambda u, v, d: (d['transfer_cost'] * 1000) + d['time_cost']
        elif variant == 'least_walking':
            return lambda u, v, d: (d['walking_cost'] * 1000) + d['time_cost']
        return lambda u, v, d: d['time_cost']

    def find_route(self, origin_stop_id: str, dest_stop_id: str, variant: str = 'fastest') -> Optional[Dict[str, Any]]:
        if origin_stop_id not in self.graph or dest_stop_id not in self.graph:
            return None
        
        try:
            weight_func = self._get_weight_func(variant)
            path = nx.shortest_path(self.graph, source=origin_stop_id, target=dest_stop_id, weight=weight_func)
            
            # Compute total metrics for the path
            total_time = 0.0
            total_transfers = 0
            total_walking = 0.0
            
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                edge = self.graph[u][v]
                total_time += edge['time_cost']
                total_transfers += edge['transfer_cost']
                total_walking += edge['walking_cost']
                
            # The first boarding is counted as a transfer in our model. 
            # We subtract 1 so a direct trip is 0 transfers.
            actual_transfers = max(0, total_transfers - 1)
            
            return {
                "variant": variant,
                "path": path,
                "total_time_mins": round(total_time, 2),
                "transfers": actual_transfers,
                "walking_time_mins": round(total_walking, 2)
            }
        except nx.NetworkXNoPath:
            return None

    def plan_all_routes(self, origin_stop_id: str, dest_stop_id: str) -> Dict[str, Any]:
        """Returns all 3 routing variants in one response."""
        variants = ['fastest', 'fewest_transfers', 'least_walking']
        results = {}
        for var in variants:
            res = self.find_route(origin_stop_id, dest_stop_id, var)
            if res:
                results[var] = res
        return results

    def update_edge_weight(self, stop_id_1: str, stop_id_2: str, route_id: str, delay_mins: float):
        """Updates the graph edge weight to account for real-time delays."""
        u = f"{stop_id_1}_{route_id}"
        v = f"{stop_id_2}_{route_id}"
        if self.graph.has_edge(u, v):
            base_time = self.graph[u][v].get('base_time_cost', self.graph[u][v]['time_cost'])
            self.graph[u][v]['base_time_cost'] = base_time  # Save original
            self.graph[u][v]['time_cost'] = max(1.0, base_time + delay_mins)
            logger.info(f"Updated edge {u}->{v} with {delay_mins}m delay. New time: {self.graph[u][v]['time_cost']}")
