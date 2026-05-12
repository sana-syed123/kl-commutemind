import { create } from 'zustand';

interface Commute {
  origin: string;
  destination: string;
  avoid?: string[];
}

interface RouteVariant {
  variant: string;
  total_time_mins: number;
  transfers: number;
  walking_time_mins: number;
  path: string[];
}

interface AppState {
  savedCommute: Commute | null;
  setSavedCommute: (commute: Commute | null) => void;
  nlQuery: string;
  setNlQuery: (query: string) => void;
  routes: Record<string, RouteVariant> | null;
  setRoutes: (routes: Record<string, RouteVariant> | null) => void;
  selectedRouteKey: string | null;
  setSelectedRouteKey: (key: string | null) => void;
  isRouting: boolean;
  setIsRouting: (isRouting: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  savedCommute: { origin: 'KJ10', destination: 'KG18A' }, // Example default
  setSavedCommute: (commute) => set({ savedCommute: commute }),
  nlQuery: '',
  setNlQuery: (query) => set({ nlQuery: query }),
  routes: null,
  setRoutes: (routes) => set({ routes, selectedRouteKey: null }), // Reset selection on new routes
  selectedRouteKey: null,
  setSelectedRouteKey: (key) => set({ selectedRouteKey: key }),
  isRouting: false,
  setIsRouting: (isRouting) => set({ isRouting }),
}));
