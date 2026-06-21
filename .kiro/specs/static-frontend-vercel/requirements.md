# Requirements Document

## Introduction

Convert MargDristi from a full-stack deployment (FastAPI backend + React frontend) to a 100% static frontend deployable on Vercel. All live API calls are replaced with static JSON files pre-generated from CSVs in `/data/` and served from `/frontend/public/data/`. A Node.js conversion script produces these JSON files. The frontend simulation engine becomes a purely local, deterministic computation triggered by an explicit "Run Simulation" button. No backend files are deleted; only frontend integration code and deployment config change.

## Glossary

- **Static Frontend**: The React/Vite application in `/frontend/` that, after this change, has zero runtime API calls to any backend service.
- **Data JSON Files**: Pre-generated JSON files placed in `/frontend/public/data/` and served as static assets by Vite and Vercel.
- **Conversion Script**: The Node.js script at `scripts/convert-data.js` that reads `/data/*.csv` and writes the Data JSON Files.
- **useClusters Hook**: The React hook at `frontend/src/hooks/useClusters.ts` responsible for loading cluster data into the app store.
- **useParking Hook**: The React hook at `frontend/src/hooks/useParking.ts` responsible for loading parking hotspot and heatmap data.
- **useSimulate Hook**: The React hook at `frontend/src/hooks/useSimulate.ts` that previously called the backend simulation endpoint.
- **SimulatorPanel**: The React component at `frontend/src/components/panels/SimulatorPanel.tsx` that displays simulation controls and results.
- **CommandCenter**: The page component at `frontend/src/pages/CommandCenter.tsx` that is the main operational view.
- **Deterministic Formula**: The local simulation computation: `violations_prevented = round(violation_count × (0.12 + officers × 0.08) × (risk_score / 100))`, `congestion_reduction_pct = round(8 + officers × 3.5)`, `revenue_inr = violations_prevented × 500`, `commuter_minutes_saved = violations_prevented × 4`.
- **GeoHeatmapPoints**: An array of `[lat, lng, intensity]` triples derived from cluster data for map heatmap rendering.
- **clusters.json**: Data JSON File derived from `cluster_metadata.csv`, containing an array of Cluster objects.
- **parking_hotspots.json**: Data JSON File derived from `parking_hotspots.csv`.
- **parking_temporal_heatmap.json**: Data JSON File derived from `parking_temporal_heatmap.csv`.
- **temporal_hourly_city.json**: Data JSON File derived from `temporal_hourly_city.csv`.
- **prophet_forecasts.json**: Data JSON File derived from `prophet_forecasts.csv`.
- **parking_violations.json**: Data JSON File derived from `parking_violations.csv`, used to derive per-cluster violation type and vehicle type breakdowns.

---

## Requirements

### Requirement 1 — Data Conversion Script

**User Story:** As a developer, I want a Node.js script that converts all required CSVs to JSON, so that the static frontend has pre-built data files ready before deployment.

#### Acceptance Criteria

1. THE Conversion Script SHALL read `cluster_metadata.csv` and write `clusters.json` as an array of objects preserving all columns (`cluster_id`, `zone_name`, `centroid_lat`, `centroid_lng`, `violation_count`, `total_cis`, `avg_cis`, `peak_hour`, `top_vehicle`, `top_violation`, `tier`, `risk_score`).
2. THE Conversion Script SHALL read `parking_hotspots.csv` and write `parking_hotspots.json` as an array of objects preserving all columns.
3. THE Conversion Script SHALL read `parking_temporal_heatmap.csv` and write `parking_temporal_heatmap.json` as an array of day-row objects with `day` string and 24 numeric hour fields (`hour_0` through `hour_23`).
4. THE Conversion Script SHALL read `temporal_hourly_city.csv` and write `temporal_hourly_city.json` as an array of `{ hour, count }` objects.
5. THE Conversion Script SHALL read `prophet_forecasts.csv` and write `prophet_forecasts.json` as an array of `{ ds, yhat, yhat_lower, yhat_upper, cluster_id }` objects.
6. THE Conversion Script SHALL read `parking_violations.csv` and write `parking_violations.json` grouped by `cluster_id`, where each entry contains `cluster_id` and two arrays: `violation_types` (top 5 `{ violation_type, count }` sorted descending by count) and `vehicle_types` (top 5 `{ vehicle_type, count, pct }` sorted descending by count).
7. THE Conversion Script SHALL write all output JSON files to `frontend/public/data/`.
8. WHEN the Conversion Script is executed with Node.js, THE Conversion Script SHALL complete without error when all source CSVs exist in `/data/`.
9. IF a source CSV file is not found, THEN THE Conversion Script SHALL print an error message identifying the missing file and exit with a non-zero exit code.

