import { useEffect, useRef, useMemo } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../../store/useAppStore';
import { useReducedMotion } from 'framer-motion';
import { STATION_DATA, LINE_COLORS } from '../../utils/stations';
import { MapPin } from 'lucide-react';
import StationModal from './StationModal';

const MAP_STYLE = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=uDK7Vygt60kPbYEV68kD';

export default function TransitMap() {
  const { routes, selectedRouteKey, setSelectedStationId } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  const mapRef = useRef<any>(null);

  // Generate multi-segment GeoJSON based on selected route
  const mapData = useMemo(() => {
    if (!routes || !selectedRouteKey) return null;
    const selectedRoute = routes[selectedRouteKey];
    if (!selectedRoute) return null;

    const pathNodes = selectedRoute.path;
    const features: any[] = [];
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

    // Build segments
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const startParts = pathNodes[i].split('_');
      const endParts = pathNodes[i+1].split('_');
      
      const startStopId = startParts[0];
      const endStopId = endParts[0];
      
      // The line used is the one on the *end* node (or start node) depending on path logic
      // In this demo, if line changes, it's a transfer. The current edge is walked or ridden.
      const lineId = endParts[1] || 'walk'; 
      
      const startStation = STATION_DATA[startStopId];
      const endStation = STATION_DATA[endStopId];
      
      if (startStation && endStation) {
        minLng = Math.min(minLng, startStation.lng, endStation.lng);
        maxLng = Math.max(maxLng, startStation.lng, endStation.lng);
        minLat = Math.min(minLat, startStation.lat, endStation.lat);
        maxLat = Math.max(maxLat, startStation.lat, endStation.lat);

        features.push({
          type: 'Feature',
          properties: {
            color: LINE_COLORS[lineId] || LINE_COLORS.default,
            isWalk: lineId === 'walk',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [startStation.lng, startStation.lat],
              [endStation.lng, endStation.lat],
            ]
          }
        });
      }
    }

    // Stations
    const stations = pathNodes.map(node => {
      const id = node.split('_')[0];
      return { id, ...STATION_DATA[id] };
    }).filter(s => s.lat !== undefined);

    const startStation = stations[0];
    const endStation = stations[stations.length - 1];

    return {
      segments: { type: 'FeatureCollection', features },
      stations,
      startStation,
      endStation,
      bounds: [minLng, minLat, maxLng, maxLat]
    };
  }, [routes, selectedRouteKey]);

  // Fly to route when selected
  useEffect(() => {
    if (mapData && mapData.bounds[0] !== 180 && mapRef.current) {
      const map = mapRef.current.getMap();
      const [w, s, e, n] = mapData.bounds;
      
      // Calculate fit bounds
      try {
        map.fitBounds([[w, s], [e, n]], {
          padding: 80,
          duration: shouldReduceMotion ? 0 : 1500,
          essential: true
        });
      } catch (e) {
        console.warn("fitBounds failed", e);
      }
    }
  }, [mapData, shouldReduceMotion]);

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
        {mapData && (
          <Source id="route-source" type="geojson" data={mapData.segments as any}>
            {/* Glow for transit lines */}
            <Layer 
              id="route-layer-glow" 
              type="line" 
              filter={['!=', 'isWalk', true]}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 10,
                'line-opacity': 0.2,
                'line-blur': 10
              }} 
            />
            {/* Solid transit line */}
            <Layer 
              id="route-layer-base" 
              type="line"
              filter={['!=', 'isWalk', true]}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 5,
                'line-opacity': 0.9
              }} 
            />
            {/* Dashed walking line */}
            <Layer 
              id="route-layer-walk" 
              type="line"
              filter={['==', 'isWalk', true]}
              paint={{
                'line-color': '#ffffff',
                'line-width': 4,
                'line-dasharray': [2, 2],
                'line-opacity': 0.7
              }} 
            />
          </Source>
        )}

        {/* Render Station Label Markers */}
        {mapData?.stations.map((station, i) => {
          if (i === 0 || i === mapData.stations.length - 1) return null;
          
          return (
            <Marker 
              key={`${station.id}-${i}`}
              longitude={station.lng} 
              latitude={station.lat} 
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedStationId(station.id);
              }}
            >
              <div className="flex items-center cursor-pointer hover:scale-110 transition-transform">
                <div className="w-3 h-3 bg-white rounded-full border-2 border-black z-10" />
                <div className="ml-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] font-bold text-white border border-white/10 whitespace-nowrap">
                  {station.name}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Start Pin (A) */}
        {mapData?.startStation && (
           <Marker longitude={mapData.startStation.lng} latitude={mapData.startStation.lat} anchor="bottom">
              <div className="relative flex flex-col items-center">
                <div className="bg-emerald-500 text-white text-xs font-black px-2 py-1 rounded shadow-lg shadow-emerald-500/50 z-20 relative border border-white/20">
                  {mapData.startStation.name}
                </div>
                <MapPin className="w-8 h-8 text-emerald-500 fill-emerald-500/20 -mt-2 z-10" />
              </div>
           </Marker>
        )}

        {/* End Pin (B) */}
        {mapData?.endStation && (
           <Marker longitude={mapData.endStation.lng} latitude={mapData.endStation.lat} anchor="bottom">
              <div className="relative flex flex-col items-center">
                <div className="bg-rose-500 text-white text-xs font-black px-2 py-1 rounded shadow-lg shadow-rose-500/50 z-20 relative border border-white/20">
                  {mapData.endStation.name}
                </div>
                <MapPin className="w-8 h-8 text-rose-500 fill-rose-500/20 -mt-2 z-10" />
              </div>
           </Marker>
        )}

      </Map>

      {/* Glass overlay controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-xs text-white/70 font-medium shadow-lg">
          Live Traffic Active
        </div>
      </div>

      <StationModal />
    </div>
  );
}

