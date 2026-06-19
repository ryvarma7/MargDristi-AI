from typing import List

from fastapi import APIRouter, HTTPException

from schemas.models import ClusterOut, SimulateRequest, SimulateResponse
from ml.loader import loader

router = APIRouter(prefix="/api/enforcement", tags=["enforcement"])


@router.post("/simulate", response_model=SimulateResponse)
def simulate(request: SimulateRequest):
    cluster = loader.get_cluster(request.cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found")

    prevention_rate = loader.predict_simulator(
        request.cluster_id,
        request.num_officers,
        request.hour,
        request.day_of_week,
    )
    baseline = cluster["violation_count"] / 150.0
    violations_prevented = int(round(baseline * prevention_rate))
    congestion_reduction_pct = round(prevention_rate * 74.0, 1)
    revenue_inr = violations_prevented * 500.0
    commuter_minutes_saved = int(round(violations_prevented * 8.0))

    return SimulateResponse(
        prevention_rate=round(prevention_rate, 4),
        violations_prevented=violations_prevented,
        congestion_reduction_pct=congestion_reduction_pct,
        revenue_inr=revenue_inr,
        commuter_minutes_saved=commuter_minutes_saved,
    )


@router.get("/recommendations", response_model=List[ClusterOut])
def recommendations(station: str | None = None):
    clusters = loader.get_top_clusters(n=100)
    if station:
        clusters = [c for c in clusters if str(c.get("police_station", "")).lower() == station.lower()]
    top = [c for c in clusters if c.get("tier") in ("Tier 1", "Tier 2")]
    top = sorted(top, key=lambda item: item.get("risk_score", 0), reverse=True)
    return [ClusterOut(**c) for c in top[:20]]
