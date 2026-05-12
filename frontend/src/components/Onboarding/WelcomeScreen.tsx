import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Activity, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

const FEATURES = [
  {
    icon: <Activity className="w-8 h-8 text-rose-400" />,
    title: 'Predict disruptions before they happen',
    desc: 'Powered by XGBoost on historical KL Mobilities data.'
  },
  {
    icon: <Brain className="w-8 h-8 text-indigo-400" />,
    title: 'Manglish AI Search',
    desc: '"Nak pergi Midvalley elak LRT" - we understand how you speak.'
  },
  {
    icon: <Sparkles className="w-8 h-8 text-emerald-400" />,
    title: 'Real-time Crowd Intelligence',
    desc: 'See exactly how packed the station is before you leave.'
  }
];

// Simplified geometric representation of KL Transit lines (KJ, KG, PY)
const KL_TRANSIT_SVG = (
  <svg viewBox="0 0 400 400" className="w-full h-full opacity-30" preserveAspectRatio="xMidYMid meet">
    <g filter="url(#glow)">
      {/* Kelana Jaya Line (Blue) */}
      <motion.path
        d="M 50 350 L 150 250 L 250 200 L 300 100 L 350 50"
        stroke="#0033A0"
        strokeWidth="4"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
      />
      {/* Kajang Line (Green) */}
      <motion.path
        d="M 50 50 L 180 180 L 250 200 L 350 300"
        stroke="#00A859"
        strokeWidth="4"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
      />
      {/* Putrajaya Line (Purple) */}
      <motion.path
        d="M 100 50 L 200 150 L 200 250 L 150 350"
        stroke="#800080"
        strokeWidth="4"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 1 }}
      />
      
      {/* Interchange Stations */}
      <circle cx="250" cy="200" r="8" fill="#fff" />
      <circle cx="150" cy="250" r="6" fill="#fff" />
      <circle cx="200" cy="150" r="6" fill="#fff" />
    </g>
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  </svg>
);

export default function WelcomeScreen() {
  const { setHasVisited } = useAppStore();
  const [slide, setSlide] = useState(0);

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(s => (s + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleStart = () => {
    // Trigger transition out
    setHasVisited(true);
  };

  return (
    <div className="fixed inset-0 bg-[#0F1117] z-[100] flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Animated Map */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-10 opacity-60">
        {KL_TRANSIT_SVG}
      </div>

      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center text-center">
        
        {/* Logo */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            KL CommuteMind
          </h1>
          <p className="text-gray-400 mt-3 font-medium text-lg">
            Your AI-powered commute intelligence for Greater KL.
          </p>
        </motion.div>

        {/* Feature Carousel */}
        <div className="h-48 w-full relative mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md"
            >
              <div className="mb-4 bg-white/10 p-4 rounded-2xl">
                {FEATURES[slide].icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{FEATURES[slide].title}</h3>
              <p className="text-gray-400 text-sm">{FEATURES[slide].desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Dots */}
        <div className="flex space-x-2 mb-12">
          {FEATURES.map((_, i) => (
            <div 
              key={i} 
              className={cn("h-1.5 rounded-full transition-all duration-300", i === slide ? "w-8 bg-indigo-500" : "w-2 bg-white/20")}
            />
          ))}
        </div>

        {/* CTA Button */}
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="relative group w-full max-w-xs bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/25 overflow-hidden flex items-center justify-center"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
          <span className="relative z-10 flex items-center text-lg tracking-wide">
            Start Commuting <ArrowRight className="ml-2 w-5 h-5" />
          </span>
        </motion.button>

      </div>
    </div>
  );
}
