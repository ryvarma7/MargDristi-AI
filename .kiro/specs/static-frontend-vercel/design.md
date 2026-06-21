# Design Document — static-frontend-vercel

## Overview

This document describes the technical design for converting MargDristi from a full-stack deployment (FastAPI backend + React/Vite frontend) to a 100% static frontend deployable on Vercel. All runtime API calls are eliminated. Pre-generated JSON files replace every live endpoint. A Node.js conversion script produces these static data files from the existing CSVs in `/data/`. The frontend simulation engine becomes a pure, deterministic in-memory computation. No backend source files are deleted.

---

## Architecture

### Before (Current)

```
Browser
  └── React/Vite SPA (Vercel)
        └── axios → /api/* (rewrites → Render.com)
                        └── FastAPI (Python)
                              └── CSV/PKL files
```

### After (Target)

```
Browser
  └── React/Vite SPA (Vercel)
        └── fetch → /data/*.json  (static assets, served by Vercel CDN)
```

The Render.com backend continues to exist but is not wired to the frontend. Vercel's `rewrites` rule is removed from `vercel.json`. The frontend becomes a fully self-contained static application.

---

## Components and Interfaces

### 1. Data Conversion Script (`scripts/convert-data.js`)

A standalone Node.js (CommonJS) script with no external runtime dependencies beyond `fs` and `path`. It reads each CSV from `/data/` using a minimal line-by-line parser, transforms the rows, and writes JSON files to `frontend/public/data/`.

**Responsibilities:**
- Parse CSV files with a simple header-based column mapper
- Apply per-file transformations (see Data Models)
- Write output JSON atomically
- Exit with code 1 and a descriptive message if a source CSV is missing

**Execution:**
```
node scripts/convert-data.js
```

**Output files written to `frontend/public/data/`:**

| Output file | Source CSV |
|---|---|
| `clusters.json` | `cluster_metadata.csv` |
| `parking_hotspots.json` | `parking_hotspots.csv` |
| `parking_temporal_heatmap.json` | `parking_temporal_heatmap.csv` |
| `temporal_hourly_city.json` | `temporal_hourly_city.csv` |
| `prophet_forecasts.json` | `prophet_forecasts.csv` |
| `parking_violations.json` | `parking_violations.csv` |

---

### 2. Static Data Layer (`frontend/src/data/`)

A new module `frontend/src/data/staticData.ts` manages in-memory caches for data that is fetched once and shared across multiple consumers (specifically `parking_violations.json` and `prophet_forecasts.json`). It exports async getter functions that fetch on first call and return the cached value thereafter.

```typescript
// frontend/src/data/staticData.ts

type ViolationEntry = {
  cluster_id: number;
  violation_types: { violation_type: string; count: number }[];
  vehicle_types: { vehicle_type: string; count: number; pct: number }[];
};

let _violationsCache: ViolationEntry[] | null = null;
let _forecastsCache: RawForecastRow[] | null = null;

export async function getViolationsData(): Promise<ViolationEntry[]> { ... }
export async function getForecastsData(): Promise<RawForecastRow[]> { ... }
```

This avoids duplicate network requests when multiple components on the same page need the same data.

---

### 3. Hook Refactors

#### `useClusters` (Requirement 2)

Replaces the existing `getClusters` + `getHealth` dual-call with a single `fetch('/data/clusters.json')`. No polling interval. The `setHealth` call and `HealthStatus` dependency are removed. On error, sets `error` to `'Unable to load cluster data'`.

```typescript
// Simplified signature — no breaking change to consumers
export default function useClusters(): { loading: boolean; error: string | null }
```

#### `useParking` (Requirement 3)

Replaces `getParkingHotspots`, `getParkingPriorities`, and `getParkingHeatmap` with two parallel fetches:
- `fetch('/data/parking_hotspots.json')` → calls both `setParkingHotspots` and `setParkingPriorities` with the same parsed array
- `fetch('/data/parking_temporal_heatmap.json')` → calls `setParkingHeatmap`

No polling interval.

#### `useSimulate` — Removed (Requirement 4)

