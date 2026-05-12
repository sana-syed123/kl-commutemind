import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudLightning, CloudFog, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WeatherStrip() {
  const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);
  const [time, setTime] = useState<string>('');

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather fetch
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=3.1390&longitude=101.6869&current=temperature_2m,weather_code&timezone=Asia%2FSingapore');
        const data = await res.json();
        setWeather({ temp: data.current.temperature_2m, code: data.current.weather_code });
      } catch (err) {
        console.error('Failed to fetch weather', err);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000); // 15 mins
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  // WMO Weather codes
  const isRainy = weather && [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.code);
  const isCloudy = weather && [1, 2, 3].includes(weather.code);
  const isFoggy = weather && [45, 48].includes(weather.code);
  
  let WeatherIcon = Sun;
  if (isRainy) WeatherIcon = weather.code >= 95 ? CloudLightning : CloudRain;
  else if (isCloudy) WeatherIcon = Cloud;
  else if (isFoggy) WeatherIcon = CloudFog;

  return (
    <div className="w-full bg-[#0F1117] border-b border-white/10 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center justify-between text-xs font-semibold tracking-wider">
        
        {/* Left: KL Time */}
        <div className="flex items-center text-gray-400">
          <span className="text-white mr-2">{time}</span> (MYT)
        </div>

        {/* Right: Weather */}
        <div className="flex items-center space-x-4">
          {weather && (
            <div className="flex items-center text-gray-300">
              <WeatherIcon className="w-4 h-4 mr-2 opacity-80" />
              {Math.round(weather.temp)}°C
            </div>
          )}
          
          {isRainy && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              RAIN ALERT: EXPECT DELAYS
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
