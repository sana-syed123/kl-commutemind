import { useAppStore } from '../../store/useAppStore';
import RouteSearch from '../Planner/RouteSearch';
import TransitMap from '../Map/TransitMap';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';

export default function HomeScreen() {
  const { savedCommute } = useAppStore();

  // Mocking status logic based on saved commute
  // In reality, this polls the backend for anomalies on the saved route.
  let commuteStatus: string = 'YELLOW'; // RED, YELLOW, GREEN
  const message = 'LRT KJ Line is experiencing a 15 min delay due to bunching. Leave 15 mins early.';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">KL CommuteMind</h1>
        <p className="text-gray-500">Intelligent Transit Optimizer for Greater KL</p>
      </header>

      {/* HERO FEATURE: Should I Leave Now? Card */}
      {savedCommute && (
        <section className={`p-6 rounded-2xl shadow-xl transform transition-all duration-300 hover:scale-[1.01] ${
          commuteStatus === 'GREEN' ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' :
          commuteStatus === 'YELLOW' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
          'bg-gradient-to-br from-red-500 to-red-700 text-white'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm uppercase tracking-wider font-semibold opacity-90 mb-1">Should I Leave Now?</h2>
              <div className="text-4xl font-black mb-2 tracking-tighter">
                {commuteStatus === 'GREEN' ? 'YES, ON TIME' : 
                 commuteStatus === 'YELLOW' ? 'LEAVE EARLY' : 
                 'WAIT / RE-ROUTE'}
              </div>
              <p className="text-lg font-medium opacity-95 max-w-2xl">
                {message}
              </p>
            </div>
            {commuteStatus !== 'GREEN' && (
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
          <div className="mt-6 flex items-center space-x-2 text-sm bg-black/10 inline-block px-3 py-1.5 rounded-lg">
            <span className="font-bold">{savedCommute.origin}</span>
            <ArrowRight className="w-4 h-4" />
            <span className="font-bold">{savedCommute.destination}</span>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <RouteSearch />
          
          <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
            <h3 className="font-bold flex items-center text-gray-700 mb-3">
              <Clock className="w-5 h-5 mr-2 text-blue-500" /> Recent Disruptions
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600">KJ Line (Pasar Seni)</span>
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">15m Delay</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-600">MRT Kajang</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Normal</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <TransitMap />
        </div>
      </div>
    </div>
  );
}