`frontend/src/hooks/useSimulate.ts` is deleted. Its import in `SimulatorPanel.tsx` is removed and replaced with an inline `runSimulation` function.

---

### 4. SimulatorPanel Refactor (Requirement 5)

The simulation lifecycle changes from reactive (auto-running on cluster/officer changes) to explicit (user-triggered).

**New state model:**

```typescript
// Inside SimulatorPanel
const [simResult, setSimResult] = useState<SimulateResponse | null>(null);
const [hasRun, setHasRun] = useState(false);

// Clear results when officer count changes after a run
useEffect(() => {
  if (hasRun) {
    setSimResult(null);
    setHasRun(false);
  }
}, [numOfficers]);
```

**Deterministic formula (pure function, no network):**

```typescript
function runSimulation(cluster: Cluster, numOfficers: number): SimulateResponse {
  const violations_prevented = Math.round(
    cluster.violation_count * (0.12 + numOfficers * 0.08) * (cluster.risk_score / 100)
  );
  const congestion_reduction_pct = Math.round(8 + numOfficers * 3.5);
  const revenue_inr = violations_prevented * 500;
  const commuter_minutes_saved = violations_prevented * 4;
  return { violations_prevented, congestion_reduction_pct, revenue_inr, commuter_minutes_saved, prevention_rate: 0 };
}
```

**"Deploy Now" button:** Calls `addDeployment(...)` directly (already in appStore) and calls `selectCluster(null)`. The `deployApi` import from `api/endpoints.ts` is removed entirely.

**Demo Mode badge:** Rendered below the results grid whenever `simResult !== null`:
```
Demo Mode — Results generated from historical analysis
```

---

### 5. GeoHeatmapPoints Derivation (Requirement 6)

`TemporalAnalysis.tsx` currently calls `getGeoHeatmapPoints(...)`. This is replaced with a derived computation from the clusters array already loaded into the app store:

```typescript
// Derived inline — no fetch needed
const geoPoints: [number, number, number][] = clusters.map(
  (c) => [c.centroid_lat, c.centroid_lng, c.risk_score / 100]
);
```

The `clusters` state comes from `useAppStore` (already populated by `useClusters`). The `TemporalAnalysis` page will call `useClusters()` to ensure data is loaded, then derive points locally.

---

### 6. Hourly Pattern Refactor (Requirement 7)

`TemporalAnalysis.tsx` currently calls `getHourlyPattern(cluster_id?)`. After the refactor:
- City-wide pattern: fetches `/data/temporal_hourly_city.json` once, parsed as `{ hour, count }[]`
- Per-cluster pattern: since `temporal_hourly_city.json` only has city-wide data, per-cluster hourly breakdown is not available in static mode. The zone selector will show city-wide data regardless of selected cluster (this is the correct behavior given the available static data).

```typescript
const loadHourly = useCallback(async () => {
  setChartLoading(true);
  try {
    const res = await fetch('/data/temporal_hourly_city.json');
    const data: HourlyPoint[] = await res.json();
    setHourly(data);
  } catch {
    setHourly([]);
  } finally {
    setChartLoading(false);
  }
}, []);
```

---

### 7. Violation/Vehicle Type Refactor (Requirement 8)

`ZoneExplorer.tsx` calls `getViolationTypes(cluster_id)` and `getVehicleTypes(cluster_id)`. After the refactor, both read from the cached in-memory `parking_violations.json` via `staticData.ts`:

```typescript
const data = await getViolationsData();
const entry = data.find((e) => e.cluster_id === cluster_id);
const violation_types = entry?.violation_types ?? [];
const vehicle_types = entry?.vehicle_types ?? [];
```

---

### 8. Forecasts Refactor (Requirement 9)

`ZoneExplorer.tsx` and any other consumers of forecast data call the new local utility instead of `getForecasts(cluster_id)`:

```typescript
// frontend/src/data/staticData.ts
export async function getStaticForecasts(cluster_id: number): Promise<ForecastPoint[]> {
  const rows = await getForecastsData();
  return rows
    .filter((r) => Number(r.cluster_id) === cluster_id)
    .map((r) => ({
      date: r.ds,
      predicted: Number(r.yhat),
      lower: Number(r.yhat_lower),
      upper: Number(r.yhat_upper),
    }));
}
```

