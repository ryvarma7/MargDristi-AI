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

export interface DeployRequest {
  cluster_id: number;
  num_officers: number;
}

export interface DeployResponse {
  success: boolean;
  message: string;
  assigned?: Record<string, any> | null;
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

// ─── New Types for Command Center Upgrade ────────────────────────────────────

export interface ActionRecommendation {
  cluster_id: number;
  risk_tier: Cluster['tier'];
  officers_required: number;
  window_start: string;
  window_end: string;
  violations_prevented: number;
  congestion_reduction_pct: number;
  confidence_pct: number;
}

export interface XAIFactor {
  label: string;
  contribution_pct: number;
  tooltip: string;
  color: string;
}

export interface HourlyForecast {
  hour: number;
  historical: number;
  predicted: number | null;
  is_forecast: boolean;
  confidence_pct: number;
}

export interface AIDiscoveredHotspot {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  cluster_size: number;
  density_score: number;
  mis_score: number;
  risk_rank: number;
  persistence_days: number;
  is_official_junction: boolean;
  tier: Cluster['tier'];
  violation_count: number;
}

export interface OfficerOpsAlert {
  type: 'no_officer' | 'peak_approaching' | 'deployment_overdue' | 'high_risk_uncovered';
  cluster_id: number;
  zone_name: string;
  tier: Cluster['tier'];
  peak_hour: number;
  message: string;
  urgency: 'critical' | 'warning' | 'info';
}
