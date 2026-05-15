// Dynamic station store — populated from /api/stops on app load
let _stationCache: Record<string, { name: string; lat: number; lng: number }> = {
  // Fallback hardcoded stations in case API is unavailable
  'KJ10': { name: 'KLCC', lat: 3.1581, lng: 101.7118 },
  'KJ14': { name: 'Pasar Seni (KJ)', lat: 3.1426, lng: 101.6961 },
  'KG16': { name: 'Pasar Seni (KG)', lat: 3.1426, lng: 101.6961 },
  'KG18A': { name: 'Bukit Bintang', lat: 3.1465, lng: 101.7110 },
  'PY10': { name: 'Kepong Baru', lat: 3.2140, lng: 101.6445 },
  'PY17': { name: 'Titiwangsa', lat: 3.1736, lng: 101.6954 },
  'PY27': { name: 'Ara Damansara', lat: 3.1138, lng: 101.5783 },
  'PY28': { name: 'Lembah Subang', lat: 3.1075, lng: 101.5724 },
  'KB01': { name: 'Mid Valley', lat: 3.1183, lng: 101.6778 },
  'KB00': { name: 'Abdullah Hukum', lat: 3.1187, lng: 101.6738 },
  'KJ17': { name: 'Abdullah Hukum', lat: 3.1187, lng: 101.6738 },
};

// Call this once on app startup to populate the full station list
export async function loadStationsFromAPI(baseUrl = 'http://127.0.0.1:8000') {
  try {
    const res = await fetch(`${baseUrl}/api/stops`);
    if (!res.ok) throw new Error('API error');
    const json = await res.json(); const stops: Array<{ id: string; name: string; lat: number; lng: number; lines: string }> = json.stations || json;
    stops.forEach(stop => {
      _stationCache[stop.id] = { name: stop.name, lat: stop.lat, lng: stop.lng };
    });
    console.log(`[Stations] Loaded ${stops.length} stations from API`);
  } catch (e) {
    console.warn('[Stations] Could not load from API, using fallback data', e);
  }
}

// Proxy object — always reads from the live cache
export const STATION_DATA: Record<string, { name: string; lat: number; lng: number }> = new Proxy(
  {} as Record<string, { name: string; lat: number; lng: number }>,
  {
    get(_target, prop: string) {
      return _stationCache[prop];
    },
    has(_target, prop: string) {
      return prop in _stationCache;
    },
  }
);

export const LINE_COLORS: Record<string, string> = {
  'KJ': '#0033A0',
  'KG': '#00A859',
  'PY': '#800080',
  'AG': '#ED1C24',
  'SP': '#ED1C24',
  'MR': '#00AEEF',
  'KB': '#FF0000',
  'BR': '#FF6600',
  'BRT': '#FF6600',
  'default': '#888888',
  'walk': '#ffffff',
};

export function getLineName(lineId: string) {
  const names: Record<string, string> = {
    'KJ': 'Kelana Jaya Line (LRT)',
    'KG': 'Kajang Line (MRT)',
    'PY': 'Putrajaya Line (MRT)',
    'AG': 'Ampang Line (LRT)',
    'SP': 'Sri Petaling Line (LRT)',
    'MR': 'Monorail Line',
    'KB': 'KTM Komuter',
    'BR': 'BRT Sunway',
    'BRT': 'BRT Sunway',
  };
  return names[lineId] || lineId;
}