---

### 9. CommandCenter Error State (Requirement 10)

The existing error branch in `CommandCenter.tsx` that renders `"BACKEND UNAVAILABLE"` and a `uvicorn` terminal command is replaced:

```tsx
{/* Old: renders "BACKEND UNAVAILABLE" + terminal command */}
{/* New: */}
{error && clusters.length === 0 ? (
  <div style={{ /* centered empty state styling */ }}>
    <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-dim)' }}>
      No data available
    </div>
  </div>
) : /* loading / main content */}
```

---

### 10. API Module Stubs (Requirement 12)

`api/client.ts` and `api/endpoints.ts` are gutted to stubs. This ensures TypeScript compilation succeeds for any residual imports during the transition period.

**`api/client.ts` stub:**
```typescript
// Static mode: no HTTP client needed
const client = {} as any;
export default client;
```

**`api/endpoints.ts` stub:**
```typescript
// All functions throw if called — they should not be called in static mode
function staticModeError(name: string): never {
  throw new Error(`Static mode: endpoint not available (${name})`);
}

export const getClusters = () => staticModeError('getClusters');
export const getCluster = () => staticModeError('getCluster');
export const simulate = () => staticModeError('simulate');
export const deploy = () => staticModeError('deploy');
// ... all previously exported functions
```

The `axios` dependency remains in `package.json` to avoid a build break from indirect imports, but `client.ts` no longer uses it.

---

### 11. Vercel Configuration (Requirement 11)

