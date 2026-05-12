import { useEffect, useRef, useMemo } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../../store/useAppStore';
import { useReducedMotion } from 'framer-motion';
import { cn } from '../../utils/cn';

const MAP_STYLE = 'https://api.maptiler.com/maps/dataviz-dark/style.json?key=uDK7Vygt60kPbYEV68kD';

const LINE_COLORS: Record<string, string> = {
  'KJ': '#0033A0',
  'KG': '#00A859',
  'PY': '#800080',
  'AG': '#ED1C24',
  'SP': '#ED1C24',
  'MR': '#00AEEF',
  'KB': '#FF0000',
  'default': '#888888'
};

// Mock stations for glowing markers
const MOCK_STATIONS = [
  { id: 'KJ10', name: 'KLCC', lng: 101.7118, lat: 3.1581, status: 'RED' },
  { id: 'KJ14', name: 'Pasar Seni', lng: 101.6961, lat: 3.1426, status: 'YELLOW' },
  { id: 'KG18A', name: 'Bukit Bintang', lng: 101.7110, lat: 3.1465, status: 'GREEN' },
];

export default function TransitMap() {
  const { routes } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  const mapRef = useRef<any>(null);

  const geojson = useMemo(() => {
    if (!routes || !routes.fastest) return null;
    
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
              [101.7118, 3.1581],
              [101.6961, 3.1426],
              [101.7110, 3.1465],
            ]
          }
        }
      ]
    };
  }, [routes]);

  // Fly to route when selected
  useEffect(() => {
    if (geojson && mapRef.current) {
      const map = mapRef.current.getMap();
      if (!shouldReduceMotion) {
        map.flyTo({
          center: [101.6961, 3.1426], // Center on Pasar Seni for demo
          zoom: 13,
          duration: 2000,
          essential: true
        });
      } else {
        map.jumpTo({ center: [101.6961, 3.1426], zoom: 13 });
      }
    }
  }, [geojson, shouldReduceMotion]);

  return (
    <div className="w-full h-[400px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 group">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 101.6932,
          latitude: 3.1390,
          zoom: 12
        }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['route-layer-base']}
      >
        {geojson && (
          <Source id="route-source" type="geojson" data={geojson as any}>
            {/* Background glowing line */}
            <Layer 
              id="route-layer-glow" 
              type="line" 
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 10,
                'line-opacity': 0.2,
                'line-blur': 10
              }} 
            />
            {/* Base solid line */}
            <Layer 
              id="route-layer-base" 
              type="line" 
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 4,
                'line-opacity': 0.6
              }} 
            />
            {/* Animated dashed overlay for movement */}
            <Layer 
              id="route-layer-animated" 
              type="line" 
              paint={{
                'line-color': '#ffffff',
                'line-width': 4,
                'line-dasharray': [2, 4],
                // MapLibre GL JS doesn't natively support dynamic line-dasharray offset via react props perfectly 
                // without setPaintProperty, but we can update the color/opacity dynamically to simulate it 
                // or rely on a fixed array if it glitches. We'll set a basic dash here.
              }} 
            />
          </Source>
        )}

        {MOCK_STATIONS.map((station) => {
          const colorClass = 
            station.status === 'RED' ? 'bg-rose-500 shadow-rose-500' :
            station.status === 'YELLOW' ? 'bg-amber-500 shadow-amber-500' :
            'bg-emerald-500 shadow-emerald-500';
            
          return (
            <Marker 
              key={station.id} 
              longitude={station.lng} 
              latitude={station.lat} 
              anchor="center"
            >
              <div className="relative group cursor-pointer">
                {!shouldReduceMotion && (
                  <div className={cn("absolute inset-0 rounded-full animate-ping opacity-75", colorClass)} />
                )}
                <div className={cn("relative w-4 h-4 rounded-full border-2 border-white/80 shadow-[0_0_10px_currentColor]", colorClass)} />
                
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 text-xs font-bold text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {station.name}
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Glass overlay controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-xs text-white/70 font-medium">
          Live Traffic Active
        </div>
      </div>
    </div>
  );
}
