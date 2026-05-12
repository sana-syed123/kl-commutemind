import { History, Clock, Map } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function JourneyHistory() {
  const { journeyHistory } = useAppStore();

  if (!journeyHistory || journeyHistory.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
        <h3 className="font-bold flex items-center text-gray-200 mb-4">
          <History className="w-5 h-5 mr-2 text-purple-400" /> 
          Journey History
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">No recent trips recorded.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
      <h3 className="font-bold flex items-center text-gray-200 mb-4">
        <History className="w-5 h-5 mr-2 text-purple-400" /> 
        Journey History
      </h3>
      
      <div className="space-y-3">
        {journeyHistory.map((trip, idx) => (
          <div key={idx} className="flex flex-col bg-black/20 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">{new Date(trip.date).toLocaleDateString()} at {new Date(trip.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              <span className="text-xs font-bold text-gray-300 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {trip.duration} min
              </span>
            </div>
            <div className="flex items-center text-sm font-semibold text-white">
              <Map className="w-4 h-4 mr-2 text-indigo-400 opacity-70" />
              {trip.origin} <span className="text-gray-500 mx-2">→</span> {trip.destination}
            </div>
            {trip.delayTags && trip.delayTags.length > 0 && (
              <div className="mt-2 flex gap-1">
                {trip.delayTags.map(tag => (
                  <span key={tag} className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded uppercase font-bold">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
