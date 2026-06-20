from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from schemas.models import ClusterOut
from ml.loader import loader

router = APIRouter(prefix="/api/clusters", tags=["clusters"])


@router.get("", response_model=List[ClusterOut])
def get_clusters(tier: Optional[str] = Query(None), limit: int = Query(50, gt=0, le=200)):
    data = loader.get_top_clusters(n=limit, tier=tier)
    return [ClusterOut(**item) for item in data]


@router.get("/{cluster_id}", response_model=ClusterOut)
def get_cluster(cluster_id: int):
    cluster = loader.get_cluster(cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return ClusterOut(**cluster)


@router.get("/{cluster_id}/violation-types", response_model=List[Dict[str, Any]])
def get_violation_types(cluster_id: int):
    try:
        cluster = loader.get_cluster(cluster_id)
        if cluster is None:
            raise HTTPException(status_code=404, detail="Cluster not found")
        return loader.get_violation_types(cluster_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{cluster_id}/vehicle-types", response_model=List[Dict[str, Any]])
def get_vehicle_types(cluster_id: int):
    try:
        cluster = loader.get_cluster(cluster_id)
        if cluster is None:
            raise HTTPException(status_code=404, detail="Cluster not found")
        return loader.get_vehicle_types(cluster_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
