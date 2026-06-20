# Requirements Document

## Introduction

MargDristi is a traffic intelligence platform used by Bengaluru Traffic Police (BTP). The current frontend is an analytics dashboard that tells officers _what happened_. This upgrade transforms MargDristi into a **Traffic Operations Command Center** — shifting from descriptive analytics to actionable decision intelligence that answers _what should the officer do next_.

The upgrade adds nine cohesive features across the existing FastAPI + React/TypeScript stack, following the existing dark cyber/command-center design language. Every new component adheres to the four-stage intelligence pipeline: **Detection → Explanation → Recommendation → Action**. No existing functionality is removed or redesigned.

---

## Glossary

- **Action_Recommendation_Panel**: A UI panel attached to each hotspot entry that surfaces risk tier, deployment parameters, and predicted enforcement outcomes to guide officer decisions.
- **AI_Discoveries_Page**: A new frontend page (route `/discoveries`) listing HDBSCAN-detected violation clusters that do not correspond to any registered BTP junction.
- **Command_Queue**: A priority-ordered operational table on the Command Center page replacing the legacy hotspot ranking list. Each row is an actionable work item.
- **Confidence_Score**: A numeric value (0–100) computed from the density and recurrence of training-data evidence that underlies a given prediction or recommendation.
- **CIS**: Congestion Impact Score — an existing numerical measure of how severely a cluster affects traffic flow.
- **Cluster**: An HDBSCAN-derived geographic group of violations sharing spatial proximity. Identified by `cluster_id`.
- **Explainability_Panel**: A collapsible side panel showing a quantitative breakdown of factors driving a hotspot's risk ranking.
- **Forecasting_Layer**: A visual overlay on the Temporal Analysis page (and optionally the map) that extends historical hourly violation charts with a 6-hour and 24-hour predicted window.
- **Hidden_Hotspot**: A cluster detected algorithmically from GPS data that is not listed in BTP's official junction registry.
- **KPI_Header**: The operational KPI strip at the top of the Command Center page, upgraded to show live operational counts rather than static dataset metrics.
- **MIS**: Multi-violation Interaction Score — an existing measure of how many different violation types co-occur in a cluster.
- **Officer_Operations_View**: A card-based alert section showing unresolved operational issues such as uncovered high-risk zones or overdue deployments.
- **Prophet_Model**: A time-series forecasting model (Facebook Prophet) already trained per cluster and loaded in `backend/ml/loader.py`.
- **Risk_Tier**: One of three ordered severity levels — Tier 1 (critical), Tier 2 (elevated), Tier 3 (routine) — already computed and stored in `cluster_metadata.csv`.
- **Simulator**: The existing enforcement simulator in `SimulatorPanel.tsx` backed by `/api/enforcement/simulate`.
- **Zone_Name**: The human-readable label for a cluster, sourced from `cluster_metadata.csv`.

---

## Requirements

### Requirement 1: Action Recommendation Panel

**User Story:** As a traffic officer, I want to see concrete deployment guidance for each hotspot, so that I can act immediately without manually interpreting raw statistics.

#### Acceptance Criteria

1. WHEN a hotspot is selected on the Command Center map or Command Queue, THE Action_Recommendation_Panel SHALL display the hotspot's Risk Tier, recommended number of officers, recommended deployment time window, predicted violations prevented, predicted congestion reduction percentage, and Confidence Score.
2. THE Action_Recommendation_Panel SHALL derive recommended officer count and deployment window from the existing simulator model using the hotspot's peak hour and historical violation count, without requiring any additional user input.
3. WHEN the Confidence Score for a recommendation is below 50, THE Action_Recommendation_Panel SHALL display a visual low-confidence indicator alongside the score.
4. THE Action_Recommendation_Panel SHALL display all six data fields simultaneously in a single visible panel without requiring scrolling within the panel itself.
5. WHEN no cluster is selected, THE Action_Recommendation_Panel SHALL display a prompt instructing the officer to select a zone from the map or Command Queue.

