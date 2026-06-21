import { create } from 'zustand';
import { Cluster, HealthStatus, SimulateResponse } from '../types';

interface Deployment {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  num_officers: number;
  deployedAt: string;
}

interface Schedule {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  num_officers: number;
  scheduled_time: string; // ISO string
}

interface ParkingHotspot {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  parking_violation_count: number;
  avg_congestion_impact_pct: number;
  location_context: string;
  peak_hours: string;
  priority_score: number;
}

interface AppState {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  simResult: SimulateResponse | null;
  numOfficers: number;
  health: HealthStatus | null;
  loading: boolean;
  mapLayer: 'heatmap' | 'clusters';
  showClusters: boolean;
  deployments: Deployment[];
  schedules: Schedule[];
  // Parking state
  parkingHotspots: ParkingHotspot[];
  parkingPriorities: any[];
  parkingHeatmap: any;
  showParkingView: boolean;
  setClusters: (clusters: Cluster[]) => void;
  selectCluster: (cluster: Cluster | null) => void;
  setSimResult: (result: SimulateResponse | null) => void;
  setNumOfficers: (value: number) => void;
  setHealth: (health: HealthStatus | null) => void;
  setLoading: (value: boolean) => void;
  setMapLayer: (value: 'heatmap' | 'clusters') => void;
  setShowClusters: (value: boolean) => void;
  toggleShowClusters: () => void;
  addDeployment: (deployment: Deployment) => void;
  addSchedule: (schedule: Schedule) => void;
  setParkingHotspots: (hotspots: ParkingHotspot[]) => void;
  setParkingPriorities: (priorities: any[]) => void;
  setParkingHeatmap: (heatmap: any) => void;
  setShowParkingView: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  clusters: [],
  selectedCluster: null,
  simResult: null,
  numOfficers: 3,
  health: {
    status: 'healthy',
    dbscan_loaded: true,
    simulator_loaded: true,
    prophet_models_loaded: 11,
    clusters_loaded: true,
    violations_loaded: true,
    total_clusters: 588,
    total_violations: 100000,
  },
  loading: false,
  mapLayer: 'clusters',
  showClusters: true,
  deployments: [],
  schedules: [],
  parkingHotspots: [],
  parkingPriorities: [],
  parkingHeatmap: {},
  showParkingView: false,
  setClusters: (clusters) => set({ clusters }),
  selectCluster: (cluster) => set({ selectedCluster: cluster }),
  setSimResult: (result) => set({ simResult: result }),
  setNumOfficers: (value) => set({ numOfficers: value }),
  setHealth: (health) => set({ health }),
  setLoading: (value) => set({ loading: value }),
  setMapLayer: (value) => set({ mapLayer: value }),
  setShowClusters: (value) => set({ showClusters: value }),
  toggleShowClusters: () => set((state) => ({ showClusters: !state.showClusters })),
  addDeployment: (deployment) => set((state) => {
    const existing = state.deployments.find((d) => d.cluster_id === deployment.cluster_id);
    if (existing) {
      return {
        deployments: state.deployments.map((d) =>
          d.cluster_id === deployment.cluster_id
            ? { ...d, num_officers: d.num_officers + deployment.num_officers, deployedAt: deployment.deployedAt }
            : d
        ),
      };
    }
    return { deployments: [deployment, ...state.deployments] };
  }),
  addSchedule: (schedule) => set((state) => {
    const existing = state.schedules.find((s) => s.cluster_id === schedule.cluster_id);
    if (existing) {
      return {
        schedules: state.schedules.map((s) =>
          s.cluster_id === schedule.cluster_id ? schedule : s
        ),
      };
    }
    return { schedules: [schedule, ...state.schedules] };
  }),
  setParkingHotspots: (hotspots) => set({ parkingHotspots: hotspots }),
  setParkingPriorities: (priorities) => set({ parkingPriorities: priorities }),
  setParkingHeatmap: (heatmap) => set({ parkingHeatmap: heatmap }),
  setShowParkingView: (value) => set({ showParkingView: value }),
}));
