import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Clock, ArrowRight, Map as MapIcon, Search, Bookmark, Bell } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import RouteSearch from '../Planner/RouteSearch';
import TransitMap from '../Map/TransitMap';
import WeatherStrip from './WeatherStrip';
import SavedCommutes from './SavedCommutes';
import JourneyHistory from './JourneyHistory';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

// Mock delay trend data for Recharts
const delayTrendData = [
  { time: '10:00', delay: 2 },
  { time: '10:05', delay: 4 },
  { time: '10:10', delay: 8 },
  { time: '10:15', delay: 12 },
  { time: '10:20', delay: 15 },
  { time: '10:25', delay: 14 },
  { time: '10:30', delay: 15 },
];

export default function HomeScreen() {
  const { savedCommute } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  
  // State: 'GREEN' | 'YELLOW' | 'RED'
  const commuteStatus: string = 'YELLOW'; 
  const message = 'LRT KJ Line is experiencing a 15 min delay due to bunching.';
  
  // Countdown Timer
  const [countdown, setCountdown] = useState(15 * 60); // 15 mins in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Determine styles dynamically based on status
  const statusStylesMap: Record<string, any> = {
    GREEN: {
      bg: 'from-emerald-500/20 to-green-600/10',
      border: 'border-emerald-500/50',
      glow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
      text: 'text-emerald-400',
      label: 'YES, ON TIME'
    },
    YELLOW: {
      bg: 'from-amber-500/20 to-yellow-600/10',
      border: 'border-amber-500/50',
      glow: 'shadow-[0_0_40px_rgba(245,158,11,0.3)]',
      text: 'text-amber-400',
      label: 'LEAVE EARLY'
    },
    RED: {
      bg: 'from-rose-500/20 to-red-600/10',
      border: 'border-rose-500/50',
      glow: 'shadow-[0_0_40px_rgba(225,29,72,0.4)]',
      text: 'text-rose-400',
      label: 'WAIT / RE-ROUTE'
    }
  };
  const statusStyles = statusStylesMap[commuteStatus] || statusStylesMap.GREEN;

  const glowAnimation = shouldReduceMotion ? {} : {
    boxShadow: [
      `0 0 20px ${commuteStatus === 'RED' ? 'rgba(225,29,72,0.2)' : 'rgba(245,158,11,0.2)'}`,
      `0 0 50px ${commuteStatus === 'RED' ? 'rgba(225,29,72,0.5)' : 'rgba(245,158,11,0.5)'}`,
      `0 0 20px ${commuteStatus === 'RED' ? 'rgba(225,29,72,0.2)' : 'rgba(245,158,11,0.2)'}`
    ]
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-gray-100 font-sans pb-24 md:pb-8 selection:bg-blue-500/30">
      
      {/* Top Header / Weather Strip */}
      <WeatherStrip />

      <header className="pt-6 pb-6 px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            CommuteMind
          </h1>
          <p className="text-gray-400 text-sm mt-1">Intelligence for Greater KL Transit</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md cursor-pointer hover:bg-white/20 transition-colors">
          <Bell className="w-5 h-5 text-gray-300" />
        </div>
      </header>

      <main className="px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        
        {/* HERO FEATURE: Should I Leave Now? Card */}
        {savedCommute && (
          <motion.section 
            layout
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, ...glowAnimation }}
            transition={{ ease: 'easeOut', repeat: Infinity, repeatType: "reverse", duration: 2 }}
            className={cn(
              "relative overflow-hidden p-6 md:p-8 rounded-3xl border backdrop-blur-2xl bg-gradient-to-br",
              statusStyles.bg, statusStyles.border
            )}
          >
            {/* Glass reflection overlay */}
            <div className="absolute inset-0 bg-white/5 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-sm uppercase tracking-widest font-bold opacity-80 mb-2 text-white/70">
                  Should I Leave Now?
                </h2>
                <div className={cn("text-5xl md:text-6xl font-black mb-3 tracking-tighter", statusStyles.text)}>
                  {statusStyles.label}
                </div>
                
                {commuteStatus !== 'GREEN' && (
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center">
                      <Clock className="w-4 h-4 mr-2 opacity-70" />
                      Leave in {formatTime(countdown)}
                    </span>
                  </div>
                )}
                
                <p className="text-lg font-medium text-gray-300 max-w-2xl leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Trend Graph */}
              <div className="w-full md:w-64 h-32 bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col justify-end">
                <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Delay Trend (30m)</div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={delayTrendData}>
                      <Line 
                        type="monotone" 
                        dataKey="delay" 
                        stroke={commuteStatus === 'RED' ? '#f43f5e' : '#fbbf24'} 
                        strokeWidth={3} 
                        dot={false} 
                        isAnimationActive={!shouldReduceMotion}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 flex flex-wrap gap-2 text-sm">
              <div className="bg-black/30 border border-white/10 px-4 py-2 rounded-xl font-semibold flex items-center shadow-inner">
                {savedCommute.origin}
                <ArrowRight className="w-4 h-4 mx-3 opacity-50" />
                {savedCommute.destination}
              </div>
            </div>
          </motion.section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Search & Feed */}
          <div className="lg:col-span-4 space-y-6">
            <RouteSearch />
            <SavedCommutes />
            <JourneyHistory />
            
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
              <h3 className="font-bold flex items-center text-gray-200 mb-4">
                <AlertTriangle className="w-5 h-5 mr-2 text-rose-400" /> 
                Live Disruptions Feed
              </h3>
              
              <div className="space-y-4">
                <motion.div 
                  initial={shouldReduceMotion ? false : { x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/5 border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-rose-300">KJ Line</span>
                    <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-1 rounded-md font-bold">15m Delay</span>
                  </div>
                  <p className="text-sm text-gray-400">Multiple train bunching detected between KLCC and Pasar Seni.</p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Map */}
          <div className="lg:col-span-8">
            <TransitMap />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F1117]/90 backdrop-blur-xl border-t border-white/10 pb-safe z-50">
        <div className="flex items-center justify-around p-3">
          <button className="flex flex-col items-center text-blue-400 p-2">
            <MapIcon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Map</span>
          </button>
          <button className="flex flex-col items-center text-gray-500 p-2 hover:text-gray-300">
            <Search className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button className="flex flex-col items-center text-gray-500 p-2 hover:text-gray-300">
            <Bookmark className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Saved</span>
          </button>
          <button className="flex flex-col items-center text-gray-500 p-2 hover:text-gray-300 relative">
            <Bell className="w-6 h-6 mb-1" />
            <span className="absolute top-2 right-3 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-medium">Alerts</span>
          </button>
        </div>
      </nav>
      
    </div>
  );
}