---

### Requirement 2: Explainability Panel

**User Story:** As a traffic officer, I want to understand why a hotspot is ranked high priority, so that I can justify deployment decisions and trust the system's recommendations.

#### Acceptance Criteria

1. WHEN an officer activates the Explainability Panel for a hotspot, THE Explainability_Panel SHALL display contribution scores for four factors: Violation Density, Historical Recurrence, Vehicle Impact, and Multi-Violation Rate (MIS).
2. THE Explainability_Panel SHALL render each factor's contribution as a proportional horizontal bar chart where bar widths sum to 100% of the total risk score.
3. THE Explainability_Panel SHALL render a donut chart showing the same four-factor breakdown as a proportional arc chart.
4. WHEN an officer hovers over a factor bar or arc segment, THE Explainability_Panel SHALL display a tooltip with the factor name, numeric contribution value, and a one-sentence plain-language explanation.
5. THE Explainability_Panel SHALL be accessible on the Command Center page, Zone Explorer page, and Parking Intelligence page.
6. THE Explainability_Panel SHALL be collapsible: WHEN collapsed, THE Explainability_Panel SHALL occupy no visible space; WHEN expanded, THE Explainability_Panel SHALL overlay or push adjacent content to remain fully visible.
7. WHEN explainability data for a hotspot is not available, THE Explainability_Panel SHALL display a "Explainability data unavailable" message instead of empty charts.

---

### Requirement 3: Hidden Hotspot Discovery Page

**User Story:** As a traffic officer, I want to discover algorithmically detected violation clusters that are not official BTP junctions, so that I can act on emerging hotspots before they are formally registered.

#### Acceptance Criteria

1. THE AI_Discoveries_Page SHALL be reachable from the NavBar as a fifth navigation entry labelled "AI Discoveries" at route `/discoveries`.
2. THE AI_Discoveries_Page SHALL display two clearly labelled sections: "Known Junction Hotspots" (clusters matching a BTP junction record) and "AI Discovered Hotspots" (clusters with no matching junction record).
3. FOR EACH entry in the "AI Discovered Hotspots" section, THE AI_Discoveries_Page SHALL display: Cluster Size (number of violations), Density (violations per square kilometre), MIS score, Risk Rank (position by risk score across all clusters), and Persistence (number of weeks the cluster was active).
4. FOR EACH entry in the "AI Discovered Hotspots" section, THE AI_Discoveries_Page SHALL display an "AI DISCOVERED" badge rendered in cyan with a distinct border.
5. WHEN an officer clicks an AI Discovered Hotspot entry, THE AI_Discoveries_Page SHALL navigate the map view to the cluster centroid at zoom level 15.
6. THE AI_Discoveries_Page SHALL preserve the existing NavBar and dark cyber visual style without introducing new colour variables or typefaces.
7. WHEN the backend returns zero AI discovered hotspots, THE AI_Discoveries_Page SHALL display an empty-state message stating "No hidden hotspots detected at this time."

---

### Requirement 4: Forecasting Layer

**User Story:** As a traffic officer, I want to see predicted violation activity for the next 6 and 24 hours overlaid on existing temporal charts, so that I can anticipate peak windows and pre-position officers.

#### Acceptance Criteria

