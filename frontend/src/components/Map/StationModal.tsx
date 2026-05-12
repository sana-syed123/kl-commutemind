import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, AlertTriangle, Coffee, ShieldCheck, MapPin } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { STATION_DATA, LINE_COLORS, getLineName } from '../../utils/stations';

// Mock data generator for demo purposes
const getMockStationDetails = (stationId: string) => {
  const isCrowded = ['KJ10', 'KJ14'].includes(stationId); // KLCC, Pasar Seni
  const hasDisruption = ['KJ10'].includes(stationId);
  
  return {
    lines: [stationId.substring(0, 2)], // e.g. 'KJ'
    crowdScore: isCrowded ? 85 : 30, // 0-100
    status: isCrowded ? 'RED' : 'GREEN',
    disruption: hasDisruption ? 'Heavy bunching reported. +15m delays.' : null,
    amenities: ['Escalator', 'Lift', 'Convenience Store']
  };
};

export default function StationModal() {
  const { selectedStationId, setSelectedStationId } = useAppStore();

  if (!selectedStationId) return null;

  const station = STATION_DATA[selectedStationId];
  if (!station) return null;

  const details = getMockStationDetails(selectedStationId);
  const color = LINE_COLORS[details.lines[0]] || LINE_COLORS.default;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-end p-4 lg:p-8"
      >
        {/* Backdrop for click-away */}
        <div 
          className="absolute inset-0 pointer-events-auto" 
          onClick={() => setSelectedStationId(null)}
        />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative z-10 w-full max-w-sm ml-auto bg-[#0F1117]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl pointer-events-auto overflow-hidden"
        >
          {/* Close button */}
          <button 
            onClick={() => setSelectedStationId(null)}
            className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 border-white/20" style={{ backgroundColor: color }}>
              {selectedStationId}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{station.name}</h3>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{getLineName(details.lines[0])}</p>
            </div>
          </div>

          {/* Crowd Score Gauge */}
          <div className="mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-300 flex items-center">
                <Users className="w-4 h-4 mr-2 opacity-70" /> Live Crowd Score
              </span>
              <span className={`text-sm font-black ${details.status === 'RED' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {details.crowdScore}%
              </span>
            </div>
            {/* Animated Bar */}
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${details.crowdScore}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${details.status === 'RED' ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
              />
            </div>
          </div>

          {/* Disruptions */}
          {details.disruption ? (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-rose-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-400">Active Alert</h4>
                  <p className="text-xs text-rose-200 mt-1">{details.disruption}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
               <div className="flex items-center">
                 <ShieldCheck className="w-5 h-5 text-emerald-500 mr-3" />
                 <span className="text-sm font-bold text-emerald-400">Operating Normally</span>
               </div>
            </div>
          )}

          {/* Amenities */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {details.amenities.map(amenity => (
                <span key={amenity} className="text-xs font-medium text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center">
                  {amenity === 'Convenience Store' ? <Coffee className="w-3 h-3 mr-1.5 opacity-60" /> : <MapPin className="w-3 h-3 mr-1.5 opacity-60" />}
                  {amenity}
                </span>
              ))}
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
