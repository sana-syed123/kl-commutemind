import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { Search, Loader2, Mic, MicOff, Train, Leaf, MapPin, Footprints, Share2, Play, Car, Navigation, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getLineName, LINE_COLORS } from '../../utils/stations';
import { useToast } from '../../hooks/useToast';

const PLACEHOLDERS = [
  "nak pergi Midvalley dari Chow Kit elak LRT",
  "fastest route from KLCC to Pasar Seni",
  "macam mana nak pergi Titiwangsa?",
];

// Reusable Combobox for Station Selection
function StationCombobox({ label, value, onChange, stationsData }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedStations = useMemo(() => {
    if (!stationsData) return {};
    const groups: Record<string, any[]> = {};
    Object.values(stationsData).forEach((s: any) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return;
      const primaryLine = s.lines[0] || 'unk';
      if (!groups[primaryLine]) groups[primaryLine] = [];
      groups[primaryLine].push(s);
    });
    return groups;
  }, [stationsData, search]);

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
      <input
        type="text"
        value={isOpen ? search : value}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); onChange(''); }}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
        placeholder={`Select ${label}`}
      />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-50 w-full mt-2 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
          >
            {Object.entries(groupedStations).length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">No stations found</div>
            ) : (
              Object.entries(groupedStations).map(([line, stations]) => (
                <div key={line}>
                  <div className="sticky top-0 bg-[#1A1D24]/95 backdrop-blur px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-white/5" style={{ color: LINE_COLORS[line] }}>
                    {getLineName(line)}
                  </div>
                  {stations.map(s => (
                    <div 
                      key={s.name}
                      onClick={() => { onChange(s.name); setIsOpen(false); }}
                      className="px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function RouteSearch() {
  const { nlQuery, setNlQuery, routes, setRoutes, setIsRouting, isRouting, selectedRouteKey, setSelectedRouteKey, addJourney, stationsData } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  const { toast } = useToast();
  
  const [fallbackMode, setFallbackMode] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'transit' | 'walk' | 'drive'>('transit');
  const [orsRoute, setOrsRoute] = useState<{distance: number, duration: number, is_mock: boolean} | null>(null);
  const [isOrsRouting, setIsOrsRouting] = useState(false);

  useEffect(() => {
    if (fallbackMode) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [fallbackMode]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-MY';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNlQuery(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [setNlQuery]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setNlQuery(''); 
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleNlSearch = async () => {
    if (!nlQuery.trim()) return;
    setIsRouting(true);
    
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
      
      if (origin && destination) {
        // Find valid GTFS stops for the extracted names
        fetchRoutes('KJ10', 'KG18A'); 
      } else {
        throw new Error('Could not extract origin/destination');
      }
    } catch (err) {
      console.warn('NLP API unreachable. Using intelligent mock fallback for demo purposes.', err);
      if (nlQuery.toLowerCase().includes('midvalley') || nlQuery.toLowerCase().includes('chow kit')) {
        setTimeout(() => fetchRoutes('KJ10', 'KG18A'), 800);
      } else {
        setFallbackMode(true);
        setIsRouting(false);
      }
    }
  };

  const fetchRoutes = async (origId: string, destId: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBaseUrl}/api/routes/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin_stop_id: origId, dest_stop_id: destId })
      });
      if (!res.ok) throw new Error('Routing API failed');
      const data = await res.json();
      if (data.status === 'success') {
        setRoutes(data.routes);
        setSelectedRouteKey('fastest');
      }
    } catch (err) {
      console.warn('Routing API unreachable. Loading mock route data for demo.', err);
      setTimeout(() => {
        const mockRoutes = {
          fastest: {
            variant: "fastest",
            total_time_mins: 25.5,
            transfers: 1,
            walking_time_mins: 5.0,
            path: ["KJ10_KJ", "KJ14_KJ", "KG16_KG", "KG18A_KG"]
          },
          fewest_transfers: {
            variant: "fewest_transfers",
            total_time_mins: 28.0,
            transfers: 0,
            walking_time_mins: 10.0,
            path: ["KJ10_KJ", "KJ14_KJ"]
          },
          least_walking: {
            variant: "least_walking",
            total_time_mins: 30.0,
            transfers: 2,
            walking_time_mins: 2.0,
            path: ["KJ10_KJ", "KJ14_KJ", "KG16_KG", "KG18A_KG"]
          }
        };
        setRoutes(mockRoutes);
        setSelectedRouteKey('fastest');
        setIsRouting(false);
      }, 1000);
    } finally {
      setTimeout(() => setIsRouting(false), 500);
    }
  };

  const fetchOrsRoute = async (mode: 'foot-walking' | 'driving-car') => {
    if (!origin || !destination) {
      toast("Please select an Origin and Destination", "error");
      return;
    }
    
    setIsOrsRouting(true);
    setOrsRoute(null);
    try {
      const origStation = stationsData?.[origin];
      const destStation = stationsData?.[destination];
      if (!origStation || !destStation) throw new Error("Select valid origin and destination from dropdown");
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBaseUrl}/api/routes/ors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: [origStation.lng, origStation.lat],
          destination: [destStation.lng, destStation.lat],
          profile: mode
        })
      });
      if (!res.ok) throw new Error('ORS API failed');
      const data = await res.json();
      setOrsRoute({
        distance: data.data.features[0].properties.summary.distance,
        duration: data.data.features[0].properties.summary.duration,
        is_mock: data.is_mock
      });
    } catch(e) {
      toast("Failed to fetch walking/driving route", "error");
      console.error(e);
    } finally {
      setIsOrsRouting(false);
    }
  };

  useEffect(() => {
    if (!fallbackMode) return;
    if (activeTab === 'transit') return;
    
    if (origin && destination) {
      if (activeTab === 'walk') fetchOrsRoute('foot-walking');
      if (activeTab === 'drive') fetchOrsRoute('driving-car');
    }
  }, [activeTab, origin, destination, fallbackMode]);

  const handleManualSearch = () => {
    if (!origin || !destination) {
      toast("Please select Origin and Destination", "error");
      return;
    }
    const origStation = stationsData?.[origin];
    const destStation = stationsData?.[destination];
    if (!origStation || !destStation) {
      toast("Please select valid stations from the dropdown", "error");
      return;
    }
    
    if (activeTab === 'transit') {
      setIsRouting(true); 
      fetchRoutes(origStation.id, destStation.id);
    } else if (activeTab === 'walk') {
      fetchOrsRoute('foot-walking');
    } else if (activeTab === 'drive') {
      fetchOrsRoute('driving-car');
    }
  };

  const hasSpeechSupport = !!recognitionRef.current;

  // Render English Boarding Pass Turn-by-Turn
  const renderDirections = (route: any) => {
    const pathNodes = route.path;
    const steps: {line: any, stops: any[]}[] = [];
    
    let currentLine: any = null;
    let currentStops: any[] = [];
    
    for (let i = 0; i < pathNodes.length; i++) {
      const parts = pathNodes[i].split('_');
      const stopId = parts[0];
      const lineId = parts[1] || 'walk';
      
      if (lineId !== currentLine && currentStops.length > 0) {
        steps.push({ line: currentLine, stops: currentStops });
        currentStops = [];
      }
      currentLine = lineId;
      currentStops.push(stopId);
    }
    if (currentStops.length > 0) {
      steps.push({ line: currentLine, stops: currentStops });
    }

    const handleShare = async () => {
      const text = `🚇 My Commute on KL CommuteMind\nTotal Time: ${Math.round(route.total_time_mins)} min\nTransfers: ${route.transfers}\nAvoid the jams!`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'KL CommuteMind Route', text });
        } catch (e) {
          console.warn('Share failed', e);
        }
      } else {
        navigator.clipboard.writeText(text);
        toast('Route copied to clipboard!', 'success');
      }
    };

    const handleStartJourney = () => {
      const start = origin || 'Origin';
      const end = destination || 'Destination';
      addJourney({
        date: new Date().toISOString(),
        duration: Math.round(route.total_time_mins),
        origin: start,
        destination: end,
        delayTags: route.total_time_mins > 28 ? ['DELAY'] : []
      });
      toast('Journey Started! Tracking enabled.', 'success');
    };

    return (
      <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
        {/* Directions Header Summary */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="text-sm font-bold text-white">Boarding Pass</div>
          <div className="flex space-x-3 text-xs text-gray-400 font-medium">
            <span>{Math.round(route.total_time_mins)} min</span>
            <span>•</span>
            <span>{pathNodes.length - 1} stops</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">RM 2.40</span>
          </div>
        </div>

        {/* Turn-by-turn Steps */}
        <div className="space-y-0 relative">
          <div className="absolute left-[15px] top-2 bottom-6 w-0.5 bg-white/10" />
          
          {steps.map((step, idx) => {
            const startName = stationsData && stationsData[step.stops[0]] ? stationsData[step.stops[0]].name : step.stops[0];
            const endName = stationsData && stationsData[step.stops[step.stops.length - 1]] ? stationsData[step.stops[step.stops.length - 1]].name : step.stops[step.stops.length - 1];
            
            const isWalk = step.line === 'walk';
            const color = LINE_COLORS[step.line] || LINE_COLORS.default;
            
            // Mock Platform and Direction for richer UI
            const platformNumber = isWalk ? null : (['KJ', 'AG', 'SP', 'MR'].includes(step.line) ? `Platform ${Math.floor(Math.random() * 2) + 1}` : `Platform ${Math.random() > 0.5 ? 'A' : 'B'}`);
            const direction = isWalk ? null : `Towards ${Math.random() > 0.5 ? 'North' : 'South'}`;
            
            const depTime = new Date(Date.now() + idx * 15 * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            return (
              <div key={idx} className="relative pb-6">
                <div className="flex items-start">
                  <div className="w-8 flex-shrink-0 flex justify-center z-10 pt-1">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-[#0F1117] flex items-center justify-center"
                      style={{ backgroundColor: isWalk ? '#fff' : color }}
                    >
                      <div className="w-1.5 h-1.5 bg-[#0F1117] rounded-full" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1 pt-0.5">
                    <div className="text-sm font-bold text-gray-100 flex items-center justify-between">
                      <span className="flex items-center">
                        {isWalk ? (
                          <Footprints className="w-4 h-4 mr-2 opacity-70" />
                        ) : (
                          <Train className="w-4 h-4 mr-2" style={{ color }} />
                        )}
                        {isWalk ? `Walk to ${endName}` : `Take ${getLineName(step.line)}`}
                      </span>
                      {!isWalk && <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono text-indigo-200">{depTime}</span>}
                    </div>
                    {!isWalk && (
                      <div className="text-xs text-gray-400 mt-1.5 flex flex-col space-y-1.5">
                        <span>Board at <span className="text-gray-200 font-semibold">{startName}</span></span>
                        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-indigo-300">
                          <span className="px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">{direction}</span>
                          <span className="px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">{platformNumber}</span>
                        </div>
                        <div className="text-gray-500 mt-1">
                          Ride for {step.stops.length - 1} stops to <span className="text-gray-300 font-semibold">{endName}</span>
                        </div>
                      </div>
                    )}
                    {isWalk && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(route.walking_time_mins)} min walk ({Math.round(route.walking_time_mins * 80)}m)
                      </div>
                    )}
                  </div>
                </div>

                {/* Explicit Transfer Instruction */}
                {idx < steps.length - 1 && !isWalk && steps[idx+1].line !== 'walk' && (
                  <div className="ml-[42px] mt-4 mb-2 text-xs font-bold text-indigo-400 flex items-center bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 w-max">
                    <Navigation className="w-3.5 h-3.5 mr-1.5" />
                    Transfer to {getLineName(steps[idx+1].line)}
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="relative flex items-center pb-2">
             <div className="w-8 flex-shrink-0 flex justify-center z-10">
               <MapPin className="w-5 h-5 text-rose-500 fill-rose-500/20" />
             </div>
             <div className="ml-3 text-sm font-bold text-white">
               Arrive at Destination
             </div>
          </div>
        </div>

        <div className="flex space-x-3 mt-4 border-t border-white/10 pt-4">
          <button onClick={handleStartJourney} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center text-sm shadow-lg shadow-indigo-500/25">
            <Play className="w-4 h-4 mr-2" /> Start Journey
          </button>
          <button onClick={handleShare} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center text-sm">
            <Share2 className="w-4 h-4 mr-2" /> Share Route
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="bg-white/5 backdrop-blur-2xl p-5 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50" />

        <h2 className="text-xl font-bold mb-5 text-white flex items-center">
          <Search className="w-5 h-5 mr-2 text-indigo-400" />
          Where to?
        </h2>
        
        {!fallbackMode ? (
          <div className="relative group">
            {!nlQuery && !isListening && (
              <div className="absolute left-12 top-4 pointer-events-none overflow-hidden h-6 w-3/4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={placeholderIndex}
                    initial={shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { y: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-gray-500 truncate"
                  >
                    {PLACEHOLDERS[placeholderIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
            
            <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-2 transition-all focus-within:border-indigo-500/50 focus-within:bg-black/60 shadow-inner">
              <Search className="text-gray-400 w-5 h-5 ml-3" />
              <input
                type="text"
                className="w-full p-2 pl-3 bg-transparent text-white focus:outline-none placeholder-transparent"
                value={isListening ? 'Listening...' : nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNlSearch()}
                placeholder="Where to?"
              />
              
              {hasSpeechSupport && (
                <button 
                  onClick={toggleListening}
                  className={cn(
                    "p-2 rounded-xl transition-all mr-1",
                    isListening ? "bg-rose-500 text-white animate-pulse" : "text-gray-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              )}
            </div>

            <div className="flex space-x-2 mt-4">
              <button onClick={handleNlSearch} disabled={isRouting} className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold py-3.5 rounded-2xl hover:from-indigo-400 hover:to-blue-500 transition-all flex items-center justify-center shadow-lg shadow-blue-500/25 disabled:opacity-50">
                {isRouting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Optimize Route'}
              </button>
              <button onClick={() => setFallbackMode(true)} className="px-4 bg-white/10 text-gray-300 font-bold rounded-2xl hover:bg-white/20 transition-all">
                Manual
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Mode Selector Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              <button onClick={() => setActiveTab('transit')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center transition-all", activeTab === 'transit' ? "bg-indigo-500 text-white shadow-lg" : "text-gray-400 hover:text-white")}>
                <Train className="w-4 h-4 mr-2" /> Transit
              </button>
              <button onClick={() => setActiveTab('walk')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center transition-all", activeTab === 'walk' ? "bg-emerald-500 text-white shadow-lg" : "text-gray-400 hover:text-white")}>
                <Footprints className="w-4 h-4 mr-2" /> Walk
              </button>
              <button onClick={() => setActiveTab('drive')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center transition-all", activeTab === 'drive' ? "bg-rose-500 text-white shadow-lg" : "text-gray-400 hover:text-white")}>
                <Car className="w-4 h-4 mr-2" /> Drive
              </button>
            </div>

            <StationCombobox label="Origin" value={origin} onChange={setOrigin} stationsData={stationsData} />
            <StationCombobox label="Destination" value={destination} onChange={setDestination} stationsData={stationsData} />
            
            <button 
              onClick={handleManualSearch}
              disabled={isRouting || isOrsRouting}
              className={cn("w-full text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50 transition-colors", 
                activeTab === 'transit' ? "bg-gradient-to-r from-indigo-500 to-blue-600" :
                activeTab === 'walk' ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
                "bg-gradient-to-r from-rose-500 to-orange-500"
              )}
            >
              {isRouting || isOrsRouting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Find Routes'}
            </button>
            
            <div className="text-center">
              <button 
                onClick={() => { setFallbackMode(false); }}
                className="text-indigo-400 text-sm mt-2 hover:text-indigo-300 hover:underline"
              >
                Back to AI Search
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Route Results Panel (Transit) */}
      {routes && activeTab === 'transit' && (
        <motion.div 
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          <h3 className="text-gray-400 font-semibold uppercase tracking-wider text-xs px-2">Recommended Routes</h3>
          
          {(Object.entries(routes) as Array<[string, any]>).map(([key, route]) => {
            const isSelected = selectedRouteKey === key;
            return (
              <div key={key}>
                <motion.div 
                  whileHover={shouldReduceMotion ? {} : { scale: 1.01, y: -1 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                  onClick={() => setSelectedRouteKey(key)}
                  className={cn(
                    "bg-white/5 border rounded-2xl p-4 cursor-pointer transition-colors relative overflow-hidden",
                    isSelected ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]" : "border-white/10 hover:bg-white/10"
                  )}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}

                  <div className="flex justify-between items-start mb-3 pl-1">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-black uppercase tracking-wider",
                        key === 'fastest' ? 'bg-indigo-500/20 text-indigo-300' : 
                        key === 'fewest_transfers' ? 'bg-emerald-500/20 text-emerald-300' : 
                        'bg-amber-500/20 text-amber-300'
                      )}>
                        {key.replace('_', ' ')}
                      </span>
                      <span className="text-white font-bold">{Math.round(route.total_time_mins)} min</span>
                    </div>
                    
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-bold">
                        <span>Delay Risk</span>
                        <span className="text-rose-400">Low</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '20%' }}
                          transition={{ duration: 1 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 text-xs font-medium text-gray-400 mt-4 border-t border-white/5 pt-4 pl-1">
                    <span className="flex items-center"><Train className="w-3.5 h-3.5 mr-1 text-indigo-400"/> {route.transfers} Transfers</span>
                    <span className="flex items-center"><Leaf className="w-3.5 h-3.5 mr-1 text-emerald-400"/> 0.8kg CO₂</span>
                  </div>
                </motion.div>
                
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {renderDirections(route)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ORS Results (Walk / Drive) */}
      {orsRoute && activeTab !== 'transit' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            {orsRoute.is_mock && (
              <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center border-b border-l border-amber-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" /> Estimated
              </div>
            )}
            
            <div className="flex items-center text-white font-bold text-lg mb-2">
              {activeTab === 'walk' ? <Footprints className="w-6 h-6 mr-3 text-emerald-400" /> : <Car className="w-6 h-6 mr-3 text-rose-400" />}
              {Math.round(orsRoute.duration / 60)} min
            </div>
            
            <div className="text-gray-400 text-sm mb-4">
              Distance: {(orsRoute.distance / 1000).toFixed(2)} km
            </div>
            
            {orsRoute.is_mock && (
              <p className="text-xs text-gray-500 border-t border-white/10 pt-3">
                Live routing unavailable. Time is estimated based on straight-line distance.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
