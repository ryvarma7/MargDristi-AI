import client from './client';
import {
  Cluster,
  ForecastPoint,
  HourlyPoint,
  HeatmapOut,
  HealthStatus,
  SimulateRequest,
  SimulateResponse,
} from '../types';

export async function getClusters(tier?: string, limit = 50): Promise<Cluster[]> {
  const response = await client.get<Cluster[]>('/api/clusters', {
    params: { tier, limit },
  });
  return response.data;
}

export async function getCluster(cluster_id: number): Promise<Cluster> {
  const response = await client.get<Cluster>(`/api/clusters/${cluster_id}`);
  return response.data;
}

export async function getRecommendations(): Promise<Cluster[]> {
  const response = await client.get<Cluster[]>('/api/enforcement/recommendations');
  return response.data;
}

export async function simulate(request: SimulateRequest): Promise<SimulateResponse> {
  const response = await client.post<SimulateResponse>('/api/enforcement/simulate', request);
  return response.data;
}

export async function getForecasts(cluster_id: number): Promise<ForecastPoint[]> {
  const response = await client.get<ForecastPoint[]>(`/api/forecasts/${cluster_id}`);
  return response.data;
}

export async function getHourlyPattern(cluster_id?: number): Promise<HourlyPoint[]> {
  const response = await client.get<HourlyPoint[]>('/api/temporal/hourly', {
    params: { cluster_id },
  });
  return response.data;
}

export async function getHeatmap(cluster_id?: number): Promise<HeatmapOut> {
  const response = await client.get<HeatmapOut>('/api/temporal/heatmap', {
    params: { cluster_id },
  });
  return response.data;
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await client.get<HealthStatus>('/api/health');
  return response.data;
}
