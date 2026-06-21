# Implementation Plan: static-frontend-vercel

## Overview

Convert MargDristi from a full-stack deployment to a 100% static frontend on Vercel. The work falls into four areas: (1) a Node.js data conversion script that pre-generates JSON from CSVs, (2) frontend hook/page refactors that replace every live API call with static fetches or local computation, (3) Vercel config cleanup, and (4) routing `endpoints.ts` to serve static JSON instead of throwing errors. No backend files, model files, or large CSVs are deleted during Phase 1 — cleanup is Phase 2 after successful Vercel deployment and functional verification. The design language is **TypeScript / TSX** (Vite/React) for frontend code and **CommonJS Node.js** for the conversion script.

---

## Tasks

- [ ] 1. Create the data conversion script
  - [ ] 1.1 Scaffold `scripts/convert-data.js` with CSV parser and output helpers
    - Create `scripts/convert-data.js` as a CommonJS Node.js script using only `fs` and `path`
    - Implement a minimal header-based line-by-line CSV parser (no external deps)
    - Add a helper that writes JSON atomically to `frontend/public/data/`
    - Add guard: if source CSV is missing, print `"ERROR: Source file not found: /data/<name>.csv"` to stderr and `process.exit(1)`
    - Create `frontend/public/data/` directory if it does not exist
    - _Requirements: 1.8, 1.9_

  - [ ] 1.2 Implement `clusters.json` and `parking_hotspots.json` transforms
    - Read `data/cluster_metadata.csv`; coerce all numeric columns (`cluster_id`, `centroid_lat`, `centroid_lng`, `violation_count`, `total_cis`, `avg_cis`, `peak_hour`, `risk_score`) to numbers; write `frontend/public/data/clusters.json`
    - Read `data/parking_hotspots.csv`; coerce numeric columns to numbers; write `frontend/public/data/parking_hotspots.json`
    - _Requirements: 1.1, 1.2_

  - [ ]* 1.3 Write property test for CSV-to-JSON column preservation (Property 1)
    - **Property 1: CSV-to-JSON column preservation**
    - For any valid CSV row, the output JSON object SHALL contain every specified column with a non-null value, and numeric string columns SHALL be coerced to numeric types
    - Use `fast-check` in Vitest; generate synthetic CSV rows and run them through the parser function extracted from the script
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**

  - [ ] 1.4 Implement `parking_temporal_heatmap.json`, `temporal_hourly_city.json`, and `prophet_forecasts.json` transforms
    - Read `data/parking_temporal_heatmap.csv`; write each row as `{ day, hour_0, …, hour_23 }` with numeric hour fields; write `frontend/public/data/parking_temporal_heatmap.json`
    - Read `data/temporal_hourly_city.csv`; write as `{ hour, count }[]`; write `frontend/public/data/temporal_hourly_city.json`
    - Read `data/prophet_forecasts.csv`; write as `{ ds, yhat, yhat_lower, yhat_upper, cluster_id }[]` with numeric fields; write `frontend/public/data/prophet_forecasts.json`
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ] 1.5 Implement `parking_violations.json` grouped transform
    - Read `data/parking_violations.csv`; group rows by `cluster_id`
    - For each cluster, compute top-5 `violation_types` sorted descending by count and top-5 `vehicle_types` sorted descending by count with `pct` field
    - Write `frontend/public/data/parking_violations.json` as `ViolationEntry[]`
    - _Requirements: 1.6, 1.7_

  - [ ]* 1.6 Write property test for violations grouping and sort order (Property 2)
    - **Property 2: Violations grouping and sort order**
    - For any set of rows spanning multiple cluster IDs, the output SHALL contain exactly one entry per distinct `cluster_id`, and `violation_types` / `vehicle_types` SHALL be sorted descending by count
    - Use `fast-check` in Vitest; generate synthetic violation rows with arbitrary cluster IDs and counts
    - **Validates: Requirements 1.6**

