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
  deployments: [
    {
      cluster_id: 186,
      zone_name: "Cluster 186 (12.9336, 77.6910)",
      centroid_lat: 12.933571,
      centroid_lng: 77.691018,
      num_officers: 3,
      deployedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      cluster_id: 117,
      zone_name: "Cluster 117 (13.0083, 77.6953)",
      centroid_lat: 13.008284,
      centroid_lng: 77.695258,
      num_officers: 2,
      deployedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      cluster_id: 87,
      zone_name: "Cluster 87 (12.9963, 77.6686)",
      centroid_lat: 12.996317,
      centroid_lng: 77.668643,
      num_officers: 4,
      deployedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    }
  ],
  schedules: [
    {
      cluster_id: 469,
      zone_name: "BTP057 - Anand Rao Junction",
      centroid_lat: 12.979596,
      centroid_lng: 77.574921,
      num_officers: 3,
      scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    {
      cluster_id: 436,
      zone_name: "BTP211 - Central Street Junction",
      centroid_lat: 12.984077,
      centroid_lng: 77.603522,
      num_officers: 2,
      scheduled_time: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
    },
    {
      cluster_id: 545,
      zone_name: "BTP058 - Subbanna Junction",
      centroid_lat: 12.979021,
      centroid_lng: 77.57859,
      num_officers: 1,
      scheduled_time: new Date(Date.now() + 300 * 60 * 1000).toISOString(),
    }
  ],
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