---

### Requirement 2 — useClusters Hook Refactor

**User Story:** As a frontend developer, I want `useClusters` to load cluster data from a static JSON file, so that no backend health check or API call is needed.

#### Acceptance Criteria

1. WHEN the useClusters Hook initialises, THE useClusters Hook SHALL fetch `/data/clusters.json` using the browser Fetch API.
2. WHEN the fetch of `clusters.json` succeeds, THE useClusters Hook SHALL call `setClusters` with the parsed array of Cluster objects.
3. THE useClusters Hook SHALL NOT call `getHealth` or any endpoint from `api/endpoints.ts`.
4. THE useClusters Hook SHALL NOT set up a polling interval; data SHALL be loaded once on mount.
5. IF the fetch of `clusters.json` fails, THEN THE useClusters Hook SHALL set the error state to `'Unable to load cluster data'`.

---

### Requirement 3 — useParking Hook Refactor

**User Story:** As a frontend developer, I want `useParking` to load parking data from static JSON files, so that no backend parking API endpoints are called.

#### Acceptance Criteria

1. WHEN the useParking Hook initialises, THE useParking Hook SHALL fetch `/data/parking_hotspots.json` using the browser Fetch API.
2. WHEN the fetch of `parking_hotspots.json` succeeds, THE useParking Hook SHALL call `setParkingHotspots` and `setParkingPriorities` with the parsed array (both receive the same hotspot array).
3. WHEN the useParking Hook initialises, THE useParking Hook SHALL fetch `/data/parking_temporal_heatmap.json` using the browser Fetch API.
4. WHEN the fetch of `parking_temporal_heatmap.json` succeeds, THE useParking Hook SHALL call `setParkingHeatmap` with the parsed heatmap array.
5. THE useParking Hook SHALL NOT call any endpoint from `api/endpoints.ts`.
6. THE useParking Hook SHALL NOT set up a polling interval; data SHALL be loaded once on mount.
7. IF either fetch fails, THEN THE useParking Hook SHALL set the error state to `'Unable to load parking data'`.

---

### Requirement 4 — useSimulate Hook Removal

**User Story:** As a frontend developer, I want `useSimulate` removed and replaced with a local deterministic computation, so that simulation results are generated client-side without any network call.

#### Acceptance Criteria

1. THE codebase SHALL NOT contain any call to the `simulate` function from `api/endpoints.ts` after this change.
2. THE SimulatorPanel SHALL expose a function `runSimulation(cluster, numOfficers)` that computes simulation results using the Deterministic Formula entirely in-memory.
3. WHEN `runSimulation` is invoked, THE SimulatorPanel SHALL compute `violations_prevented` as `Math.round(cluster.violation_count × (0.12 + numOfficers × 0.08) × (cluster.risk_score / 100))`.
4. WHEN `runSimulation` is invoked, THE SimulatorPanel SHALL compute `congestion_reduction_pct` as `Math.round(8 + numOfficers × 3.5)`.
5. WHEN `runSimulation` is invoked, THE SimulatorPanel SHALL compute `revenue_inr` as `violations_prevented × 500`.
6. WHEN `runSimulation` is invoked, THE SimulatorPanel SHALL compute `commuter_minutes_saved` as `violations_prevented × 4`.
7. THE `useSimulate.ts` file SHALL be removed from the codebase.

---

### Requirement 5 — SimulatorPanel UI Changes

**User Story:** As a user, I want to explicitly trigger simulation runs and see a demo mode badge, so that it is clear results are generated from historical analysis rather than live inference.

#### Acceptance Criteria

1. THE SimulatorPanel SHALL display a "Run Simulation" button when a cluster is selected and simulation results have not yet been computed for the current officer count.
2. WHEN the "Run Simulation" button is clicked, THE SimulatorPanel SHALL invoke `runSimulation` and display the computed results in the existing results grid.
3. WHEN simulation results are displayed, THE SimulatorPanel SHALL render a badge with the text "Demo Mode — Results generated from historical analysis".
4. THE SimulatorPanel SHALL NOT call `deployApi` from `api/endpoints.ts`; the Deploy Now action SHALL call `addDeployment` locally and navigate away without any network request.
5. WHEN the officer count slider is changed after a simulation has been run, THE SimulatorPanel SHALL clear the displayed results and require the user to press "Run Simulation" again.

---

### Requirement 6 — GeoHeatmapPoints Derivation from clusters.json

**User Story:** As a developer, I want geo heatmap points derived from the already-loaded clusters.json data, so that no separate API endpoint is called for the map heatmap layer.

