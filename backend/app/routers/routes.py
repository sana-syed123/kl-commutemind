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
