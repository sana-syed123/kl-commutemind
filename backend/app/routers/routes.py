from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from app.services.routing_engine import RoutingEngine
from app.services.gtfs_graph import get_gtfs_data

router = APIRouter()

# In-memory singleton for the routing engine to avoid rebuilding on every request
engine_instance: Optional[RoutingEngine] = None

def get_routing_engine() -> RoutingEngine:
    global engine_instance
    if engine_instance is None:
        try:
            dfs = get_gtfs_data()
            engine_instance = RoutingEngine(dfs)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize routing engine: {str(e)}")
    return engine_instance

class RoutePlanRequest(BaseModel):
    origin_stop_id: str
    dest_stop_id: str

@router.post("/plan")
def plan_route(request: RoutePlanRequest, engine: RoutingEngine = Depends(get_routing_engine)):
    """
    Returns the fastest, fewest transfers, and least walking routes.
    """
    routes = engine.plan_all_routes(request.origin_stop_id, request.dest_stop_id)
    if not routes:
        raise HTTPException(status_code=404, detail="No route found between the specified stops.")
    
    return {
        "status": "success",
        "origin": request.origin_stop_id,
        "destination": request.dest_stop_id,
        "routes": routes
    }

@router.get("/stations")
def get_stations(engine: RoutingEngine = Depends(get_routing_engine)):
    """
    Returns a deduplicated list of all GTFS stations with coordinates.
    Groups stations by name and merges their lines.
    """
    stops_df = engine.dfs.get('stops')
    if stops_df is None or stops_df.empty:
        raise HTTPException(status_code=500, detail="GTFS stops data not available.")

    # Deduplicate by stop_name (ignoring case)
    stations_map = {}
    
    for _, row in stops_df.iterrows():
        stop_id = str(row['stop_id'])
        stop_name = str(row['stop_name'])
        lat = float(row.get('stop_lat', 0))
        lon = float(row.get('stop_lon', 0))
        
        # Deduce line from stop_id prefix (e.g. KJ14 -> KJ)
        line = stop_id[:2] if len(stop_id) >= 2 else "unk"
        
        # Standardize name for grouping
        # RapidKL sometimes appends " (KJ)" to the name. We can strip it if we want,
        # but simpler to just group by exact string after strip
        clean_name = stop_name.strip()
        
        if clean_name not in stations_map:
            stations_map[clean_name] = {
                "id": stop_id, # Base ID
                "name": clean_name,
                "lat": lat,
                "lng": lon,
                "lines": [line]
            }
        else:
            if line not in stations_map[clean_name]["lines"]:
                stations_map[clean_name]["lines"].append(line)

    return {
        "status": "success",
        "stations": list(stations_map.values())
    }
