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
    }),
    {
      name: 'commutemind-storage', // unique name
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hasSeenWelcomeV2: state.hasSeenWelcomeV2, journeyHistory: state.journeyHistory }),
    }
  )
);
