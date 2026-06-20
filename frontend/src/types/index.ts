export interface Cluster {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  violation_count: number;
  total_cis: number;
  avg_cis: number;
  risk_score: number;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  peak_hour: number;
  top_vehicle: string;
  top_violation: string;
}

export interface SimulateRequest {
  cluster_id: number;
  num_officers: number;
  hour: number;
  day_of_week: number;
}

export interface SimulateResponse {
  prevention_rate: number;
  violations_prevented: number;
  congestion_reduction_pct: number;
  revenue_inr: number;
  commuter_minutes_saved: number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface HourlyPoint {
  hour: number;
  count: number;
}

export interface HeatmapOut {
  matrix: Record<string, Record<number, number>>;
}

export interface ViolationTypeBreakdown {
  violation_type: string;
  count: number;
}

export interface VehicleTypeBreakdown {
  vehicle_type: string;
  count: number;
  pct: number;
}

export interface HealthStatus {
  status: string;
  dbscan_loaded: boolean;
  simulator_loaded: boolean;
  prophet_models_loaded: number;
  clusters_loaded: boolean;
  violations_loaded: boolean;
  total_clusters: number;
  total_violations: number;
}
