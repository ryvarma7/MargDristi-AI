import { ForecastPoint } from '../types';

export interface ViolationEntry {
  cluster_id: number;
  violation_types: { violation_type: string; count: number }[];
  vehicle_types: { vehicle_type: string; count: number; pct: number }[];
}

export interface RawForecastRow {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
  cluster_id: number;
}

let cachedViolations: ViolationEntry[] | null = null;
let cachedForecasts: RawForecastRow[] | null = null;

export async function getViolationsData(): Promise<ViolationEntry[]> {
  if (cachedViolations) {
    return cachedViolations;
  }
  const response = await fetch('/data/parking_violations.json');
  if (!response.ok) {
    throw new Error('Failed to fetch parking violations');
  }
  cachedViolations = await response.json();
  return cachedViolations || [];
}

export async function getForecastsData(): Promise<RawForecastRow[]> {
  if (cachedForecasts) {
    return cachedForecasts;
  }
  const response = await fetch('/data/prophet_forecasts.json');
  if (!response.ok) {
    throw new Error('Failed to fetch prophet forecasts');
  }
  cachedForecasts = await response.json();
  return cachedForecasts || [];
}

export async function getStaticForecasts(cluster_id: number): Promise<ForecastPoint[]> {
  const forecasts = await getForecastsData();
  const filtered = forecasts.filter((row) => Number(row.cluster_id) === cluster_id);
  return filtered.map((row) => ({
    date: row.ds,
    predicted: Number(row.yhat),
    lower: Number(row.yhat_lower),
    upper: Number(row.yhat_upper),
  }));
}
