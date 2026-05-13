import os
import math
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class RouteRequest(BaseModel):
    origin: list[float] # [lon, lat]
    destination: list[float] # [lon, lat]
    profile: str = "foot-walking" # or "driving-car"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Radius of Earth in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("")
def get_ors_route(req: RouteRequest):
    ors_api_key = os.environ.get("ORS_API_KEY")
    
    # Try calling real ORS API
    if ors_api_key and ors_api_key != "your_ors_api_key_here":
        try:
            headers = {
                "Authorization": ors_api_key,
                "Content-Type": "application/json"
            }
            body = {
                "coordinates": [req.origin, req.destination]
            }
            url = f"https://api.openrouteservice.org/v2/directions/{req.profile}"
            response = requests.post(url, json=body, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "is_mock": False,
                    "data": data
                }
        except Exception as e:
            print(f"ORS API request failed: {e}. Falling back to mock data.")

    # Fallback to mock data
    lon1, lat1 = req.origin
    lon2, lat2 = req.destination
    
    distance_km = haversine(lat1, lon1, lat2, lon2)
    
    if req.profile == "driving-car":
        speed_kmh = 40.0 # Average KL traffic
    else:
        speed_kmh = 5.0 # Walking speed
        
    duration_hrs = distance_km / speed_kmh
    duration_secs = duration_hrs * 3600
    distance_m = distance_km * 1000
    
    return {
        "status": "success",
        "is_mock": True,
        "data": {
            "features": [{
                "properties": {
                    "summary": {
                        "distance": distance_m,
                        "duration": duration_secs
                    }
                },
                "geometry": {
                    "coordinates": [
                        req.origin,
                        req.destination
                    ]
                }
            }]
        }
    }
