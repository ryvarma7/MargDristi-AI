from typing import Dict

from pydantic import BaseModel


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
