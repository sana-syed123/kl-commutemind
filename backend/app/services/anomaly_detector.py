import logging
import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lon points in meters."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class AnomalyDetector:
    def __init__(self, historical_speeds: Dict[str, float] = None):
        """
        historical_speeds: mapping from route_id to baseline speed in km/h.
        """
        self.historical_speeds = historical_speeds or {}

    def detect_bunching(self, vehicles: List[Dict[str, Any]], route_id: str) -> List[Dict[str, Any]]:
        """
        Detects bunching: 3+ vehicles within 500m of each other on the same route.
        vehicles: [{'id': 'v1', 'lat': 3.14, 'lon': 101.68, 'route_id': 'KJ'}, ...]
        """
        route_vehicles = [v for v in vehicles if v.get('route_id') == route_id]
        anomalies = []
        
        # O(N^2) distance check, fine for small number of vehicles per route
        bunched_groups = []
        visited = set()
        
        for i, v1 in enumerate(route_vehicles):
            if v1['id'] in visited:
                continue
            group = [v1]
            for j, v2 in enumerate(route_vehicles):
                if i != j and v2['id'] not in visited:
                    dist = haversine(v1['lat'], v1['lon'], v2['lat'], v2['lon'])
                    if dist <= 500:
                        group.append(v2)
            
            if len(group) >= 3:
                anomalies.append({
                    "type": "bunching",
                    "route_id": route_id,
                    "vehicles": [v['id'] for v in group],
                    "message": f"Bunching detected: {len(group)} vehicles within 500m."
                })
                for v in group:
                    visited.add(v['id'])
                    
        return anomalies

    def detect_service_gap(self, vehicles: List[Dict[str, Any]], route_id: str, service_hours: bool = True) -> Optional[Dict[str, Any]]:
        """
        Detects service gap: no vehicle updated on route for 12+ min during service hours.
        """
        if not service_hours:
            return None
            
        route_vehicles = [v for v in vehicles if v.get('route_id') == route_id]
        if not route_vehicles:
            return {
                "type": "service_gap",
                "route_id": route_id,
                "message": "No vehicles active on route."
            }
            
        now = datetime.now(timezone.utc).timestamp()
        
        # Check if the most recent vehicle update is older than 12 mins (720 seconds)
        # Assuming vehicle dict has 'timestamp' in seconds
        most_recent_update = max((v.get('timestamp', 0) for v in route_vehicles), default=0)
        
        if now - most_recent_update > 720:
            return {
                "type": "service_gap",
                "route_id": route_id,
                "gap_seconds": now - most_recent_update,
                "message": f"Service gap detected: No vehicle updates for {(now - most_recent_update) // 60} minutes."
            }
        return None

    def detect_speed_anomaly(self, vehicle: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Detects speed anomaly: current speed < 30% of historical baseline.
        vehicle: {'id': 'v1', 'route_id': 'KJ', 'speed_kmh': 15.0}
        """
        route_id = vehicle.get('route_id')
        current_speed = vehicle.get('speed_kmh')
        baseline_speed = self.historical_speeds.get(route_id)
        
        if current_speed is None or baseline_speed is None or baseline_speed <= 0:
            return None
            
        if current_speed < 0.3 * baseline_speed:
            return {
                "type": "speed_anomaly",
                "vehicle_id": vehicle['id'],
                "route_id": route_id,
                "current_speed": current_speed,
                "baseline_speed": baseline_speed,
                "message": f"Speed anomaly: Vehicle {vehicle['id']} travelling at {current_speed} km/h (baseline {baseline_speed} km/h)."
            }
        return None
