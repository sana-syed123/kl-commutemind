export const STATION_DATA: Record<string, { name: string, lat: number, lng: number }> = {
  'KJ10': { name: 'KLCC', lat: 3.1581, lng: 101.7118 },
  'KJ14': { name: 'Pasar Seni (KJ)', lat: 3.1426, lng: 101.6961 },
  'KG16': { name: 'Pasar Seni (KG)', lat: 3.1426, lng: 101.6961 },
  'KG18A': { name: 'Bukit Bintang', lat: 3.1465, lng: 101.7110 },
  'PY10': { name: 'Kepong Baru', lat: 3.2140, lng: 101.6445 },
  'PY17': { name: 'Titiwangsa', lat: 3.1736, lng: 101.6954 },
  'KB01': { name: 'Mid Valley', lat: 3.1183, lng: 101.6778 },
  'KB00': { name: 'Abdullah Hukum', lat: 3.1187, lng: 101.6738 },
  'KJ17': { name: 'Abdullah Hukum', lat: 3.1187, lng: 101.6738 },
};

export const LINE_COLORS: Record<string, string> = {
  'KJ': '#0033A0',
  'KG': '#00A859',
  'PY': '#800080',
  'AG': '#ED1C24',
  'SP': '#ED1C24',
  'MR': '#00AEEF',
  'KB': '#FF0000',
  'default': '#888888',
  'walk': '#ffffff' // Walk is dashed white
};

export function getLineName(lineId: string) {
  const names: Record<string, string> = {
    'KJ': 'Kelana Jaya Line',
    'KG': 'Kajang Line',
    'PY': 'Putrajaya Line',
    'AG': 'Ampang Line',
    'SP': 'Sri Petaling Line',
    'MR': 'Monorail Line',
    'KB': 'KTM Komuter',
  };
  return names[lineId] || lineId;
}
