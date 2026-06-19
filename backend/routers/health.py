from fastapi import APIRouter

from schemas.models import HealthOut
from ml.loader import loader

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthOut)
def health():
    status = loader.status
    dbscan_loaded = status.get("dbscan", False)
    simulator_loaded = status.get("simulator", False)
    prophet_models_loaded = int(status.get("prophet_models_loaded", 0))
    clusters_loaded = status.get("clusters", False)
    violations_loaded = status.get("violations", False)
    total_clusters = 0
    total_violations = 0
    if loader.clusters is not None:
        total_clusters = int(loader.clusters.shape[0])
    if loader.violations is not None:
        total_violations = int(loader.violations.shape[0])

    overall = "healthy"
    if not all([dbscan_loaded, simulator_loaded, clusters_loaded, violations_loaded]):
        overall = "degraded"
    if loader.clusters is None or loader.violations is None:
        overall = "starting"

    return HealthOut(
        status=overall,
        dbscan_loaded=dbscan_loaded,
        simulator_loaded=simulator_loaded,
        prophet_models_loaded=prophet_models_loaded,
        clusters_loaded=clusters_loaded,
        violations_loaded=violations_loaded,
        total_clusters=total_clusters,
        total_violations=total_violations,
    )