- [ ] 2. Wire `api/` to static data layer and update Vercel config
  - [ ] 2.1 Keep `api/client.ts` unchanged
    - Do NOT gut or stub `client.ts`
    - The axios client remains as-is; it will simply no longer be called once hooks/pages are migrated to fetch static JSON directly
    - _No code change required_

  - [ ] 2.2 Redirect `api/endpoints.ts` to serve static JSON instead of HTTP calls
    - Keep all previously exported function names so no TypeScript import breaks
    - For each function that has a static JSON equivalent, replace the `client.*` call with a `fetch('/data/<file>.json')` call that parses and returns the relevant data
    - Specifically:
      - `getClusters()` → fetch `/data/clusters.json`, return parsed array (ignore `tier`/`limit` params)
      - `getHourlyPattern()` → fetch `/data/temporal_hourly_city.json`, return parsed array
      - `getForecasts(cluster_id)` → fetch `/data/prophet_forecasts.json`, filter by `cluster_id`, map fields to `ForecastPoint`
      - `getParkingHotspots()` → fetch `/data/parking_hotspots.json`
      - `getParkingPriorities()` → fetch `/data/parking_hotspots.json` (same data)
      - `getParkingHeatmap()` → fetch `/data/parking_temporal_heatmap.json`, return `{ matrix: <parsed> }`
      - `getViolationTypes(cluster_id)` → fetch `/data/parking_violations.json`, find entry, return `violation_types` array
      - `getVehicleTypes(cluster_id)` → fetch `/data/parking_violations.json`, find entry, return `vehicle_types` array
      - `getGeoHeatmapPoints()` → fetch `/data/clusters.json`, map to `[lat, lng, risk_score/100]` triples
      - `simulate()` → compute deterministically from request params (use same formula as SimulatorPanel); do NOT throw
      - `deploy()` → return `{ success: true, message: 'Deployed (demo mode)' }` without any network call
      - `getHealth()` → return a hardcoded healthy `HealthStatus` object without any network call
      - Functions with no static equivalent (`getCluster`, `getRecommendations`, parking write endpoints) → return sensible empty/success stubs without throwing
    - _Requirements: 12.2, 12.3_

  - [ ] 2.3 Update `vercel.json` to remove the rewrites array
    - Keep `buildCommand` and `outputDirectory` as-is
    - Remove the `rewrites` array entirely
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 3. Checkpoint — build must pass with static endpoints
  - Run `node scripts/convert-data.js` from the workspace root to generate all JSON files
  - Run `npm run build` inside `frontend/` to confirm TypeScript compilation succeeds after wiring endpoints to static data
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Refactor data-loading hooks
  - [ ] 4.1 Refactor `useClusters` to fetch from `/data/clusters.json`
    - Remove imports of `getClusters`, `getHealth`, `HealthStatus`; remove `setHealth` from the store subscription
    - Replace `Promise.all([getClusters(...), getHealth()])` with a single `fetch('/data/clusters.json')` call
    - Remove the `setInterval` polling; load once on mount
    - On error, set `error` to `'Unable to load cluster data'`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 4.2 Refactor `useParking` to fetch from static JSON files
    - Remove imports of `getParkingHotspots`, `getParkingPriorities`, `getParkingHeatmap`
    - Replace the three-way `Promise.all` with two parallel fetches: `fetch('/data/parking_hotspots.json')` and `fetch('/data/parking_temporal_heatmap.json')`
    - Call `setParkingHotspots` and `setParkingPriorities` with the same parsed hotspot array
    - Call `setParkingHeatmap` with the parsed heatmap array
    - Remove the `setInterval` polling; load once on mount
    - On error, set `error` to `'Unable to load parking data'`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 4.3 Delete `useSimulate.ts`
    - Remove the file `frontend/src/hooks/useSimulate.ts`
    - _Requirements: 4.7_

- [ ] 5. Create `staticData.ts` cache module
  - [ ] 5.1 Create `frontend/src/data/staticData.ts` with in-memory caches
    - Export `getViolationsData(): Promise<ViolationEntry[]>` — fetches `/data/parking_violations.json` once, caches in module-level variable
    - Export `getForecastsData(): Promise<RawForecastRow[]>` — fetches `/data/prophet_forecasts.json` once, caches in module-level variable
    - Export `getStaticForecasts(cluster_id: number): Promise<ForecastPoint[]>` — calls `getForecastsData()`, filters by `cluster_id`, maps fields: `date = row.ds`, `predicted = Number(row.yhat)`, `lower = Number(row.yhat_lower)`, `upper = Number(row.yhat_upper)`; returns `[]` when no match
    - _Requirements: 8.1, 8.2, 8.4, 9.1, 9.2, 9.4_

  - [ ]* 5.2 Write property test for in-memory violation/vehicle type lookup (Property 5)
    - **Property 5: In-memory violation and vehicle type lookup**
    - For any `cluster_id` present in the loaded data, returned arrays SHALL exactly match stored arrays; for absent IDs, both SHALL be empty
    - Use `fast-check` in Vitest with generated `ViolationEntry[]` inputs
    - **Validates: Requirements 8.1, 8.2, 8.4**

  - [ ]* 5.3 Write property test for forecast filter and field mapping (Property 6)
    - **Property 6: Forecast filter and field mapping**
    - For any `cluster_id`, `getStaticForecasts` SHALL return only matching rows with correct field mapping; no-match case returns `[]`
    - Use `fast-check` in Vitest with generated `RawForecastRow[]` inputs
    - **Validates: Requirements 9.1, 9.2, 9.4**

