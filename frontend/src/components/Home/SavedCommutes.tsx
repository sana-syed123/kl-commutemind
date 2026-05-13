import { useState, useEffect } from 'react';
import { Bookmark, ArrowRight, Play } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../hooks/useToast';

export default function SavedCommutes() {
  const { savedCommute, setIsRouting, setNlQuery } = useAppStore();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(7 * 60); // 7 mins in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!savedCommute) return null;

  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-xl mb-6">
      <h3 className="font-bold flex items-center text-gray-200 mb-4">
        <Bookmark className="w-5 h-5 mr-2 text-blue-400" /> 
        Saved Commute
      </h3>

      <div className="bg-black/30 border border-white/5 rounded-xl p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-white">{savedCommute.origin}</span>
            <ArrowRight className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-white">{savedCommute.destination}</span>
          </div>
          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-md font-bold uppercase">
            YELLOW STATUS
          </span>
        </div>

        <div className="flex justify-between items-end mt-4">
          <div className="text-sm text-gray-400">
            Next departure in: <span className="text-white font-mono font-bold">{Math.floor(countdown / 60)}m {countdown % 60}s</span>
          </div>
          
          <button 
            onClick={() => {
              setNlQuery(`route from ${savedCommute.origin} to ${savedCommute.destination}`);
              setIsRouting(true);
              toast('Journey Started! Tracking enabled.', 'success');
            }}
            className="flex items-center text-xs font-bold bg-white text-black px-3 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <Play className="w-3 h-3 mr-1" /> Start Journey
          </button>
        </div>
      </div>
    </div>
  );
}