1. WHEN a cluster or city-wide view is loaded on the Temporal Analysis page, THE Forecasting_Layer SHALL overlay predicted hourly violation counts for the next 6 hours as a distinct visual series on the existing hourly bar chart.
2. THE Forecasting_Layer SHALL render historical data bars in blue (`var(--blue)`) and predicted data bars or line segments in cyan (`var(--cyan)`) to visually distinguish forecast from actuals.
3. THE Forecasting_Layer SHALL display a forecast confidence band (lower and upper bounds) as a shaded region around predicted values.
4. WHEN a Prophet model exists for the selected cluster, THE Forecasting_Layer SHALL source predicted values from the existing `/api/forecasts/{cluster_id}` endpoint; WHEN no model exists, THE Forecasting_Layer SHALL display a "Forecast unavailable for this zone" notice.
5. THE Forecasting_Layer SHALL include a chart legend entry labelled "Predicted" in cyan alongside the existing "Normal" and "Blindspot" legend entries.
6. WHEN the forecast data is loading, THE Forecasting_Layer SHALL display a loading indicator matching the existing `IBM Plex Mono` loading style used elsewhere in the application.
7. THE Forecasting_Layer SHALL NOT remove or alter the existing blindspot highlighting (hours 12–17) or the peak hour annotation.

---

### Requirement 5: Command Queue

**User Story:** As a traffic officer, I want a prioritised action queue replacing the hotspot ranking table, so that I can work through deployment tasks in order of operational urgency.

#### Acceptance Criteria

1. THE Command_Queue SHALL replace the existing priority panel (`PriorityPanel.tsx`) on the Command Center page with a table containing the columns: Rank, Hotspot, Risk Tier, Peak Time, Officers Needed, Expected Impact, and Recommended Action.
2. THE Command_Queue SHALL sort rows by risk score descending by default, with Tier 1 clusters always ranked above Tier 2, and Tier 2 above Tier 3.
3. FOR EACH row, THE Command_Queue SHALL provide three action buttons: "Deploy Now", "Schedule", and "View Reasoning".
4. WHEN an officer clicks "Deploy Now" on a Command Queue row, THE Command_Queue SHALL trigger the existing deploy API call (`/api/enforcement/deploy`) for that cluster with the recommended officer count, and update the deployment state without navigating away from the Command Center.
5. WHEN an officer clicks "Schedule" on a Command Queue row, THE Command_Queue SHALL open the existing time-slot scheduling interface for that cluster inline within the right-side panel.
6. WHEN an officer clicks "View Reasoning" on a Command Queue row, THE Command_Queue SHALL expand the Explainability Panel for that cluster.
7. THE Command_Queue SHALL visually distinguish Tier 1 rows with a red left border, Tier 2 rows with an amber left border, and Tier 3 rows with a green left border, matching the existing `TIER_COLOR` mapping.
8. WHEN the clusters list is empty or loading, THE Command_Queue SHALL display an appropriate loading or empty state matching the existing application style.

---

### Requirement 6: Simulator Credibility Section

**User Story:** As a traffic officer, I want to understand how the simulator's estimates were calculated, so that I can trust the numbers and explain them to supervisors.

#### Acceptance Criteria

1. THE Simulator SHALL include a collapsible "How was this estimated?" section displayed below the simulation results grid in `SimulatorPanel.tsx`.
2. WHEN expanded, the credibility section SHALL display four basis statements: historical hotspot density context, the MIS score used, similar hotspot pattern reference, and peak-hour recurrence rate for the selected cluster.
3. THE Simulator SHALL display the Confidence Score for the current simulation result as a numeric value (0–100) with a colour-coded label: green for 70–100, amber for 40–69, and red for 0–39.
4. THE Simulator SHALL NOT display any percentage result (prevention rate, congestion reduction) without the credibility section being available to explain its derivation.
5. WHEN the selected cluster has insufficient historical data to compute basis statements, THE Simulator SHALL display "Insufficient data for full explanation" in the credibility section rather than leaving fields blank.

---

### Requirement 7: Officer Operations View

**User Story:** As a traffic officer, I want to see a list of unresolved operational alerts — such as uncovered zones or approaching peaks — so that I can triage and respond before incidents occur.

#### Acceptance Criteria