- [ ] 6. Refactor SimulatorPanel
  - [ ] 6.1 Remove `useSimulate` import and inline `runSimulation` function
    - Remove `import useSimulate from '../../hooks/useSimulate'`
    - Remove `import { deploy as deployApi } from '../../api/endpoints'`
    - Add inline pure function `runSimulation(cluster, numOfficers)` implementing the deterministic formula:
      - `violations_prevented = Math.round(cluster.violation_count * (0.12 + numOfficers * 0.08) * (cluster.risk_score / 100))`
      - `congestion_reduction_pct = Math.round(8 + numOfficers * 3.5)`
      - `revenue_inr = violations_prevented * 500`
      - `commuter_minutes_saved = violations_prevented * 4`
    - Replace `const { result, loading } = useSimulate(request)` with `const [simResult, setSimResult] = useState<SimulateResponse | null>(null)` and `const [hasRun, setHasRun] = useState(false)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 6.2 Write property test for deterministic simulation formula (Property 3)
    - **Property 3: Deterministic simulation formula**
    - For any `Cluster` and `numOfficers` in 1–5, `runSimulation` SHALL produce the exact values from the deterministic formula
    - Use `fast-check` in Vitest; generate arbitrary `Cluster` objects with `violation_count ≥ 0` and `risk_score` in `[0, 100]`
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**

  - [ ] 6.3 Add "Run Simulation" button, Demo Mode badge, and slider-reset behavior
    - Render "Run Simulation" button when `cluster !== null && !hasRun`; on click, call `runSimulation(cluster, numOfficers)`, store result in `simResult`, set `hasRun = true`
    - Add `useEffect` on `numOfficers`: when `hasRun`, clear `simResult` and reset `hasRun` to `false`
    - Render "Demo Mode — Results generated from historical analysis" badge below the results grid when `simResult !== null`
    - Update the results grid to read from `simResult` instead of the old `result` from `useSimulate`
    - Replace the "DEPLOY NOW" button's `onClick` to call `addDeployment(...)` and `selectCluster(null)` directly (no `deployApi` call)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Refactor TemporalAnalysis page
  - [ ] 7.1 Replace `getClusters` call with direct fetch from `clusters.json`
    - Remove `import { getClusters, getGeoHeatmapPoints, getHourlyPattern } from '../api/endpoints'`
    - Load clusters via `fetch('/data/clusters.json')` in a `useEffect` (or use `useAppStore` if clusters are already loaded by `useClusters`)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 7.2 Replace `getGeoHeatmapPoints` with derived computation from clusters array
    - Derive geo heatmap points inline: `clusters.map(c => [c.centroid_lat, c.centroid_lng, c.risk_score / 100])`
    - Remove the `loadPoints` async function and its `heatLoading` state
    - When `selectedId` changes, filter to the selected cluster's point or use all points for city-wide
    - Pass an empty array when clusters is empty
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 7.3 Write property test for GeoHeatmapPoints derivation (Property 4)
    - **Property 4: GeoHeatmapPoints derivation**
    - For any array of `Cluster` objects (including empty), the derived points SHALL equal `clusters.map(c => [c.centroid_lat, c.centroid_lng, c.risk_score / 100])`
    - Use `fast-check` in Vitest with generated cluster arrays
    - **Validates: Requirements 6.1, 6.3**

  - [ ] 7.4 Replace `getHourlyPattern` with fetch from `/data/temporal_hourly_city.json`
    - Replace `getHourlyPattern(id)` call with `fetch('/data/temporal_hourly_city.json')`
    - Parse result as `HourlyPoint[]` and set into `hourly` state
    - City-wide data is shown regardless of selected cluster (per design decision)
    - On fetch error, set `hourly` to `[]`
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 8. Refactor ZoneExplorer page
  - [ ] 8.1 Replace `getClusters`, `getViolationTypes`, `getVehicleTypes` with static data sources
    - Remove `import { getClusters, getViolationTypes, getVehicleTypes } from '../api/endpoints'`
    - Load clusters via `fetch('/data/clusters.json')` (or from app store via `useAppStore`)
    - Import `getViolationsData` from `../data/staticData`
    - In the `useEffect` for `selectedId`, call `getViolationsData()` and find the entry for `selectedId`; set `violTypes` and `vehTypes` from the entry's arrays (or `[]` if not found)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 8.2 Replace `getForecasts` call (if present) with `getStaticForecasts` from `staticData.ts`
    - Locate any call to `getForecasts(cluster_id)` in the codebase and replace with `getStaticForecasts(cluster_id)` from `../data/staticData`
    - Ensure field mapping: `date`, `predicted`, `lower`, `upper`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 9. Fix CommandCenter error state
  - [ ] 9.1 Replace "BACKEND UNAVAILABLE" error branch with "No data available"
    - Locate the `error && clusters.length === 0` branch in `CommandCenter.tsx`
    - Remove the `BACKEND UNAVAILABLE` heading and the `uvicorn` terminal command block
    - Replace with a simple centered `<div>` displaying `"No data available"` styled with `fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-dim)'`
    - Keep the existing loading indicator for the `loading && clusters.length === 0` branch unchanged
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 10. Checkpoint — full build and test pass
  - Run `npm run build` inside `frontend/` and confirm zero TypeScript errors
  - Run the Vitest test suite; confirm all non-optional unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Deployment verification (run before any cleanup)
  - [ ] 11.1 Local preview verification
    - From `frontend/`, run `npm run build` then `npm run preview`
    - Open `http://localhost:4173` and verify every route loads without errors:
      - `/` — Command Center: map renders, clusters appear, KPI strip shows real numbers
      - `/zones` — Zone Explorer: cluster selector works, violation/vehicle charts render with data
      - `/temporal` — Temporal Analysis: heatmap layer renders on map, hourly bar chart renders
      - `/parking` — Parking Dashboard: hotspot map renders, priorities panel loads
      - `/hotspots` — Hidden Hotspots: all three tabs (All, Known, Unmapped) show data
    - _Requirements: all_

  - [ ] 11.2 Simulator end-to-end verification
    - On the Command Center, click any Tier 1 zone from the map or priority queue
    - Adjust the officer slider to each value (1–5)
    - Click "Run Simulation" at each value and confirm results appear
    - Confirm "Demo Mode — Results generated from historical analysis" badge is visible
    - Confirm slider change clears results and re-shows the "Run Simulation" button
    - Confirm "Deploy Now" works locally (adds deployment to store, dismisses panel) without any network call
    - _Requirements: 4, 5_

  - [ ] 11.3 Network call verification
    - Open browser DevTools → Network tab
    - Navigate through all five routes
    - Run a simulation
    - Confirm zero requests to `localhost:8000`, `render.com`, or any `/api/*` path
    - Confirm only requests are to `/data/*.json` and CartoDB tile URLs
    - _Requirements: 2, 3, 4, 6, 7, 8, 9_

  - [ ] 11.4 Vercel build verification
    - Push to a Vercel-connected branch (or use `vercel --prod` CLI)
    - Confirm Vercel build completes without errors using the `buildCommand` in `vercel.json`
    - Confirm the deployed URL loads the Command Center with data on first visit
    - Confirm no 404s for `/data/*.json` assets on the deployed domain
    - _Requirements: 11_

