from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from schemas.models import (
    ParkingHotspot,
    ParkingPriority,
    ParkingHeatmap,
    ParkingDeployRequest,
    ParkingDeployResponse,
    ParkingEffectiveness,
)
from ml.loader import loader

router = APIRouter(prefix="/api/parking", tags=["parking"])


@router.get("/hotspots", response_model=List[ParkingHotspot])
def get_parking_hotspots(limit: int = Query(10, gt=0, le=50)):
    """Get all parking hotspots ranked by priority score."""
    hotspots = loader.get_parking_hotspots()
    if not hotspots:
        raise HTTPException(status_code=404, detail="No parking hotspots data available")
    return [ParkingHotspot(**item) for item in hotspots[:limit]]


@router.get("/hotspots/{cluster_id}", response_model=ParkingHotspot)
def get_parking_hotspot_detail(cluster_id: int):
    """Get detailed parking hotspot information for a specific cluster."""
    hotspot = loader.get_parking_hotspot(cluster_id)
    if hotspot is None:
        raise HTTPException(status_code=404, detail="Parking hotspot not found")
    return ParkingHotspot(**hotspot)


@router.get("/priorities", response_model=List[ParkingPriority])
def get_parking_priorities(limit: int = Query(10, gt=0, le=50)):
    """Get ranked parking enforcement priorities."""
    priorities = loader.get_parking_priorities()
    if not priorities:
        raise HTTPException(status_code=404, detail="No parking priorities data available")
    return [ParkingPriority(**item) for item in priorities[:limit]]


@router.get("/heatmap", response_model=ParkingHeatmap)
def get_parking_heatmap():
    """Get temporal heatmap matrix for parking violations (7 days × 24 hours)."""
    matrix = loader.get_parking_heatmap_matrix()
    if not matrix:
        raise HTTPException(status_code=404, detail="No parking heatmap data available")
    return ParkingHeatmap(matrix=matrix)


@router.get("/violations/{cluster_id}", response_model=List[Dict[str, Any]])
def get_cluster_parking_violations(cluster_id: int, limit: int = Query(50, gt=0, le=500)):
    """Get parking violations for a specific cluster."""
    violations = loader.get_parking_violations_by_cluster(cluster_id)
    if not violations:
        raise HTTPException(status_code=404, detail="No parking violations found for cluster")
    return violations[:limit]


@router.post("/deploy", response_model=ParkingDeployResponse)
def deploy_parking_enforcement(request: ParkingDeployRequest):
    """Record a parking enforcement deployment."""
    try:
        # Validate cluster exists
        hotspot = loader.get_parking_hotspot(request.cluster_id)
        if hotspot is None:
            raise HTTPException(status_code=404, detail="Cluster not found")
        
        # Validate officer count
        if request.num_officers < 1 or request.num_officers > 20:
            raise HTTPException(status_code=400, detail="Officer count must be between 1 and 20")
        
        # Record deployment
        deployment_id = loader.add_parking_deployment(
            request.cluster_id,
            request.num_officers,
            request.deploy_date
        )
        
        return ParkingDeployResponse(
            success=True,
            message=f"Successfully deployed {request.num_officers} officers to {hotspot.get('zone_name', 'Zone')}",
            deployment_id=deployment_id,
            cluster_id=request.cluster_id,
            officers_deployed=request.num_officers,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(exc)}")


@router.get("/effectiveness", response_model=List[ParkingEffectiveness])
def get_parking_effectiveness(
    cluster_id: Optional[int] = Query(None),
    limit: int = Query(20, gt=0, le=100)
):
    """Get enforcement effectiveness metrics for parking deployments."""
    metrics = loader.get_parking_effectiveness(cluster_id)
    if not metrics:
        return []
    return [ParkingEffectiveness(**item) for item in metrics[:limit]]


@router.get("/stats", response_model=Dict[str, Any])
def get_parking_stats():
    """Get overall parking enforcement statistics."""
    hotspots = loader.get_parking_hotspots()
    violations = loader.parking_violations
    
    total_violations = len(violations) if violations is not None else 0
    total_hotspots = len(hotspots)
    avg_congestion = (
        float(violations["congestion_impact_pct"].mean())
        if violations is not None and "congestion_impact_pct" in violations.columns
        else 0.0
    )
    
    return {
        "total_violations": total_violations,
        "total_hotspots": total_hotspots,
        "avg_congestion_impact_pct": round(avg_congestion, 1),
        "top_violation_type": (
            str(violations["violation_type"].mode().iloc[0])
            if violations is not None and "violation_type" in violations.columns and len(violations) > 0
            else "Unknown"
        ),
        "critical_zones": sum(1 for h in hotspots if h.get("priority_score", 0) > 90),
    }
