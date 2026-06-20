from typing import Dict
from pydantic import BaseModel, field_validator


class ClusterOut(BaseModel):
    cluster_id: int
    zone_name: str
    centroid_lat: float
    centroid_lng: float
    violation_count: int
    total_cis: float
    avg_cis: float
    risk_score: float
    tier: str
    peak_hour: int
    top_vehicle: str
    top_violation: str


class SimulateRequest(BaseModel):
    cluster_id: int
    num_officers: int
    hour: int
    day_of_week: int


class SimulateResponse(BaseModel):
    prevention_rate: float
    violations_prevented: int
    congestion_reduction_pct: float
    revenue_inr: float
    commuter_minutes_saved: int


class DeployRequest(BaseModel):
    cluster_id: int
    num_officers: int


class DeployResponse(BaseModel):
    success: bool
    message: str
    assigned: dict | None = None


class ForecastPoint(BaseModel):
    date: str
    predicted: int
    lower: int
    upper: int


class HourlyPoint(BaseModel):
    hour: int
    count: int


class HeatmapOut(BaseModel):
    matrix: Dict[str, Dict[int, int]]


class HealthOut(BaseModel):
    status: str
    dbscan_loaded: bool
    simulator_loaded: bool
    prophet_models_loaded: int
    clusters_loaded: bool
    violations_loaded: bool
    total_clusters: int
    total_violations: int


# ==================== Parking Models ====================

class ParkingViolation(BaseModel):
    parking_id: str
    cluster_id: int
    zone_name: str
    location_lat: float
    location_lng: float
    violation_type: str
    violation_hour: int
    vehicle_type: str
    duration_minutes: int
    severity_level: str
    congestion_impact_pct: float
    is_near_metro: bool
    is_near_commercial: bool
    is_event_day: bool


class ParkingHotspot(BaseModel):
    cluster_id: int
    zone_name: str
    centroid_lat: float
    centroid_lng: float
    parking_violation_count: int
    avg_congestion_impact_pct: float
    vehicle_types_affected: int
    location_context: str
    peak_hours: str
    priority_score: float
    enforcement_gap: float
    deployments_count: int

    @field_validator('peak_hours', mode='before')
    @classmethod
    def coerce_peak_hours(cls, v):
        return str(v)


class ParkingPriority(BaseModel):
    cluster_id: int
    zone_name: str
    priority_rank: int
    priority_score: float
    violation_count: int
    congestion_impact: float
    peak_hours: str
    location_context: str
    recommended_officers: int
    enforcement_gap_hours: float

    @field_validator('peak_hours', mode='before')
    @classmethod
    def coerce_peak_hours(cls, v):
        return str(v)


class ParkingHeatmap(BaseModel):
    matrix: Dict[str, Dict[int, int]]


class ParkingDeployRequest(BaseModel):
    cluster_id: int
    num_officers: int
    deploy_date: str


class ParkingDeployResponse(BaseModel):
    success: bool
    message: str
    deployment_id: str | None = None
    cluster_id: int
    officers_deployed: int


class ParkingEffectiveness(BaseModel):
    cluster_id: int
    zone_name: str
    deploy_date: str
    officers_deployed: int
    violations_before: int
    violations_after: int
    prevention_rate_pct: float
    congestion_reduction_pct: float
    commuter_minutes_saved: int
    enforcement_cost_inr: float
