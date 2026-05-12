import { useEffect } from 'react';
import HomeScreen from './components/Home/HomeScreen';

function App() {
  useEffect(() => {
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
    <HomeScreen />
  );
}

export default App;