`vercel.json` at the workspace root is updated to remove the `rewrites` array:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist"
}
```

The `rewrites` entry that proxied `/api/*` to Render.com is removed. Since the frontend no longer makes any `/api/*` requests, this is safe and correct.

---

## Data Models

### `clusters.json` — Array of `Cluster`

```typescript
interface Cluster {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  violation_count: number;
  total_cis: number;
  avg_cis: number;
  peak_hour: number;
  top_vehicle: string;
  top_violation: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  risk_score: number;
}
```

### `parking_hotspots.json` — Array (columns preserved from CSV)

All columns from `parking_hotspots.csv` preserved as-is. Numeric string columns are coerced to numbers by the conversion script.

### `parking_temporal_heatmap.json`

```typescript
interface HeatmapRow {
  day: string;       // e.g. "Monday"
  hour_0: number;
  hour_1: number;
  // ...
  hour_23: number;
}
```

### `temporal_hourly_city.json`

```typescript
interface HourlyPoint {
  hour: number;
  count: number;
}
```

### `prophet_forecasts.json`

```typescript
interface RawForecastRow {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
  cluster_id: number;
}
```

### `parking_violations.json` — Grouped by `cluster_id`

```typescript
interface ViolationEntry {
  cluster_id: number;
  violation_types: { violation_type: string; count: number }[];     // top 5, desc
  vehicle_types: { vehicle_type: string; count: number; pct: number }[]; // top 5, desc
}
type ParkingViolationsJSON = ViolationEntry[];
```

---

### Data Access Interface

All components that previously called `api/endpoints.ts` are updated to use one of three patterns:

| Pattern | Used by | Mechanism |
|---|---|---|
| Direct `fetch('/data/*.json')` | `useClusters`, `useParking`, TemporalAnalysis | Browser Fetch API |
| `staticData.ts` cache | ZoneExplorer (violation/vehicle types, forecasts) | Module-level singleton cache |
| Derived computation | MapView, TemporalAnalysis (heatmap points) | Pure JS from app store data |

### SimulatorPanel Interface (unchanged externally)

```typescript
// Props remain the same
type Props = { cluster: Cluster | null };
```

The `useSimulate` hook is no longer imported. All simulation state lives inside the component.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `clusters.json` fetch fails | `useClusters` sets `error = 'Unable to load cluster data'`; CommandCenter shows "No data available" |
| `parking_hotspots.json` or `parking_temporal_heatmap.json` fetch fails | `useParking` sets `error = 'Unable to load parking data'` |
| `temporal_hourly_city.json` fetch fails | TemporalAnalysis sets hourly to `[]`; chart renders with no data |
| `prophet_forecasts.json` fetch fails | `getForecastsData` rejects; consumer receives empty array |
| `parking_violations.json` fetch fails | `getViolationsData` rejects; consumer receives empty arrays |
| Missing `cluster_id` in violations data | Returns `[]` for both violation_types and vehicle_types |
| Conversion script — missing CSV | Prints `"ERROR: Source file not found: /data/<name>.csv"` to stderr, exits with code 1 |

---

## Testing Strategy

**Dual approach: unit tests + property-based tests.**

Unit tests (Vitest) cover:
- Specific fetch URL assertions for `useClusters` and `useParking` (mocked `fetch`)
- SimulatorPanel UI states: "Run Simulation" button visibility, Demo Mode badge rendering, result clearing on officer count change
- CommandCenter error state renders "No data available" (not "BACKEND UNAVAILABLE")
- `api/endpoints.ts` stubs throw `"Static mode: endpoint not available"` when called
- Conversion script exits with code 1 on missing CSV

Property-based tests (fast-check) cover the six properties listed in the Correctness Properties section below. Each property test runs a minimum of 100 iterations over generated inputs to catch edge cases such as clusters with `risk_score = 0`, `violation_count = 0`, extreme officer counts, special-character zone names, and large heatmap datasets.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSV-to-JSON column preservation

*For any* valid CSV row in `cluster_metadata.csv`, `parking_hotspots.csv`, `temporal_hourly_city.csv`, or `prophet_forecasts.csv`, the conversion script's output JSON object for that row SHALL contain every specified column with a non-null value, and numeric string columns SHALL be coerced to numeric types.

**Validates: Requirements 1.1, 1.2, 1.4, 1.5**

---

### Property 2: Violations grouping and sort order

*For any* set of `parking_violations.csv` rows spanning multiple cluster IDs, the resulting `parking_violations.json` SHALL contain exactly one entry per distinct `cluster_id`, and within each entry, the `violation_types` and `vehicle_types` arrays SHALL each be sorted in descending order by `count`.

**Validates: Requirements 1.6**

---

### Property 3: Deterministic simulation formula

*For any* `Cluster` object and integer `numOfficers` in the range 1–5, `runSimulation(cluster, numOfficers)` SHALL compute:
- `violations_prevented = Math.round(cluster.violation_count × (0.12 + numOfficers × 0.08) × (cluster.risk_score / 100))`
- `congestion_reduction_pct = Math.round(8 + numOfficers × 3.5)`
- `revenue_inr = violations_prevented × 500`
- `commuter_minutes_saved = violations_prevented × 4`

**Validates: Requirements 4.3, 4.4, 4.5, 4.6**

---

### Property 4: GeoHeatmapPoints derivation

*For any* array of `Cluster` objects (including the empty array), the derived `GeoHeatmapPoints` SHALL equal `clusters.map(c => [c.centroid_lat, c.centroid_lng, c.risk_score / 100])`, producing a triple for every cluster and an empty array when the input is empty.

**Validates: Requirements 6.1, 6.3**

---

### Property 5: In-memory violation and vehicle type lookup

*For any* `cluster_id` that exists in the loaded `parking_violations.json`, the returned `violation_types` and `vehicle_types` arrays SHALL exactly match the arrays stored under that `cluster_id`. For any `cluster_id` not present in the data, both arrays SHALL be empty.

**Validates: Requirements 8.1, 8.2, 8.4**

---

### Property 6: Forecast filter and field mapping

*For any* `cluster_id`, the `getStaticForecasts(cluster_id)` function SHALL return only rows where `cluster_id` matches, and each returned `ForecastPoint` SHALL have `date = row.ds`, `predicted = Number(row.yhat)`, `lower = Number(row.yhat_lower)`, `upper = Number(row.yhat_upper)`. When no rows match, it SHALL return `[]`.

**Validates: Requirements 9.1, 9.2, 9.4**
