import asyncio
import logging
from typing import Optional
from app.services.routing_engine import RoutingEngine
from app.services.anomaly_detector import AnomalyDetector
from app.routers.routes import get_routing_engine

logger = logging.getLogger(__name__)

async def start_gtfs_poller():
    """
    Background worker that polls GTFS-RT every 30s.
    Detects anomalies and updates routing edge weights dynamically.
    """
    logger.info("Starting GTFS-RT poller worker...")
    
    # Initialize detector with some mock baseline speeds
    detector = AnomalyDetector(historical_speeds={'KJ': 45.0, 'KG': 60.0})
    
    while True:
        try:
            logger.info("Tick (30s) - Fetching GTFS-RT data...")
            # Here we would fetch real GTFS-RT PB files from api.data.gov.my.
            # For demonstration, we mock real-time positions that show a delay.
            
            mock_vehicles = [
                {'id': 'v1', 'lat': 3.14, 'lon': 101.68, 'route_id': 'KJ', 'speed_kmh': 10.0, 'timestamp': 0},
                {'id': 'v2', 'lat': 3.141, 'lon': 101.681, 'route_id': 'KJ', 'speed_kmh': 12.0, 'timestamp': 0},
                {'id': 'v3', 'lat': 3.142, 'lon': 101.682, 'route_id': 'KJ', 'speed_kmh': 11.0, 'timestamp': 0},
            ]
            
            # Detect Anomalies (Bunching, Speed, Service Gap)
            bunching = detector.detect_bunching(mock_vehicles, 'KJ')
            if bunching:
                logger.warning(f"Poller detected bunching: {bunching}")
                
            speed_anom = detector.detect_speed_anomaly(mock_vehicles[0])
            if speed_anom:
                logger.warning(f"Poller detected speed anomaly: {speed_anom}")
                
            gap = detector.detect_service_gap(mock_vehicles, 'KG', service_hours=True)
            if gap:
                logger.warning(f"Poller detected service gap: {gap}")

            # Update Routing Graph dynamically based on anomalies
            try:
                engine = get_routing_engine()
                # If there's a severe anomaly (like speed drops or bunching), add a 15 min penalty 
                # to the affected edges (mocking stop KJ10 to KJ14)
                if speed_anom or bunching:
                    engine.update_edge_weight('KJ10', 'KJ14', 'KJ', delay_mins=15.0)
            except Exception as e:
                logger.error(f"Routing engine not yet initialized or error updating edges: {e}")
                
        except Exception as e:
            logger.error(f"Error in GTFS poller: {e}")
            
        await asyncio.sleep(30)
