from typing import List, Optional

from fastapi import APIRouter

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
