import {
  Cluster,
  ForecastPoint,
  HourlyPoint,
  HeatmapOut,
  HealthStatus,
  SimulateRequest,
  SimulateResponse,
  ViolationTypeBreakdown,
  VehicleTypeBreakdown,
} from '../types';

export async function getClusters(tier?: string, limit = 50): Promise<Cluster[]> {
  const response = await fetch('/data/clusters.json');
  const data: Cluster[] = await response.json();
  let result = data;
  if (tier) {
    result = result.filter(c => c.tier === tier);
  }
  return result.slice(0, limit);
}

export async function getCluster(cluster_id: number): Promise<Cluster> {
  const response = await fetch('/data/clusters.json');
  const data: Cluster[] = await response.json();
  const cluster = data.find(c => c.cluster_id === cluster_id);
  if (!cluster) {
    throw new Error('Cluster not found');
  }
  return cluster;
}

export async function getRecommendations(): Promise<Cluster[]> {
  const response = await fetch('/data/clusters.json');
  const data: Cluster[] = await response.json();
  const top = data.filter(c => c.tier === 'Tier 1' || c.tier === 'Tier 2');
  return top.sort((a, b) => b.risk_score - a.risk_score).slice(0, 20);
}

export async function simulate(request: SimulateRequest): Promise<SimulateResponse> {
  const clusters = await getClusters();
  const cluster = clusters.find(c => c.cluster_id === request.cluster_id);
  if (!cluster) {
    throw new Error('Cluster not found');
  }
  const numOfficers = request.num_officers;
  const violations_prevented = Math.round(cluster.violation_count * (0.12 + numOfficers * 0.08) * (cluster.risk_score / 100));
  const congestion_reduction_pct = Math.round(8 + numOfficers * 3.5);
  const revenue_inr = violations_prevented * 500;
  const commuter_minutes_saved = violations_prevented * 4;
  const prevention_rate = Number((0.12 + numOfficers * 0.08).toFixed(4));
  return {
    prevention_rate,
    violations_prevented,
    congestion_reduction_pct,
    revenue_inr,
    commuter_minutes_saved,
  };
}

export async function deploy(request: { cluster_id: number; num_officers: number }) {
  return {
    success: true,
    message: 'Deployed (demo mode)',
    assigned: {
      num_officers: request.num_officers,
      deployed_at: new Date().toISOString()
    }
  };
}

export async function getForecasts(cluster_id: number): Promise<ForecastPoint[]> {
  const response = await fetch('/data/prophet_forecasts.json');
  const data = await response.json();
  const filtered = data.filter((row: any) => Number(row.cluster_id) === cluster_id);
  return filtered.map((row: any) => ({
    date: row.ds,
    predicted: Number(row.yhat),
    lower: Number(row.yhat_lower),
    upper: Number(row.yhat_upper),
  }));
}

export async function getHourlyPattern(cluster_id?: number): Promise<HourlyPoint[]> {
  const response = await fetch('/data/temporal_hourly_city.json');
  return response.json();
}

export async function getHeatmap(cluster_id?: number): Promise<HeatmapOut> {
  const response = await fetch('/data/parking_temporal_heatmap.json');
  const data = await response.json();
  const matrix: Record<string, Record<number, number>> = {};
  const dayMap: Record<string, string> = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };
  for (const row of data) {
    const shortDay = dayMap[row.day] || row.day.slice(0, 3);
    matrix[shortDay] = {};
    for (let h = 0; h < 24; h++) {
      matrix[shortDay][h] = Number(row[`hour_${h}`]) || 0;
    }
  }
  return { matrix };
}

export async function getHealth(): Promise<HealthStatus> {
  return {
    status: 'healthy',
    dbscan_loaded: true,
    simulator_loaded: true,
    prophet_models_loaded: 11,
    clusters_loaded: true,
    violations_loaded: true,
    total_clusters: 588,
    total_violations: 100000,
  };
}

export async function getViolationTypes(cluster_id: number): Promise<ViolationTypeBreakdown[]> {
  const response = await fetch('/data/parking_violations.json');
  const data = await response.json();
  const entry = data.find((row: any) => Number(row.cluster_id) === cluster_id);
  return entry ? entry.violation_types : [];
}

export async function getVehicleTypes(cluster_id: number): Promise<VehicleTypeBreakdown[]> {
  const response = await fetch('/data/parking_violations.json');
  const data = await response.json();
  const entry = data.find((row: any) => Number(row.cluster_id) === cluster_id);
  return entry ? entry.vehicle_types : [];
}

// ==================== Parking Endpoints ====================

export async function getParkingHotspots(limit = 10): Promise<any[]> {
  const response = await fetch('/data/parking_hotspots.json');
  const data = await response.json();
  return data.slice(0, limit);
}

export async function getParkingPriorities(limit = 10): Promise<any[]> {
  const response = await fetch('/data/parking_hotspots.json');
  const data = await response.json();
  return data.slice(0, limit);
}

export async function getParkingHeatmap(): Promise<any> {
  return getHeatmap();
}

export async function getParkingViolations(cluster_id: number, limit = 50): Promise<any[]> {
  return [];
}

export async function deployParkingEnforcement(request: {
  cluster_id: number;
  num_officers: number;
  deploy_date: string;
}): Promise<any> {
  return { success: true, message: 'Parking enforcement deployed' };
}

export async function getParkingEffectiveness(cluster_id?: number, limit = 20): Promise<any[]> {
  const mockEff = [
    {
      deployment_id: 1,
      cluster_id: 186,
      officers_deployed: 5,
      violations_before: 120,
      violations_after: 42,
      prevention_rate_pct: 65,
      congestion_reduction_pct: 28,
    },
    {
      deployment_id: 2,
      cluster_id: 117,
      officers_deployed: 3,
      violations_before: 85,
      violations_after: 35,
      prevention_rate_pct: 59,
      congestion_reduction_pct: 18,
    },
    {
      deployment_id: 3,
      cluster_id: 87,
      officers_deployed: 2,
      violations_before: 50,
      violations_after: 25,
      prevention_rate_pct: 50,
      congestion_reduction_pct: 15,
    },
    {
      deployment_id: 4,
      cluster_id: 263,
      officers_deployed: 4,
      violations_before: 95,
      violations_after: 38,
      prevention_rate_pct: 60,
      congestion_reduction_pct: 22,
    },
    {
      deployment_id: 5,
      cluster_id: 558,
      officers_deployed: 3,
      violations_before: 70,
      violations_after: 28,
      prevention_rate_pct: 60,
      congestion_reduction_pct: 20,
    }
  ];
  return mockEff.slice(0, limit);
}

export async function getParkingStats(): Promise<any> {
  return {
    total_violations: 1420,
    avg_congestion_impact_pct: 5.4,
    critical_zones: 3,
    top_violation_type: 'WRONG PARKING',
  };
}

export async function getGeoHeatmapPoints(cluster_id?: number, limit = 3000): Promise<[number, number, number][]> {
  const response = await fetch('/data/clusters.json');
  const data: Cluster[] = await response.json();
  let filtered = data;
  if (cluster_id !== undefined && cluster_id !== null) {
    filtered = data.filter(c => c.cluster_id === cluster_id);
  }
  return filtered.slice(0, limit).map(c => [c.centroid_lat, c.centroid_lng, c.risk_score / 100]);
}
