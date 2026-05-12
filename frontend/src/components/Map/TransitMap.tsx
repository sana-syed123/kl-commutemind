import Map, { Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../../store/useAppStore';
import { useMemo } from 'react';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Line colors based on RapidKL official colors
const LINE_COLORS: Record<string, string> = {
  'KJ': '#0033A0', // Kelana Jaya (Blue)
  'KG': '#00A859', // Kajang (Green)
  'PY': '#F7931D', // Putrajaya (Yellow/Orange actually, but user said Purple, let's use Purple)
  'AG': '#ED1C24', // Ampang (Red/Orange)
  'SP': '#ED1C24', // Sri Petaling
  'MR': '#00AEEF', // Monorail (Light Blue)
  'KB': '#FF0000', // KTM (Red, user requested red)
  'default': '#888888'
};

// Map putrajaya to purple as requested
LINE_COLORS['PY'] = '#800080';

export default function TransitMap() {
  const { routes } = useAppStore();

  const geojson = useMemo(() => {
    if (!routes || !routes.fastest) return null;
    
    // Convert path nodes like 'KJ10_KJ', 'KJ14_KJ' into mock coordinate lines for demonstration
    // In a real app, you'd fetch the exact route geometry from the backend based on path nodes
    // For demo map visualization, we will draw a mock colored line
    
    // We will extract the line IDs from the path (e.g. 'KJ')
    const pathNodes = routes.fastest.path;
    const linesUsed = pathNodes.map(n => n.split('_')[1]).filter(Boolean);
    const dominantLine = linesUsed[0] || 'default';
    
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            color: LINE_COLORS[dominantLine] || LINE_COLORS.default,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [101.7118, 3.1581], // KLCC
              [101.6961, 3.1426], // Pasar Seni
              [101.7110, 3.1465], // Bukit Bintang
            ]
          }
        }
      ]
    };
  }, [routes]);

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-md relative border border-gray-200">
      <Map
        initialViewState={{
          longitude: 101.6932,
          latitude: 3.1390,
          zoom: 12
        }}
        mapStyle={MAP_STYLE}
      >
        {geojson && (
          <Source id="route-source" type="geojson" data={geojson as any}>
            <Layer 
              id="route-layer" 
              type="line" 
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 5,
                'line-opacity': 0.8
              }} 
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
