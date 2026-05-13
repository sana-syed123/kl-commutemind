import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RouteVariant {
  variant: string;
  total_time_mins: number;
  transfers: number;
  walking_time_mins: number;
  path: string[];
}

export interface TripRecord {
  date: string;
  duration: number;
  origin: string;
  destination: string;
  delayTags?: string[];
}

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

interface AppState {
  hasSeenWelcomeV2: boolean;
  setHasSeenWelcomeV2: (visited: boolean) => void;
  savedCommute: { origin: string; destination: string; } | null;
  setSavedCommute: (commute: { origin: string; destination: string; } | null) => void;
  nlQuery: string;
  setNlQuery: (query: string) => void;
  routes: Record<string, RouteVariant> | null;
  setRoutes: (routes: Record<string, RouteVariant> | null) => void;
  selectedRouteKey: string | null;
  setSelectedRouteKey: (key: string | null) => void;
  isRouting: boolean;
  setIsRouting: (isRouting: boolean) => void;
  journeyHistory: TripRecord[];
  addJourney: (trip: TripRecord) => void;
  selectedStationId: string | null;
  setSelectedStationId: (id: string | null) => void;
  stationsData: Record<string, StationData> | null;
  isStationsLoading: boolean;
  fetchStations: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasSeenWelcomeV2: false,
      setHasSeenWelcomeV2: (visited) => set({ hasSeenWelcomeV2: visited }),
      savedCommute: { origin: 'KLCC', destination: 'Mid Valley' },
      setSavedCommute: (commute) => set({ savedCommute: commute }),
      nlQuery: '',
      setNlQuery: (query) => set({ nlQuery: query }),
      routes: null,
      setRoutes: (routes) => set({ routes, selectedRouteKey: null }),
      selectedRouteKey: null,
      setSelectedRouteKey: (key) => set({ selectedRouteKey: key }),
      isRouting: false,
      setIsRouting: (isRouting) => set({ isRouting }),
      journeyHistory: [],
      addJourney: (trip) => set((state) => {
        const newHistory = [trip, ...state.journeyHistory].slice(0, 5); // Max 5
        return { journeyHistory: newHistory };
      }),
      selectedStationId: null,
      setSelectedStationId: (id) => set({ selectedStationId: id }),
      stationsData: null,
      isStationsLoading: false,
      fetchStations: async () => {
        set({ isStationsLoading: true });
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/stops`);
          if (!res.ok) throw new Error('Failed to fetch stations');
          const data = await res.json();
          
          const stationsMap: Record<string, StationData> = {};
          data.stations.forEach((s: any) => {
            stationsMap[s.name] = s; // Use name as key for better mapping in dropdowns later
          });
          
          set({ stationsData: stationsMap, isStationsLoading: false });
        } catch (error) {
          console.error("Error fetching GTFS stations:", error);
          set({ isStationsLoading: false });
        }
      },
    }),
    {
      name: 'commutemind-storage', // unique name
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hasSeenWelcomeV2: state.hasSeenWelcomeV2, journeyHistory: state.journeyHistory }),
    }
  )
);
