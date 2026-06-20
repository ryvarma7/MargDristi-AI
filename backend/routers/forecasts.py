from typing import List, Optional

from fastapi import APIRouter, Query

from schemas.models import ForecastPoint, HourlyPoint, HeatmapOut
from ml.loader import loader

router = APIRouter(prefix="/api", tags=["forecasts"])


@router.get("/forecasts/{cluster_id}", response_model=List[ForecastPoint])
def get_forecasts(cluster_id: int):
    return [ForecastPoint(**item) for item in loader.get_forecast(cluster_id)]


@router.get("/temporal/hourly", response_model=List[HourlyPoint])
def get_hourly(cluster_id: Optional[int] = None):
    data = loader.get_hourly_pattern(cluster_id)
    return [HourlyPoint(**item) for item in data]


@router.get("/temporal/heatmap", response_model=HeatmapOut)
def get_heatmap(cluster_id: Optional[int] = None):
    return HeatmapOut(matrix=loader.get_heatmap_matrix(cluster_id))


@router.get("/geo/heatmap-points")
def get_geo_heatmap_points(
    cluster_id: Optional[int] = Query(None),
    limit: int = Query(3000, gt=0, le=10000),
):
    """Return [lat, lng, intensity] triples for the geographic heatmap.
    Sampled to `limit` rows to keep payload small.
    """
    import pandas as pd
    df = loader.violations
    if df is None:
        return []

    cols_needed = ["latitude", "longitude", "cis_score", "cluster_id"]
    for col in cols_needed:
        if col not in df.columns:
            return []

    working = df[cols_needed].dropna(subset=["latitude", "longitude"])

    if cluster_id is not None:
        working = working[working["cluster_id"] == cluster_id]

    if len(working) == 0:
        return []

    # Sample evenly if too large
    if len(working) > limit:
        working = working.sample(n=limit, random_state=42)

    # Normalise intensity to 0–1 using cis_score
    max_cis = float(working["cis_score"].max()) or 1.0
    working = working.copy()
    working["intensity"] = (working["cis_score"] / max_cis).round(4)
    result = working[["latitude", "longitude", "intensity"]].values.tolist()
    return [[round(r[0], 6), round(r[1], 6), r[2]] for r in result]