#### Acceptance Criteria

1. THE frontend SHALL derive GeoHeatmapPoints by mapping each Cluster in the loaded clusters array to `[centroid_lat, centroid_lng, risk_score / 100]`.
2. THE frontend SHALL NOT call `getGeoHeatmapPoints` from `api/endpoints.ts` after this change.
3. WHEN the clusters array is empty, THE frontend SHALL pass an empty array as GeoHeatmapPoints to the map component.

---

### Requirement 7 — getHourlyPattern Refactor

**User Story:** As a developer, I want hourly pattern data fetched from a static JSON file, so that temporal analysis works without a backend.

#### Acceptance Criteria

1. WHEN the temporal hourly pattern is requested, THE frontend SHALL fetch `/data/temporal_hourly_city.json` using the browser Fetch API.
2. WHEN the fetch succeeds, THE frontend SHALL pass the parsed `{ hour, count }[]` array to the chart or panel consuming hourly data.
3. THE frontend SHALL NOT call `getHourlyPattern` from `api/endpoints.ts` after this change.

---

### Requirement 8 — getViolationTypes and getVehicleTypes Refactor

**User Story:** As a developer, I want violation type and vehicle type breakdowns derived from the static parking_violations.json, so that per-cluster analytics work without API calls.

#### Acceptance Criteria

1. WHEN per-cluster violation type data is needed, THE frontend SHALL read the pre-aggregated `violation_types` array for that `cluster_id` from the in-memory parsed `parking_violations.json`.
2. WHEN per-cluster vehicle type data is needed, THE frontend SHALL read the pre-aggregated `vehicle_types` array for that `cluster_id` from the in-memory parsed `parking_violations.json`.
3. THE frontend SHALL NOT call `getViolationTypes` or `getVehicleTypes` from `api/endpoints.ts` after this change.
4. IF a `cluster_id` is not present in `parking_violations.json`, THEN THE frontend SHALL return an empty array for both violation types and vehicle types.

---

### Requirement 9 — getForecasts Refactor

**User Story:** As a developer, I want forecast data fetched from a static JSON file, so that the forecast chart works without a backend.

#### Acceptance Criteria

1. WHEN forecast data is requested for a `cluster_id`, THE frontend SHALL fetch `/data/prophet_forecasts.json` and filter the results by the requested `cluster_id`.
2. WHEN the fetch succeeds and matching rows exist, THE frontend SHALL return the filtered array as `ForecastPoint[]` objects with fields `date` (mapped from `ds`), `predicted` (mapped from `yhat`), `lower` (mapped from `yhat_lower`), and `upper` (mapped from `yhat_upper`).
3. THE frontend SHALL NOT call `getForecasts` from `api/endpoints.ts` after this change.
4. IF no forecast rows match the requested `cluster_id`, THEN THE frontend SHALL return an empty array.

---

### Requirement 10 — CommandCenter Error State

**User Story:** As a user, I want the CommandCenter to show a graceful empty state instead of a terminal command when data is unavailable, so that the UI looks polished in production.

#### Acceptance Criteria

1. THE CommandCenter SHALL NOT display the string `"BACKEND UNAVAILABLE"` or any terminal command instruction (such as `uvicorn`) in its UI.
2. IF the clusters array is empty after a failed load, THEN THE CommandCenter SHALL display a message reading "No data available" in place of the main content.
3. WHILE the clusters data is loading for the first time, THE CommandCenter SHALL display a loading indicator.

---

### Requirement 11 — Vercel Configuration

**User Story:** As a developer, I want `vercel.json` to contain only the static build config without API rewrites, so that Vercel deploys only the frontend.

#### Acceptance Criteria

1. THE `vercel.json` file SHALL contain a `buildCommand` field set to `"cd frontend && npm install && npm run build"`.
2. THE `vercel.json` file SHALL contain an `outputDirectory` field set to `"frontend/dist"`.
3. THE `vercel.json` file SHALL NOT contain a `rewrites` array or any entry that proxies `/api/*` to an external service.

---

### Requirement 12 — API Module Stubs

**User Story:** As a developer, I want `api/client.ts` and `api/endpoints.ts` gutted to stubs so they no longer import axios or make HTTP calls, while remaining importable to avoid breaking any residual type references during transition.

#### Acceptance Criteria

1. THE `api/client.ts` file SHALL export a stub that does not import or configure axios.
2. THE `api/endpoints.ts` file SHALL export all previously exported function names as no-op stubs that throw an error with the message `"Static mode: endpoint not available"` if called.
3. THE frontend build SHALL succeed without errors after both files are replaced with stubs.
