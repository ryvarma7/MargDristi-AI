import { create } from 'zustand';
import { Cluster, HealthStatus, SimulateResponse } from '../types';

interface AppState {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  simResult: SimulateResponse | null;
  numOfficers: number;
  health: HealthStatus | null;
  loading: boolean;
  mapLayer: 'heatmap' | 'clusters';
  setClusters: (clusters: Cluster[]) => void;
  selectCluster: (cluster: Cluster | null) => void;
  setSimResult: (result: SimulateResponse | null) => void;
  setNumOfficers: (value: number) => void;
  setHealth: (health: HealthStatus | null) => void;
  setLoading: (value: boolean) => void;
  setMapLayer: (value: 'heatmap' | 'clusters') => void;
}

export const useAppStore = create<AppState>((set) => ({
  clusters: [],
  selectedCluster: null,
  simResult: null,
  numOfficers: 3,
  health: null,
  loading: false,
  mapLayer: 'clusters',
  setClusters: (clusters) => set({ clusters }),
  selectCluster: (cluster) => set({ selectedCluster: cluster }),
  setSimResult: (result) => set({ simResult: result }),
  setNumOfficers: (value) => set({ numOfficers: value }),
  setHealth: (health) => set({ health }),
  setLoading: (value) => set({ loading: value }),
  setMapLayer: (value) => set({ mapLayer: value }),
}));