---

## Phase 2 — Cleanup (after successful Vercel deployment and functional verification)

Do NOT perform these steps until Task 11 is fully verified on the live Vercel deployment.

The following files and directories are safe to remove after verification:
- `/backend/` — entire FastAPI backend directory
- `/models/` — all `.pkl` model files (~36MB total, dominated by `hdbscan_model.pkl` at 35.8MB)
- `/data/violations_clean.csv` — 50MB raw violations data (not needed after JSON conversion)
- `/data/violations_clustered.csv` — 52MB clustered violations data
- `/data/simulator_training_data.csv` — 1.2MB training data (retain until simulator results are verified correct)
- `/dataset/` — raw anonymized dataset directory
- `/render.yaml` — Render.com deployment config (no longer needed)

Expected size reduction after Phase 2 cleanup: **~140MB+**

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- The conversion script (`scripts/convert-data.js`) must be run once before the first build: `node scripts/convert-data.js` from the workspace root
- `api/client.ts` is left unchanged — axios stays in `package.json` and `client.ts`, it just won't be called
- `api/endpoints.ts` is redirected to static data, NOT gutted — any component that accidentally still calls an old endpoint gets real data back instead of a crash
- `data/simulator_training_data.csv` is retained until Task 11.2 (simulator verification) passes
- All backend, model, and dataset files are retained through Phase 1 — cleanup is Phase 2 after Vercel deployment is verified
- Property tests in tasks 1.3, 1.6, 5.2, 5.3, 6.2, 7.3 each target one of the six Correctness Properties from the design document
- Checkpoints (tasks 3 and 10) gate the two natural integration points in the work; Task 11 gates the cleanup phase

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.2"] },
    { "id": 2, "tasks": ["1.3", "1.5", "4.1", "4.2", "4.3"] },
    { "id": 3, "tasks": ["1.6", "5.1", "9.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1", "7.1", "8.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.2", "8.2"] },
    { "id": 6, "tasks": ["7.3", "7.4"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["11.4"] }
  ]
}
```
