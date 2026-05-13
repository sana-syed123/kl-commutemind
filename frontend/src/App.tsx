import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import HomeScreen from './components/Home/HomeScreen';
import WelcomeScreen from './components/Onboarding/WelcomeScreen';
import ToastContainer from './components/UI/ToastContainer';
import { useAppStore } from './store/useAppStore';

function App() {
  const { hasSeenWelcomeV2, fetchStations, stationsData } = useAppStore();

  useEffect(() => {
    if (!stationsData) {
      fetchStations();
    }
    
    // Register Service Worker for Push Notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('SW registered:', registration);
      }).catch((err) => {
        console.log('SW registration failed:', err);
      });
    }

    // Request Notification Permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      <AnimatePresence>
        {!hasSeenWelcomeV2 && <WelcomeScreen key="welcome" />}
      </AnimatePresence>
      <HomeScreen />
      <ToastContainer />
    </>
  );
}

export default App;