1. THE Officer_Operations_View SHALL display operational alert cards within the Command Center page, positioned below the Command Queue in the right-side panel.
2. THE Officer_Operations_View SHALL generate alert cards for the following conditions: (a) A Tier 1 cluster has no recorded deployment in the current session; (b) A cluster's peak hour is within 60 minutes of the current local time; (c) A previously scheduled deployment's scheduled time has passed without being marked complete; (d) A Tier 1 cluster has been in the cluster list for the current session without any deployment or schedule action.
3. EACH alert card SHALL display: alert type label, affected zone name, a brief action prompt, and a coloured left border matching the alert urgency (red for no-officer and overdue, amber for upcoming peak).
4. WHEN an officer clicks an alert card, THE Officer_Operations_View SHALL select the corresponding cluster on the map and open the Action Recommendation Panel for that cluster.
5. WHEN no alert conditions are met, THE Officer_Operations_View SHALL display a "All zones covered" confirmation message in green.
6. THE Officer_Operations_View SHALL update alert states reactively as deployments and schedules are recorded, without requiring a page reload.

---

### Requirement 8: Command Center KPI Header Upgrade

**User Story:** As a traffic officer, I want the top KPI strip to show live operational counts instead of static dataset totals, so that I can assess the current operational situation at a glance.

#### Acceptance Criteria

1. THE KPI_Header SHALL replace the current five KPI cells in `KPIStrip.tsx` with: Active High-Risk Zones (Tier 1 count not yet deployed), Unassigned Hotspots (Tier 1 + Tier 2 clusters without a recorded deployment), Upcoming Peak Events (clusters whose peak hour falls within the next 2 hours), Recommended Deployments (count of Command Queue rows with no action taken), and System Status (online/degraded indicator).
2. WHEN the Active High-Risk Zones count is greater than zero, THE KPI_Header SHALL render that cell's value in red (`var(--tier1)`).
3. WHEN the Unassigned Hotspots count is greater than zero, THE KPI_Header SHALL render that cell's value in amber (`var(--tier2)`).
4. THE KPI_Header SHALL update its counts reactively whenever a deployment or schedule is recorded in the application state, without requiring a page reload.
5. THE KPI_Header SHALL maintain the existing five-cell layout, border separators, `IBM Plex Mono` font for values, and `DM Sans` font for labels.

---

### Requirement 9: Map Layer Controls

**User Story:** As a traffic officer, I want to toggle independent map layers on the Command Center map, so that I can focus on the data most relevant to my current task.

#### Acceptance Criteria

1. THE Map_Layer_Controls SHALL provide five toggleable layers on the Command Center map: Risk Layer (cluster markers colour-coded by tier), Impact Layer (CIS-weighted heatmap overlay), Forecast Layer (predicted next-peak zone highlights), Hidden Hotspots Layer (AI-discovered cluster markers), and Junction Layer (official BTP junction point markers).
2. WHEN a layer is toggled off, THE Map_Layer_Controls SHALL immediately hide all visual elements belonging to that layer without affecting other layers or requiring a data reload.
3. WHEN a layer is toggled on, THE Map_Layer_Controls SHALL immediately render that layer's visual elements using data already loaded in the application state.
4. THE Map_Layer_Controls SHALL render as pill-shaped toggle buttons anchored to the bottom-left of the map canvas, consistent with the existing tier filter chips in `CommandCenter.tsx`.
5. WHEN more than one layer is active simultaneously, THE Map_Layer_Controls SHALL render layers in a defined z-index stacking order: Junction Layer (bottom), Risk Layer, Impact Layer, Hidden Hotspots Layer, Forecast Layer (top), to prevent visual occlusion of actionable markers.
6. THE existing Tier filter chips (Tier 1 / Tier 2 / Tier 3) and "Show all" toggle SHALL be preserved and operate independently of the new layer controls.
7. WHEN the Hidden Hotspots Layer is toggled on but no hidden hotspot data has been loaded, THE Map_Layer_Controls SHALL display a brief inline notice "No hidden hotspot data" without disrupting other layers.
