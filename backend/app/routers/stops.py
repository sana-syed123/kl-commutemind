from fastapi import APIRouter, HTTPException, Depends
from app.routers.routes import get_routing_engine
from app.services.routing_engine import RoutingEngine

router = APIRouter()

@router.get("")
def get_stops(engine: RoutingEngine = Depends(get_routing_engine)):
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
