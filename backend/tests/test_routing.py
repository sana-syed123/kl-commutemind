import pytest
import pandas as pd
from app.services.routing_engine import RoutingEngine

@pytest.fixture
def mock_gtfs_data():
    # Mock data modeling:
    # 1. LRT Kelana Jaya Line (KJ): ... -> KLCC (KJ10) -> ... -> Pasar Seni (KJ14) -> ... -> Abdullah Hukum (KJ17) -> ...
    # 2. MRT Kajang Line (KG): ... -> Bukit Bintang (KG18A) -> Pasar Seni (KG16) -> ...
    # 3. MRT Putrajaya Line (PY): ... -> Kepong Baru (PY10) -> ... -> Titiwangsa (PY17) -> ...
    # 4. KTM Komuter (KB): ... -> Mid Valley (KB01) -> Abdullah Hukum (KB00) -> ...
    # Note: Abdullah Hukum is an interchange between KJ and KTM.
    # Pasar Seni is an interchange between KJ and KG.
    
    stops = pd.DataFrame([
        {'stop_id': 'KJ10', 'stop_name': 'KLCC'},
        {'stop_id': 'KJ14', 'stop_name': 'Pasar Seni'},
        {'stop_id': 'KG16', 'stop_name': 'Pasar Seni'}, # Same name
        {'stop_id': 'KG18A', 'stop_name': 'Bukit Bintang'},
        {'stop_id': 'PY10', 'stop_name': 'Kepong Baru'},
        {'stop_id': 'PY17', 'stop_name': 'Titiwangsa'},
        {'stop_id': 'KJ17', 'stop_name': 'Abdullah Hukum'},
        {'stop_id': 'KB00', 'stop_name': 'Abdullah Hukum'}, # Same name
        {'stop_id': 'KB01', 'stop_name': 'Mid Valley'},
    ])
    
    routes = pd.DataFrame([
        {'route_id': 'KJ'},
        {'route_id': 'KG'},
        {'route_id': 'PY'},
        {'route_id': 'KB'}
    ])
    
    trips = pd.DataFrame([
        {'trip_id': 't_kj', 'route_id': 'KJ'},
        {'trip_id': 't_kg', 'route_id': 'KG'},
        {'trip_id': 't_py', 'route_id': 'PY'},
        {'trip_id': 't_kb', 'route_id': 'KB'}
    ])
    
    # 2 mins between stops approximately
    stop_times = pd.DataFrame([
        {'trip_id': 't_kj', 'stop_id': 'KJ10', 'stop_sequence': 1, 'arrival_time': '08:00:00', 'departure_time': '08:00:00'},
        {'trip_id': 't_kj', 'stop_id': 'KJ14', 'stop_sequence': 2, 'arrival_time': '08:08:00', 'departure_time': '08:08:00'},
        {'trip_id': 't_kj', 'stop_id': 'KJ17', 'stop_sequence': 3, 'arrival_time': '08:14:00', 'departure_time': '08:14:00'},
        
        {'trip_id': 't_kg', 'stop_id': 'KG16', 'stop_sequence': 1, 'arrival_time': '08:00:00', 'departure_time': '08:00:00'},
        {'trip_id': 't_kg', 'stop_id': 'KG18A', 'stop_sequence': 2, 'arrival_time': '08:04:00', 'departure_time': '08:04:00'},
        
        {'trip_id': 't_py', 'stop_id': 'PY10', 'stop_sequence': 1, 'arrival_time': '08:00:00', 'departure_time': '08:00:00'},
        {'trip_id': 't_py', 'stop_id': 'PY17', 'stop_sequence': 2, 'arrival_time': '08:15:00', 'departure_time': '08:15:00'},
        
        {'trip_id': 't_kb', 'stop_id': 'KB00', 'stop_sequence': 1, 'arrival_time': '08:00:00', 'departure_time': '08:00:00'},
        {'trip_id': 't_kb', 'stop_id': 'KB01', 'stop_sequence': 2, 'arrival_time': '08:05:00', 'departure_time': '08:05:00'},
    ])
    
    # Let's add a transfer linking PY to KJ/KG or KTM. 
    # For Kepong -> Mid Valley, Kepong (PY) -> Titiwangsa (PY/AG) -> wait we didn't add AG.
    # Let's just link PY10 to KJ10 directly for testing, or add a fake transfer:
    # Say Titiwangsa (PY17) connects to KLCC (KJ10) for the sake of graph connectivity in the test.
    transfers = pd.DataFrame([
        {'from_stop_id': 'PY17', 'to_stop_id': 'KJ10', 'min_transfer_time': 300} # 5 mins walk
    ])
    
    return {
        'stops': stops,
        'routes': routes,
        'trips': trips,
        'stop_times': stop_times,
        'transfers': transfers
    }

def test_klcc_to_bukit_bintang(mock_gtfs_data):
    engine = RoutingEngine(mock_gtfs_data)
    
    # Path: KJ10 (KLCC) -> KJ14 (Pasar Seni) -> transfer to KG16 (Pasar Seni) -> KG18A (Bukit Bintang)
    results = engine.plan_all_routes('KJ10', 'KG18A')
    
    assert 'fastest' in results
    fastest = results['fastest']
    assert 'KJ14_KJ' in fastest['path']
    assert 'KG16_KG' in fastest['path']
    
    # Transfers should be 1 (KJ line to KG line)
    assert fastest['transfers'] == 1

def test_kepong_to_mid_valley(mock_gtfs_data):
    engine = RoutingEngine(mock_gtfs_data)
    
    # Path: PY10 (Kepong) -> PY17 (Titiwangsa) -> walk to KJ10 (KLCC) -> KJ14 (Pasar Seni) -> KJ17 (Abdullah Hukum) -> walk to KB00 -> KB01 (Mid Valley)
    results = engine.plan_all_routes('PY10', 'KB01')
    
    assert 'fastest' in results
    fastest = results['fastest']
    # Total transfers: Board PY (0), walk to KJ (transfer +1), walk to KB (transfer +1) = 2
    assert fastest['transfers'] == 2

def test_routing_transfer_penalty(mock_gtfs_data):
    engine = RoutingEngine(mock_gtfs_data)
    # Ensure time penalty is applied on boarding
    # KJ10 to KJ14 is 8 mins travel + 3 mins boarding = 11 mins
    res = engine.find_route('KJ10', 'KJ14', 'fastest')
    assert res['total_time_mins'] == 11.0
