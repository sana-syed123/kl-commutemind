import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Search, Loader2 } from 'lucide-react';

const STATIONS = ['KLCC', 'Pasar Seni', 'Bukit Bintang', 'Kepong Baru', 'Mid Valley', 'Titiwangsa', 'Chow Kit'];

export default function RouteSearch() {
  const { nlQuery, setNlQuery, setRoutes, setIsRouting, isRouting } = useAppStore();
  const [error, setError] = useState('');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const handleNlSearch = async () => {
    if (!nlQuery.trim()) return;
    setIsRouting(true);
    setError('');
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBaseUrl}/api/nl/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery })
      });
      
      if (!res.ok) throw new Error('NLP API failed');
      
      const data = await res.json();
      const { origin, destination } = data.parsed_intent;
      
      // Assume a successful map to stops and then call routing API
      if (origin && destination) {
        // Here we'd map string to stop_id, using dummy stop_ids for demo
        fetchRoutes('KJ10', 'KG18A'); 
      } else {
        throw new Error('Could not extract origin/destination');
      }
    } catch (err) {
      console.warn("Claude API failed, falling back to manual entry", err);
      setError('NLP failed. Falling back to manual search.');
      setFallbackMode(true);
      setIsRouting(false);
    }
  };

  const fetchRoutes = async (orig: string, dest: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBaseUrl}/api/routes/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin_stop_id: orig, dest_stop_id: dest })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRoutes(data.routes);
      }
    } catch (err) {
      setError('Routing failed.');
    } finally {
      setIsRouting(false);
    }
  };

  const handleManualSearch = () => {
    if (origin && destination) {
      setIsRouting(true);
      fetchRoutes('KJ10', 'KG18A'); // Demo fallback mapping
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Plan Your Journey</h2>
      
      {error && <div className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{error}</div>}

      {!fallbackMode ? (
        <div className="relative">
          <input
            type="text"
            className="w-full p-3 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. nak pergi Midvalley dari Chow Kit elak LRT"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNlSearch()}
          />
          <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
          <button 
            onClick={handleNlSearch}
            disabled={isRouting}
            className="mt-3 w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors"
          >
            {isRouting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Search Commute'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Origin</label>
            <input 
              list="stations"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded" 
              placeholder="Select Origin"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Destination</label>
            <input 
              list="stations"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded" 
              placeholder="Select Destination"
            />
          </div>
          <datalist id="stations">
            {STATIONS.map(s => <option key={s} value={s} />)}
          </datalist>
          
          <button 
            onClick={handleManualSearch}
            disabled={isRouting}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors"
          >
            {isRouting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Find Routes'}
          </button>
          <button 
            onClick={() => { setFallbackMode(false); setError(''); }}
            className="w-full text-gray-500 text-sm mt-2 hover:underline"
          >
            Try Natural Language again
          </button>
        </div>
      )}
    </div>
  );
}
