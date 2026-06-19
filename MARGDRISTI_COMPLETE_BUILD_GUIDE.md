# MARGDRISTI
## Zero to Prototype — Complete Build Guide
### AI Enforcement Command Center for Bengaluru Traffic Police

Everything you need is in this one file. Follow it top to bottom, one step at a time.
No deadlines. No timelines. Just: do this, then do this, then do this.

---

# WHAT WE ARE BUILDING

MargDristi is a full-stack AI application that:
1. Clusters 298,450 parking violation GPS records into hotspot zones using DBSCAN
2. Scores each zone by its actual traffic impact (Congestion Impact Score)
3. Predicts when each zone will peak using Prophet time-series forecasting
4. Simulates enforcement outcomes (deploy N officers → see violations prevented)
5. Displays everything in a dark, serious command center dashboard

**Stack:**
- Data + Training: Python (Kaggle notebooks)
- Backend: Python FastAPI
- Frontend: React + TypeScript + Tailwind CSS
- Database: SQLite (for prototype, no setup needed)
- Map: Leaflet.js
- Charts: Recharts

---

# PART 1: UI DESIGN SYSTEM
## My Decisions — Do Not Change These

I am making all design decisions here. This is the design foundation that goes into Copilot before any code is written. These choices are made specifically for a government traffic enforcement interface, not a startup dashboard.

### Why This Design Direction

Real police and government control rooms (ISRO mission control, traffic operations centers, police dispatch) share these characteristics: very dark backgrounds that reduce eye strain during 12-hour shifts, color used only for meaning (not aesthetics), numbers that dominate the visual hierarchy, zero decorative elements, dense information without clutter. That is exactly what we are building.

The one signature element unique to MargDristi: every risk score (0–100) pulses with a subtle animation on data refresh, like a radar sweep. It ties the interface back to real enforcement operations.

---

### Color Palette (Final)

```css
:root {
  /* Backgrounds */
  --bg-base:       #06080F;   /* The deepest layer. Almost black with a blue tint. */
  --bg-surface:    #0C1221;   /* Cards, panels. Slightly lighter than base. */
  --bg-elevated:   #111C30;   /* Hovered state, active rows, dropdowns. */

  /* Borders */
  --border:        #1A2840;   /* Default borders. Barely visible, structural only. */
  --border-active: #2A4080;   /* Focused input, selected row. */

  /* Brand & Action */
  --blue:          #1E6FFF;   /* Primary action. Buttons. Links. Selected state. */
  --blue-dim:      #0D3580;   /* Button hover background. */

  /* Data Colors (used only for data values, not decoration) */
  --cyan:          #00C8FF;   /* KPI numbers. Live violation counts. Forecasts. */
  --purple:        #9B72FF;   /* CIS Score. This is our signature metric. Unique color. */

  /* Alert Tiers (match traffic signal logic — officers instantly recognize) */
  --tier1:         #FF3B3B;   /* Tier 1 cluster. DEPLOY NOW. */
  --tier2:         #FF9500;   /* Tier 2 cluster. HIGH PRIORITY. */
  --tier3:         #00C853;   /* Tier 3 cluster. MONITOR. */

  /* Typography */
  --text:          #E8EDF5;   /* All primary text. */
  --text-dim:      #6B7A99;   /* Labels, metadata, secondary. */
  --text-faint:    #3A4A66;   /* Placeholders, disabled state. */
}
```

**Color rules:**
- `--cyan` is for any live data number (violation counts, forecasts, KPIs)
- `--purple` is ONLY for CIS score (makes it memorable as our unique metric)
- `--tier1/2/3` is for cluster status only. Never use red for anything that isn't Tier 1.
- `--blue` is for anything the user can click (buttons, tabs)
- Everything else is gray text on dark backgrounds

---

### Typography (Final)

Two fonts only. Both from Google Fonts (free, no license issues).

**Font 1 — DM Sans:** All UI text. Labels, headings, station names, descriptions.
Why DM Sans: It reads clearly at 12px and 24px. Not corporate-sterile. Not decorative. Exactly between "government form" and "modern interface." Used in actual BBMP digital initiatives.

**Font 2 — IBM Plex Mono:** ALL numbers. Risk scores, violation counts, CIS values, timestamps, coordinates.
Why IBM Plex Mono: IBM designed this specifically for data-dense interfaces. The numbers are wide enough to read at a glance. Zero ambiguity between 0 and O, 1 and I. The monospace alignment makes tables read instantly.

**Scale:**
```
--text-xs:    11px / DM Sans / --text-dim     → metadata, timestamps
--text-sm:    13px / DM Sans / --text         → table rows, labels
--text-base:  14px / DM Sans / --text         → body text, descriptions
--text-lg:    16px / DM Sans / 600 weight     → card titles, section headers
--text-xl:    20px / DM Sans / 700 weight     → page headers
--text-data:  13px / IBM Plex Mono / --cyan   → all data values
--text-kpi:   32px / IBM Plex Mono / --cyan   → KPI numbers on command center
--text-score: 28px / IBM Plex Mono / --purple → CIS/risk score displays
```

---

### Component Rules (Follow These Exactly in Copilot)

**Cards:**
- Background: `--bg-surface`
- Border: 1px left accent border (colored by tier, or `--blue` for neutral)
- Border-radius: 0 (zero. everywhere. sharp corners.)
- Padding: 16px

**Buttons:**
- Height: 36px minimum (44px for primary CTA)
- Border-radius: 0
- No shadows
- Primary: background `--blue`, text white, hover `--blue-dim`
- Ghost: transparent background, 1px border `--border-active`, text `--blue`

**Tables:**
- Header: `--bg-elevated` background, `--text-dim` text, uppercase 11px DM Sans
- Rows: alternating `--bg-surface` and `--bg-elevated` (barely different)
- Left border on rows: 2px, colored by tier (red/amber/green)
- Numbers: IBM Plex Mono, right-aligned
- Hover: background shifts to `--bg-elevated`

**Badges:**
- No border-radius (pill shapes look startup-ish, avoid)
- Small rectangle: 4px 8px padding
- Text: 11px DM Sans uppercase
- Tier 1: `--tier1` background, white text
- Tier 2: `--tier2` background, white text
- Tier 3: `--tier3` background, white text

**Input / Select:**
- Background: `--bg-elevated`
- Border: 1px `--border`
- On focus: border `--blue`
- Text: `--text`
- Height: 36px

**Numbers / KPIs:**
- Always IBM Plex Mono
- Always `--cyan` color (unless it's a CIS score → `--purple`)
- No units inline with the large number (put units in smaller text below or beside)

---

### Layout (Three Views, That's It)

Prototype needs exactly three views. Not seven. Three done excellently.

**View 1: Command Center (Home)**
```
┌──────────────────────────────────────────────────────────────────────┐
│ NAV BAR (48px)                                                       │
│ [MARGDRISTI logo] [Command] [Zone Explorer] [Temporal]  [Station ▼]  │
├──────────────────────────────────────────────────────────────────────┤
│ KPI STRIP (80px) — 6 metrics across                                  │
│  ACTIVE TIER 1  │ VIOLATIONS TODAY │ PEAK IN  │ COVERAGE │ TOP ZONE  │
│    4             │     1,247         │  35 MIN  │  87%     │ SAFINA    │
├────────────────────────────────┬─────────────────────────────────────┤
│                                │  PRIORITY PANEL (scrollable)         │
│         MAP                    │  ──────────────────────────────────  │
│         (65% width)            │  # │ ZONE              │ RISK │ PEAK │
│                                │  1 │ Safina Plaza      │  94  │ 10AM │
│  Cluster polygons:             │  2 │ KR Market         │  89  │ 4PM  │
│  Red = Tier 1                  │  3 │ Elite Junction    │  84  │ 11AM │
│  Amber = Tier 2                │  ...                                 │
│  Green = Tier 3                │  ──────────────────────────────────  │
│                                │  SIMULATOR (appears on row click)    │
│  Heatmap overlay               │  Zone: Safina Plaza                  │
│  Officer dots (blue)           │  Predicted: 156 violations           │
│                                │  Deploy: ●────────── 3 officers      │
│                                │  Prevented:  65  (42%)               │
│                                │  Congestion: ↓31%                    │
│                                │  Revenue:    ₹32,500                 │
│                                │  [DEPLOY NOW]  [SCHEDULE]            │
├──────────────────────────────────────────────────────────────────────┤
│ ALERT STRIP (36px) — scrolling ticker                                 │
│ 🔴 Safina Plaza entering peak (10:15 AM)  │  🟠 KR Market: no officer │
└──────────────────────────────────────────────────────────────────────┘
```

**View 2: Zone Explorer**
```
┌────────────────────────────────────────────────────────────────┐
│ NAV BAR                                                        │
├────────────────────────────────────────────────────────────────┤
│ ZONE SELECTOR DROPDOWN                                         │
├────────────────────────────────────────────────────────────────┤
│ CLUSTER STATS (cards in a row)                                 │
│  CIS Score   │ Violations │ Rank  │ Peak Hour │ Top Vehicle    │
│  847 (purple)│ 15,449     │ #1    │ 10:00 AM  │ Scooter (35%) │
├────────────────────────────────────────────────────────────────┤
│ VIOLATION TYPE BREAKDOWN │ VEHICLE TYPE BREAKDOWN             │
│ (horizontal bar chart)   │ (horizontal bar chart)             │
├────────────────────────────────────────────────────────────────┤
│ MINI-MAP of this cluster only (GPS heatmap)                    │
└────────────────────────────────────────────────────────────────┘
```

**View 3: Temporal Analysis**
```
┌────────────────────────────────────────────────────────────────┐
│ NAV BAR                                                        │
├────────────────────────────────────────────────────────────────┤
│ CLUSTER SELECTOR DROPDOWN                                      │
├────────────────────────────────────────────────────────────────┤
│ HOURLY PATTERN (bar chart 0-23, full width)                    │
│ Historical avg (dark bar) | Today (cyan bar) | Forecast (line) │
├────────────────────────────────────────────────────────────────┤
│ HEAT MATRIX: 7 days × 24 hours                                 │
│ Color = violation intensity. Darker = more violations.         │
│ Shows which hour+day combinations are worst.                   │
└────────────────────────────────────────────────────────────────┘
```

---

### Google Fonts Import (Put This in index.html)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

# PART 2: DATA PREPARATION
## Run This in a Kaggle Notebook

### Setup

1. Go to **kaggle.com** → Code → Create New Notebook
2. Upload your CSV: `jan_to_may_police_violation_anonymized.csv`
3. Copy and run each code block below as separate cells

---

### Cell 1: Imports

```python
import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

print("Ready")
```

---

### Cell 2: Load & Inspect

```python
df = pd.read_csv('/kaggle/input/your-dataset/jan_to_may_police_violation_anonymized.csv')

print(f"Total records: {len(df)}")
print(f"Columns: {df.columns.tolist()}")
print(f"\nFirst row sample:")
print(df.iloc[0])
print(f"\nNull counts:")
print(df.isnull().sum()[df.isnull().sum() > 0])
```

---

### Cell 3: Parse Violation Types

```python
# violation_type column is stored as JSON arrays like ["WRONG PARKING", "NO PARKING"]
# We parse each row to get the first (primary) violation type

def parse_primary_violation(val):
    if pd.isna(val):
        return 'UNKNOWN'
    try:
        parsed = json.loads(str(val).replace("'", '"'))
        return parsed[0] if parsed else 'UNKNOWN'
    except:
        return str(val).strip("[]'\"")

def parse_violation_count(val):
    if pd.isna(val):
        return 1
    try:
        parsed = json.loads(str(val).replace("'", '"'))
        return len(parsed)
    except:
        return 1

df['primary_violation'] = df['violation_type'].apply(parse_primary_violation)
df['violation_count'] = df['violation_type'].apply(parse_violation_count)

print("Violation types:")
print(df['primary_violation'].value_counts().head(15))
```

---

### Cell 4: Timestamp Features

```python
# Parse timestamps, convert to IST (UTC+5:30), extract features
df['created_dt'] = pd.to_datetime(df['created_datetime'], utc=True, errors='coerce')
df['created_ist'] = df['created_dt'].dt.tz_convert('Asia/Kolkata')

df['hour']       = df['created_ist'].dt.hour
df['day_num']    = df['created_ist'].dt.dayofweek   # 0=Monday
df['day_name']   = df['created_ist'].dt.day_name()
df['month_name'] = df['created_ist'].dt.month_name()
df['date']       = df['created_ist'].dt.date

print(f"Date range (IST): {df['created_ist'].min()} → {df['created_ist'].max()}")
print(f"\nViolations by hour:")
print(df['hour'].value_counts().sort_index())
```

---

### Cell 5: Compute CIS Score

```python
# CIS (Congestion Impact Score) = VTS × VCS × JPM × MLM
# This is our core innovation: every violation gets a traffic-impact score

VIOLATION_SEVERITY = {
    'PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS': 5.0,
    'PARKING NEAR ROAD CROSSING':                4.5,
    'DOUBLE PARKING':                            4.5,
    'PARKING IN A MAIN ROAD':                    4.0,
    'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC':   3.5,
    'NO PARKING':                                3.0,
    'WRONG PARKING':                             2.5,
    'PARKING ON FOOTPATH':                       2.0,
    'PARKING OPPOSITE TO ANOTHER PARKED VEHICLE':2.5,
    'PARKING OTHER THAN BUS STOP':               2.0,
    'DEFECTIVE NUMBER PLATE':                    1.5,
    'USING BLACK FILM/OTHER MATERIALS':          1.5,
    'REFUSE TO GO FOR HIRE':                     1.5,
    'AGAINST ONE WAY/NO ENTRY':                  1.5,
    'WITHOUT SIDE MIRROR':                       1.0,
    'VIOLATING LANE DISIPLINE':                  1.5,
    'FAIL TO USE SAFETY BELTS':                  1.0,
    'OBSTRUCTING DRIVER':                        1.0,
    'DEMANDING EXCESS FARE':                     1.0,
    'H T V PROHIBITED':                          1.0,
}

VEHICLE_SCORE = {
    'HGV':               3.0, 'LORRY/GOODS VEHICLE': 3.0,
    'BUS (BMTC/KSRTC)':  2.8, 'PRIVATE BUS':          2.8,
    'TOURIST BUS':        2.8, 'FACTORY BUS':           2.8,
    'SCHOOL VEHICLE':     2.5, 'TANKER':                2.5,
    'MAXI-CAB':           2.2, 'TEMPO':                 2.2,
    'MINI LORRY':         2.0, 'LGV':                   2.0,
    'TRACTOR':            2.0, 'VAN':                   1.8,
    'JEEP':               1.5, 'CAR':                   1.5,
    'GOODS AUTO':         1.3, 'PASSENGER AUTO':         1.2,
    'MOTOR CYCLE':        1.0, 'SCOOTER':               1.0,
    'MOPED':              1.0, 'OTHERS':                1.2,
}

def compute_cis(row):
    vts = VIOLATION_SEVERITY.get(row['primary_violation'], 2.0)
    vcs = VEHICLE_SCORE.get(str(row['vehicle_type']), 1.2)
    jpm = 1.4 if str(row.get('junction_name', 'No Junction')) != 'No Junction' else 1.0
    mlm = 1.4 if row['violation_count'] >= 3 else (1.2 if row['violation_count'] == 2 else 1.0)
    return round(vts * vcs * jpm * mlm, 4)

df['is_named_junction'] = (df['junction_name'] != 'No Junction').astype(int)
df['cis_score'] = df.apply(compute_cis, axis=1)

print(f"CIS Score stats:")
print(df['cis_score'].describe())
print(f"\nTop CIS violation types (by average CIS):")
print(df.groupby('primary_violation')['cis_score'].mean().sort_values(ascending=False).head(10))
```

---

### Cell 6: Clean and Save Engineered Dataset

```python
# Keep only the columns we actually need

keep_cols = [
    'latitude', 'longitude',
    'junction_name', 'is_named_junction',
    'created_ist', 'hour', 'day_num', 'day_name', 'month_name', 'date',
    'vehicle_type', 'primary_violation', 'violation_count',
    'police_station', 'device_id', 'created_by_id',
    'cis_score'
]

df_clean = df[keep_cols].copy()
df_clean = df_clean.rename(columns={'created_ist': 'timestamp'})

# Drop rows with bad GPS
df_clean = df_clean[
    (df_clean['latitude'] != 0) &
    (df_clean['longitude'] != 0) &
    df_clean['latitude'].notna() &
    df_clean['longitude'].notna()
].reset_index(drop=True)

print(f"Clean dataset: {len(df_clean)} records")
print(f"Columns: {df_clean.columns.tolist()}")

df_clean.to_csv('violations_clean.csv', index=False)
print("\n✅ Saved: violations_clean.csv")
```

---

### Cell 7: Key Insight Verification

```python
# Confirm the enforcement blindspot exists — this is a core part of our pitch

peak_traffic = df_clean[df_clean['hour'].between(12, 17)]
rest = df_clean[~df_clean['hour'].between(12, 17)]

print("=== THE ENFORCEMENT BLINDSPOT ===")
print(f"Violations logged 12:00-17:59 (peak traffic hours): {len(peak_traffic)} ({100*len(peak_traffic)/len(df_clean):.1f}%)")
print(f"Violations logged all other hours:                   {len(rest)} ({100*len(rest)/len(df_clean):.1f}%)")
print()
print("This means 99%+ of violations are logged OUTSIDE peak traffic hours.")
print("Officers are busy directing traffic during peak hours. They can't enforce parking.")
print("MargDristi targets this blindspot with AI-predicted enforcement deployment.")
```

---

# PART 3: MODEL TRAINING
## Continue in the Same Kaggle Notebook

Add these cells after Part 2 cells. Keep everything in one notebook.

---

### Cell 8: DBSCAN Clustering

```python
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score
import joblib
import pickle

# Extract GPS coordinates
coords = df_clean[['latitude', 'longitude']].values

print(f"Running DBSCAN on {len(coords)} GPS coordinates...")
print("This may take 1-2 minutes...\n")

# Parameters:
# eps=0.001 → ~100 meter radius in Bengaluru
# min_samples=50 → a cluster needs 50+ violations to be real
# metric='haversine' + algorithm='ball_tree' → correct for lat/lng data
# (haversine requires radians input)

coords_rad = np.radians(coords)

# Test multiple epsilon values to find best silhouette score
best_eps    = 0.001
best_sil    = -1
best_labels = None

for eps in [0.0008, 0.001, 0.0012]:
    db = DBSCAN(eps=eps, min_samples=50, metric='haversine', algorithm='ball_tree')
    labels = db.fit_predict(coords_rad)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    if n_clusters < 2:
        continue
    sil = silhouette_score(coords_rad, labels, sample_size=10000, random_state=42)
    print(f"  eps={eps} → {n_clusters} clusters, silhouette={sil:.3f}")
    if sil > best_sil:
        best_sil    = sil
        best_eps    = eps
        best_labels = labels

print(f"\nBest: eps={best_eps}, silhouette={best_sil:.3f}")

# Re-train with best epsilon and save model
dbscan_final = DBSCAN(eps=best_eps, min_samples=50, metric='haversine', algorithm='ball_tree')
cluster_labels = dbscan_final.fit_predict(coords_rad)
df_clean['cluster_id'] = cluster_labels

n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
n_noise    = list(cluster_labels).count(-1)

print(f"\nFinal model: {n_clusters} clusters, {n_noise} noise points ({100*n_noise/len(cluster_labels):.1f}%)")

joblib.dump(dbscan_final, 'dbscan_model.pkl')
print("✅ Saved: dbscan_model.pkl")
```

---

### Cell 9: Cluster Metadata & Tier Classification

```python
# For each cluster, compute statistics and classify into Tier 1/2/3

records = []

for cid in range(n_clusters):
    mask = df_clean['cluster_id'] == cid
    sub  = df_clean[mask]

    total_cis  = sub['cis_score'].sum()
    avg_cis    = sub['cis_score'].mean()
    count      = len(sub)
    peak_hour  = int(sub['hour'].mode()[0])
    top_vehicle   = sub['vehicle_type'].mode()[0]
    top_violation = sub['primary_violation'].mode()[0]
    centroid_lat  = sub['latitude'].mean()
    centroid_lng  = sub['longitude'].mean()

    # Try to assign a name from junction names in the cluster
    junc_series = sub[sub['junction_name'] != 'No Junction']['junction_name']
    if len(junc_series) > 0:
        zone_name = junc_series.mode()[0]
    else:
        zone_name = f"Cluster {cid} ({centroid_lat:.4f}, {centroid_lng:.4f})"

    records.append({
        'cluster_id':      cid,
        'zone_name':       zone_name,
        'centroid_lat':    round(centroid_lat, 6),
        'centroid_lng':    round(centroid_lng, 6),
        'violation_count': count,
        'total_cis':       round(total_cis, 2),
        'avg_cis':         round(avg_cis, 4),
        'peak_hour':       peak_hour,
        'top_vehicle':     top_vehicle,
        'top_violation':   top_violation,
    })

clusters_df = pd.DataFrame(records).sort_values('total_cis', ascending=False).reset_index(drop=True)

# Tier classification by percentile
n1 = max(1, int(n_clusters * 0.15))  # Top 15% → Tier 1
n2 = max(1, int(n_clusters * 0.35))  # Next 35% → Tier 2

clusters_df['tier'] = 'Tier 3'
clusters_df.iloc[:n1, clusters_df.columns.get_loc('tier')]       = 'Tier 1'
clusters_df.iloc[n1:n1+n2, clusters_df.columns.get_loc('tier')] = 'Tier 2'

# Risk score (0-100): normalized rank within all clusters
clusters_df['risk_score'] = (
    (clusters_df['total_cis'] / clusters_df['total_cis'].max()) * 70 +
    (clusters_df['violation_count'] / clusters_df['violation_count'].max()) * 30
).round(1)

print("Top 15 clusters:")
print(clusters_df[['cluster_id','zone_name','violation_count','total_cis','tier','risk_score','peak_hour']].head(15))

clusters_df.to_csv('cluster_metadata.csv', index=False)
df_clean.to_csv('violations_clustered.csv', index=False)
print("\n✅ Saved: cluster_metadata.csv")
print("✅ Saved: violations_clustered.csv")
```

---

### Cell 10: Temporal Pattern Data Export

```python
# Export the data patterns needed for the Temporal Analysis view

# Hourly distribution (city-wide)
hourly_city = df_clean.groupby('hour').size().reset_index(name='count')

# Hourly × Day matrix (7 days × 24 hours)
pivot_matrix = pd.crosstab(df_clean['day_num'], df_clean['hour'])
pivot_matrix.index = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

# Per-cluster daily aggregation (for Prophet)
top_cluster_ids = clusters_df.head(10)['cluster_id'].tolist()

cluster_daily = {}
for cid in top_cluster_ids:
    sub = df_clean[df_clean['cluster_id'] == cid]
    daily = sub.groupby('date').size().reset_index(name='violations')
    daily['date'] = pd.to_datetime(daily['date'])
    cluster_daily[cid] = daily

hourly_city.to_csv('temporal_hourly_city.csv', index=False)
pivot_matrix.to_csv('temporal_heatmap_matrix.csv')

print("Hourly distribution (city-wide):")
print(hourly_city.to_string(index=False))
print("\n✅ Saved: temporal_hourly_city.csv")
print("✅ Saved: temporal_heatmap_matrix.csv")
```

---

### Cell 11: Prophet Forecasting Models

```python
# Train a Prophet model for each top-10 cluster
# Prophet predicts daily violation counts 7 days ahead

# Install if not available
import subprocess
try:
    from prophet import Prophet
except ImportError:
    subprocess.check_call(['pip', 'install', 'prophet', '-q'])
    from prophet import Prophet

import pickle
import io, sys

prophet_models    = {}
prophet_forecasts = {}

print("Training Prophet models for top 10 clusters...")
print("This takes 2-4 minutes per cluster.\n")

for cid in top_cluster_ids:
    daily = cluster_daily[cid]
    if len(daily) < 20:
        print(f"  Cluster {cid}: Not enough data ({len(daily)} days), skipping")
        continue

    prophet_df = pd.DataFrame({'ds': daily['date'], 'y': daily['violations']})

    # Suppress Prophet's verbose output
    f = io.StringIO()
    sys.stdout = f
    model = Prophet(weekly_seasonality=True, yearly_seasonality=False,
                    changepoint_prior_scale=0.05, interval_width=0.90)
    model.fit(prophet_df)
    sys.stdout = sys.__stdout__

    future   = model.make_future_dataframe(periods=7)
    forecast = model.predict(future)

    # Evaluate: MAPE on last 14 days
    actuals  = prophet_df.tail(14)['y'].values
    preds    = forecast[forecast['ds'].isin(prophet_df.tail(14)['ds'])]['yhat'].clip(lower=0).values
    mape     = np.mean(np.abs((actuals - preds) / (actuals + 1))) * 100

    prophet_models[cid]    = model
    prophet_forecasts[cid] = forecast[['ds','yhat','yhat_lower','yhat_upper']].tail(14)

    print(f"  Cluster {cid}: MAPE = {mape:.1f}%, 7-day forecast avg = {forecast.tail(7)['yhat'].mean():.0f}/day")

# Save all Prophet models
for cid, model in prophet_models.items():
    with open(f'prophet_cluster_{cid}.pkl', 'wb') as f:
        pickle.dump(model, f)

# Save combined forecast
all_forecasts = []
for cid, fc in prophet_forecasts.items():
    fc = fc.copy()
    fc['cluster_id'] = cid
    all_forecasts.append(fc)

pd.concat(all_forecasts).to_csv('prophet_forecasts.csv', index=False)

print(f"\n✅ Trained {len(prophet_models)} Prophet models")
print("✅ Saved: prophet_cluster_N.pkl files")
print("✅ Saved: prophet_forecasts.csv")
```

---

### Cell 12: Enforcement Simulator (XGBoost)

```python
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

# Build synthetic training data for the simulator
# Logic: more officers → more violations prevented (diminishing returns)
# Tier 1 clusters → harder to fully prevent (high density)
# Peak hours → more preventable (more violations to intercept)

np.random.seed(42)
rows = []

for _, cluster in clusters_df.iterrows():
    cid       = cluster['cluster_id']
    tier      = cluster['tier']
    daily_avg = cluster['violation_count'] / 150  # 150 days of data

    for num_officers in range(1, 6):
        for hour in [6, 8, 10, 12, 14, 16, 18, 20, 22]:
            hourly_baseline = daily_avg / 8  # rough hourly estimate

            # Base prevention rate with diminishing returns
            base_rate = 0.20 + (num_officers * 0.11)
            base_rate = min(base_rate, 0.72)

            # Peak hours: enforcement is more effective (more violations to prevent)
            hour_mult = 1.10 if 8 <= hour <= 18 else 0.85

            # Tier adjustment
            tier_mult = {'Tier 1': 0.85, 'Tier 2': 1.00, 'Tier 3': 1.15}.get(tier, 1.0)

            rate = base_rate * hour_mult * tier_mult
            rate = float(np.clip(rate + np.random.normal(0, 0.04), 0.05, 0.80))

            rows.append({
                'cluster_id':    cid,
                'num_officers':  num_officers,
                'hour':          hour,
                'daily_avg':     daily_avg,
                'tier1':         1 if tier == 'Tier 1' else 0,
                'tier2':         1 if tier == 'Tier 2' else 0,
                'peak_hour':     1 if 8 <= hour <= 18 else 0,
                'prevention_rate': rate,
            })

sim_df = pd.DataFrame(rows)

feats = ['cluster_id','num_officers','hour','daily_avg','tier1','tier2','peak_hour']
X = sim_df[feats].values
y = sim_df['prevention_rate'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

sim_model = XGBRegressor(n_estimators=150, max_depth=5, learning_rate=0.08,
                          subsample=0.8, colsample_bytree=0.8, random_state=42)
sim_model.fit(X_train, y_train)

y_pred = sim_model.predict(X_test)
print(f"Simulator model:")
print(f"  R² score: {r2_score(y_test, y_pred):.3f}")
print(f"  MAE:      {mean_absolute_error(y_test, y_pred):.4f}")

joblib.dump(sim_model, 'simulator_model.pkl')
sim_df.to_csv('simulator_training_data.csv', index=False)

print("\n✅ Saved: simulator_model.pkl")
print("✅ Saved: simulator_training_data.csv")
```

---

### Cell 13: Final Verification

```python
import os

required_files = [
    'violations_clean.csv',
    'violations_clustered.csv',
    'cluster_metadata.csv',
    'temporal_hourly_city.csv',
    'temporal_heatmap_matrix.csv',
    'prophet_forecasts.csv',
    'dbscan_model.pkl',
    'simulator_model.pkl',
]
prophet_files = [f for f in os.listdir('.') if f.startswith('prophet_cluster_')]

print("=== TRAINING COMPLETE — FILE CHECKLIST ===\n")
for f in required_files:
    exists = os.path.exists(f)
    size   = os.path.getsize(f) if exists else 0
    print(f"{'✅' if exists else '❌'} {f} ({size/1024:.0f} KB)")

print(f"\n✅ Prophet models: {len(prophet_files)} files")
for f in prophet_files:
    print(f"   {f} ({os.path.getsize(f)/1024:.0f} KB)")

print("\n=== DOWNLOAD ALL THESE FILES FROM KAGGLE OUTPUT ===")
print("Go to the Output section of your Kaggle notebook and download all files.")
```

---

### What to Download from Kaggle

After running all cells, download these files and save them in a folder called `models/` on your computer:

```
models/
├── dbscan_model.pkl
├── simulator_model.pkl
├── prophet_cluster_0.pkl
├── prophet_cluster_1.pkl
├── prophet_cluster_2.pkl   ← however many were trained
├── ... (more clusters)
├── cluster_metadata.csv
├── violations_clustered.csv
├── temporal_hourly_city.csv
├── temporal_heatmap_matrix.csv
└── prophet_forecasts.csv
```

Also download `violations_clean.csv` and save it in a folder called `data/`.

---

# PART 4: BACKEND
## Copy This Prompt Into GitHub Copilot Agent

Open your IDE. Create an empty folder `margdristi-backend/`. Open Copilot and paste the full prompt below. Do not summarize it. Copy it exactly.

---

### Copilot Prompt — Backend (Copy Everything Below The Line)

---

```
I am building MargDristi, an AI enforcement command center. Build a complete FastAPI backend for me.

CONTEXT:
- I have trained ML models in a folder called models/ (dbscan_model.pkl, simulator_model.pkl, prophet_cluster_N.pkl files)
- I have CSV data files in a folder called data/ (cluster_metadata.csv, violations_clustered.csv, temporal_hourly_city.csv, temporal_heatmap_matrix.csv, prophet_forecasts.csv, violations_clean.csv)
- I need a REST API that loads these models and serves data to a React frontend

CREATE THIS EXACT FOLDER STRUCTURE:
margdristi-backend/
├── main.py
├── config.py
├── requirements.txt
├── data/            (place CSV files here)
├── models/          (place .pkl files here)
├── routers/
│   ├── __init__.py
│   ├── clusters.py
│   ├── enforcement.py
│   ├── forecasts.py
│   └── health.py
├── ml/
│   ├── __init__.py
│   └── loader.py
├── schemas/
│   ├── __init__.py
│   └── models.py
└── utils/
    ├── __init__.py
    └── cis.py

---

FILE: requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pandas==2.1.0
numpy==1.24.4
scikit-learn==1.3.2
xgboost==2.0.2
joblib==1.3.2
prophet==1.1.5
pydantic==2.4.2
python-dotenv==1.0.0

---

FILE: config.py
- Define BASE_DIR = parent directory of this file (use pathlib.Path(__file__).parent)
- Define MODELS_DIR = BASE_DIR / "models"
- Define DATA_DIR = BASE_DIR / "data"
- All paths use pathlib.Path (not strings)
- No database needed. All data comes from CSV files loaded into memory at startup.

---

FILE: ml/loader.py

Create a class ModelLoader:
  __init__(self, models_dir, data_dir):
    self.models_dir = Path(models_dir)
    self.data_dir   = Path(data_dir)
    self.dbscan     = None
    self.simulator  = None
    self.prophet    = {}   # dict: cluster_id (int) → Prophet model
    self.clusters   = None  # DataFrame of cluster_metadata.csv
    self.violations = None  # DataFrame of violations_clustered.csv
    self.hourly     = None  # DataFrame of temporal_hourly_city.csv
    self.heatmap    = None  # DataFrame of temporal_heatmap_matrix.csv
    self.forecasts  = None  # DataFrame of prophet_forecasts.csv
    self.status     = {}   # dict tracking what loaded successfully

  load_all(self):
    Load dbscan_model.pkl with joblib → self.dbscan
    Load simulator_model.pkl with joblib → self.simulator
    Load all prophet_cluster_N.pkl files with pickle (glob the directory) → self.prophet[N]
    Load all CSV files with pandas → self.clusters, self.violations, etc.
    For each loaded item, record True in self.status dict
    Catch exceptions per item — don't let one failure crash everything

  is_ready(self) → bool:
    Return True if dbscan, simulator, clusters, and violations are all loaded

  predict_simulator(self, cluster_id, num_officers, hour, day_of_week) → float:
    Look up cluster daily_avg from self.clusters
    tier1 = 1 if cluster tier is Tier 1 else 0
    tier2 = 1 if cluster tier is Tier 2 else 0
    peak_hour = 1 if 8 <= hour <= 18 else 0
    features = [[cluster_id, num_officers, hour, daily_avg, tier1, tier2, peak_hour]]
    return float(self.simulator.predict(np.array(features))[0])

  get_cluster(self, cluster_id) → dict or None:
    Return the row from self.clusters where cluster_id matches, as dict
    Return None if not found

  get_top_clusters(self, n=20, tier=None) → list of dicts:
    Filter self.clusters by tier if provided
    Return top n rows sorted by risk_score descending, as list of dicts

  get_forecast(self, cluster_id, days=7) → list of dicts:
    If self.forecasts is not None, filter by cluster_id
    Return last N rows as list of dicts with keys: date, predicted, lower, upper
    If no data: return empty list

  get_hourly_pattern(self, cluster_id=None) → list of dicts:
    If cluster_id is None: return city-wide hourly from self.hourly
    If cluster_id given: filter self.violations for that cluster, group by hour
    Return list of {hour, count}

  get_heatmap_matrix(self, cluster_id=None) → dict:
    Return 7x24 matrix as nested dict {day_name: {hour: count}}

Create a module-level instance: loader = ModelLoader(MODELS_DIR, DATA_DIR)

---

FILE: schemas/models.py (Pydantic v2 models)

Define these response models:

ClusterOut:
  cluster_id: int
  zone_name: str
  centroid_lat: float
  centroid_lng: float
  violation_count: int
  total_cis: float
  avg_cis: float
  risk_score: float
  tier: str
  peak_hour: int
  top_vehicle: str
  top_violation: str

SimulateRequest:
  cluster_id: int
  num_officers: int  (1-5)
  hour: int          (0-23)
  day_of_week: int   (0-6)

SimulateResponse:
  prevention_rate: float
  violations_prevented: int
  congestion_reduction_pct: float
  revenue_inr: float
  commuter_minutes_saved: int

ForecastPoint:
  date: str
  predicted: int
  lower: int
  upper: int

HourlyPoint:
  hour: int
  count: int

HeatmapOut:
  matrix: dict  (day name → hour → count)

HealthOut:
  status: str
  dbscan_loaded: bool
  simulator_loaded: bool
  prophet_models_loaded: int
  clusters_loaded: bool
  violations_loaded: bool
  total_clusters: int
  total_violations: int

---

FILE: routers/clusters.py

All endpoints use loader from ml/loader.py (imported from module level)

GET /api/clusters
  Returns: List[ClusterOut]
  Optional query params: tier (str), limit (int, default 50)
  Calls loader.get_top_clusters(n=limit, tier=tier)

GET /api/clusters/{cluster_id}
  Returns: ClusterOut
  Calls loader.get_cluster(cluster_id)
  If None: raise HTTPException(404)

---

FILE: routers/enforcement.py

POST /api/simulate
  Input: SimulateRequest body
  Logic:
    1. prevention_rate = loader.predict_simulator(cluster_id, num_officers, hour, day_of_week)
    2. cluster = loader.get_cluster(cluster_id)
    3. baseline = cluster['violation_count'] / 150  (daily avg)
    4. violations_prevented = int(baseline * prevention_rate)
    5. congestion_reduction_pct = round(prevention_rate * 74.0, 1)  (empirical mapping)
    6. revenue_inr = violations_prevented * 500  (₹500 avg fine)
    7. commuter_minutes_saved = violations_prevented * 8  (avg 8 min saved per violation cleared)
  Returns: SimulateResponse

GET /api/enforcement/recommendations
  Returns: List[ClusterOut]
  Optional query param: station (str)
  Returns top 20 Tier 1 and Tier 2 clusters sorted by risk_score
  If station provided: filter clusters by police_station if that field exists,
  otherwise return full list

---

FILE: routers/forecasts.py

GET /api/forecasts/{cluster_id}
  Returns: List[ForecastPoint]
  Calls loader.get_forecast(cluster_id)

GET /api/temporal/hourly
  Returns: List[HourlyPoint]
  Optional query param: cluster_id (int)
  Calls loader.get_hourly_pattern(cluster_id)

GET /api/temporal/heatmap
  Returns: HeatmapOut
  Optional query param: cluster_id (int)
  Calls loader.get_heatmap_matrix(cluster_id)

---

FILE: routers/health.py

GET /api/health
  Returns: HealthOut
  Reports status of each loaded model/dataset
  status field: "healthy" if all loaded, "degraded" if some missing, "starting" if not ready

---

FILE: main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ml.loader import loader
from routers import clusters, enforcement, forecasts, health

app = FastAPI(title="MargDristi API", version="1.0")

Add CORS middleware: allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]

@app.on_event("startup")
async def startup():
    loader.load_all()

Include all routers with prefix "/api"

Add GET / that returns {"name": "MargDristi API", "status": "running"}

---

IMPORTANT REQUIREMENTS:
1. ALL endpoints must have try/except. On error return HTTPException(500, detail=str(e))
2. NO authentication. This is a prototype.
3. NO database. Everything reads from CSV files loaded at startup.
4. All numeric fields returned as Python native types (int/float), not numpy types — use int(), float() wrappers
5. Include logging (import logging; logger = logging.getLogger(__name__)) in each file
6. numpy int64/float64 in responses must be converted to Python int/float before returning

Build all files now with complete implementation.
```

---

### After Copilot Generates the Backend

Run these commands:

```bash
cd margdristi-backend
pip install -r requirements.txt

# Copy your downloaded files into place:
# All .pkl files → models/
# All .csv files → data/

# Start the server:
uvicorn main:app --reload --port 8000
```

Open: `http://localhost:8000/docs`

Test these endpoints manually in the Swagger docs:
- `GET /api/health` → should show all models loaded
- `GET /api/clusters` → should return 20+ clusters
- `POST /api/simulate` with body `{"cluster_id": 0, "num_officers": 3, "hour": 10, "day_of_week": 2}` → should return prevention metrics

If health shows models not loaded, check that your `.pkl` files are inside the `models/` folder.

---

# PART 5: FRONTEND
## Copy This Prompt Into GitHub Copilot Agent

Create an empty folder `margdristi-frontend/`. Open Copilot and paste the full prompt below.

---

### Copilot Prompt — Frontend (Copy Everything Below The Line)

---

```
Build the complete frontend for MargDristi, an AI enforcement command center for Bengaluru Traffic Police.

TECH STACK:
- Vite + React 18 + TypeScript (strict)
- Tailwind CSS with custom config (I will provide exact colors)
- react-router-dom v6 for routing
- axios for API calls
- zustand for state management
- react-leaflet + leaflet for maps
- recharts for charts
- No UI component library (no shadcn, no mui, no ant-design). Custom components only.

PACKAGE.JSON DEPENDENCIES (include all of these):
react, react-dom, react-router-dom, axios, zustand,
leaflet, react-leaflet, recharts,
@types/leaflet, @types/react, @types/react-dom

DEV DEPENDENCIES:
vite, @vitejs/plugin-react, typescript,
tailwindcss, postcss, autoprefixer,
@types/node

---

DESIGN SYSTEM (use these EXACTLY. No deviations.):

Add this to index.css:
```
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --bg-base:       #06080F;
  --bg-surface:    #0C1221;
  --bg-elevated:   #111C30;
  --border:        #1A2840;
  --border-active: #2A4080;
  --blue:          #1E6FFF;
  --blue-dim:      #0D3580;
  --cyan:          #00C8FF;
  --purple:        #9B72FF;
  --tier1:         #FF3B3B;
  --tier2:         #FF9500;
  --tier3:         #00C853;
  --text:          #E8EDF5;
  --text-dim:      #6B7A99;
  --text-faint:    #3A4A66;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg-base);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.mono { font-family: 'IBM Plex Mono', monospace; }

/* Tier border utilities */
.tier1-border { border-left: 3px solid var(--tier1); }
.tier2-border { border-left: 3px solid var(--tier2); }
.tier3-border { border-left: 3px solid var(--tier3); }
```

tailwind.config.js — extend colors with all variables above as named tokens.

---

FOLDER STRUCTURE:
src/
├── main.tsx
├── App.tsx
├── index.css
├── api/
│   ├── client.ts          (axios instance, baseURL = http://localhost:8000)
│   └── endpoints.ts       (typed API call functions)
├── types/
│   └── index.ts           (all TypeScript interfaces)
├── store/
│   └── appStore.ts        (zustand store)
├── components/
│   ├── NavBar.tsx
│   ├── KPIStrip.tsx
│   ├── AlertStrip.tsx
│   ├── map/
│   │   ├── MapView.tsx
│   │   └── ClusterPolygon.tsx
│   ├── panels/
│   │   ├── PriorityPanel.tsx
│   │   └── SimulatorPanel.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Card.tsx
│       └── Button.tsx
├── pages/
│   ├── CommandCenter.tsx
│   ├── ZoneExplorer.tsx
│   └── TemporalAnalysis.tsx
└── hooks/
    ├── useClusters.ts
    └── useSimulate.ts

---

FILE: src/types/index.ts

export interface Cluster {
  cluster_id: number;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  violation_count: number;
  total_cis: number;
  avg_cis: number;
  risk_score: number;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  peak_hour: number;
  top_vehicle: string;
  top_violation: string;
}

export interface SimulateRequest {
  cluster_id: number;
  num_officers: number;
  hour: number;
  day_of_week: number;
}

export interface SimulateResponse {
  prevention_rate: number;
  violations_prevented: number;
  congestion_reduction_pct: number;
  revenue_inr: number;
  commuter_minutes_saved: number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface HourlyPoint {
  hour: number;
  count: number;
}

export interface HealthStatus {
  status: string;
  dbscan_loaded: boolean;
  simulator_loaded: boolean;
  prophet_models_loaded: number;
  clusters_loaded: boolean;
  total_clusters: number;
  total_violations: number;
}

---

FILE: src/api/client.ts

import axios from 'axios';
const client = axios.create({ baseURL: 'http://localhost:8000' });
export default client;

---

FILE: src/api/endpoints.ts

Typed functions using client:
- getClusters(tier?: string, limit?: number) → Promise<Cluster[]>
- getCluster(id: number) → Promise<Cluster>
- getRecommendations() → Promise<Cluster[]>
- simulate(req: SimulateRequest) → Promise<SimulateResponse>
- getForecasts(cluster_id: number) → Promise<ForecastPoint[]>
- getHourlyPattern(cluster_id?: number) → Promise<HourlyPoint[]>
- getHealth() → Promise<HealthStatus>

All functions include try/catch. On error, log the error and rethrow.

---

FILE: src/store/appStore.ts (Zustand)

State:
- clusters: Cluster[]
- selectedCluster: Cluster | null
- simResult: SimulateResponse | null
- numOfficers: number (default: 3)
- health: HealthStatus | null
- loading: boolean
- mapLayer: 'heatmap' | 'clusters' (default: 'clusters')

Actions:
- setClusters(c: Cluster[])
- selectCluster(c: Cluster | null)
- setSimResult(r: SimulateResponse | null)
- setNumOfficers(n: number)
- setHealth(h: HealthStatus)
- setLoading(b: boolean)
- setMapLayer(l: 'heatmap' | 'clusters')

---

FILE: src/components/ui/Badge.tsx

Props: tier: 'Tier 1' | 'Tier 2' | 'Tier 3'
Renders a small rectangle (no border-radius) with appropriate background.
Style:
- Tier 1: background var(--tier1), text white
- Tier 2: background var(--tier2), text white
- Tier 3: background var(--tier3), text #06080F (dark text on green)
- Font: 11px DM Sans uppercase font-weight 600
- Padding: 3px 8px
- display: inline-block

---

FILE: src/components/ui/Card.tsx

Props: children, tier?: string, className?: string
Renders a div with:
- background: var(--bg-surface)
- border-left: 3px solid (color based on tier prop: --tier1/tier2/tier3, else --blue)
- padding: 16px
- border-radius: 0
No shadows.

---

FILE: src/components/ui/Button.tsx

Props: children, onClick, variant?: 'primary' | 'ghost', disabled?: boolean, fullWidth?: boolean

Primary: background var(--blue), text white, height 36px, padding 0 16px, border-radius 0, no shadow
Ghost: transparent background, 1px border var(--border-active), text var(--blue), same dimensions
Disabled: opacity 0.4, cursor not-allowed
Hover (primary): background var(--blue-dim)

---

FILE: src/components/NavBar.tsx

Layout: full-width horizontal bar, 48px height, background var(--bg-surface), border-bottom 1px var(--border)

Left: Logo mark (a simple pentagon/badge SVG icon) + "MARGDRISTI" in 16px DM Sans 700 weight, text var(--text), letter-spacing 0.15em (makes it look like an official seal)

Center: Tab navigation links → [Command Center] [Zone Explorer] [Temporal Analysis]
- Active tab: text var(--blue), border-bottom 2px var(--blue)
- Inactive: text var(--text-dim)
- Tabs use react-router NavLink

Right: System status indicator (green dot if health OK, red dot if not) + "SYSTEM ONLINE" text in 11px mono

Use useNavigate and NavLink from react-router-dom.

---

FILE: src/components/KPIStrip.tsx

Props: clusters: Cluster[]

Renders 5 KPI tiles in a horizontal strip, height 76px, background var(--bg-surface), border-bottom 1px var(--border), padding 0 24px, gap between tiles.

The 5 KPIs (compute from clusters prop):
1. TIER 1 ACTIVE — count of Tier 1 clusters
2. TOP RISK ZONE — zone_name of highest risk_score cluster (truncate to 15 chars)
3. PEAK IN — "Next peak" message (find minimum peak_hour from Tier 1 clusters, show as "X:00 AM/PM")
4. AVG CIS SCORE — average CIS score across all clusters (show as number, purple color)
5. TOTAL VIOLATIONS — sum of violation_count across all clusters shown in short form (e.g., 298K)

Each tile:
- Label: 10px DM Sans uppercase var(--text-dim) at top
- Value: IBM Plex Mono, var(--cyan) for counts/numbers, var(--purple) for CIS
- Tile width: flex equal split
- Right border 1px var(--border) between tiles (not on last)

---

FILE: src/components/AlertStrip.tsx

Props: clusters: Cluster[]

Fixed 36px bar at the very bottom of the page. Background #0D1525. Border-top 1px var(--border).

Content: generates synthetic alert messages from top 3 Tier 1 clusters, displayed as a scrolling ticker using CSS animation (marquee-like keyframe).

Format: [Red/Amber dot] [Zone name]: [message]
Messages:
- Tier 1 clusters: "Safina Plaza — Peak window approaching (10:00 AM). No officer assigned."
- Tier 2 clusters: "KR Market — Violation rate above average. Consider deployment."

Use CSS @keyframes scroll to animate left-to-right.

---

FILE: src/components/map/MapView.tsx

Uses react-leaflet: MapContainer, TileLayer, CircleMarker, Popup

Props: clusters: Cluster[], onClusterClick: (c: Cluster) => void

Map setup:
- center: [12.9716, 77.5946] (Bengaluru center)
- zoom: 12
- Tile URL: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  attribution: '© CartoDB'  ← this dark tile set looks like a real command center map

For each cluster: render a CircleMarker at centroid_lat, centroid_lng
- Radius: scale by violation_count (min 8, max 30, use Math.log scale)
- Color: var(--tier1) for Tier 1, var(--tier2) for Tier 2, var(--tier3) for Tier 3
- fillOpacity: 0.55
- weight (border): 2
- On click: call onClusterClick(cluster)

On marker click: show Popup with:
  Zone name (bold)
  Risk: [score] | Tier: [badge]
  Peak: [hour]:00 | Violations: [count]
  Button "View in Simulator" that calls onClusterClick

Map container height: 100% (fills its parent)

---

FILE: src/components/panels/PriorityPanel.tsx

Props: clusters: Cluster[], onSelect: (c: Cluster) => void, selectedId: number | null

Renders a scrollable list of clusters sorted by risk_score descending.

Header: "ENFORCEMENT PRIORITIES" 11px uppercase var(--text-dim), border-bottom 1px var(--border), padding 12px 16px

Each row (height 52px, padding 0 16px):
- Background: var(--bg-surface) alternating var(--bg-elevated) on hover
- Left: rank number (IBM Plex Mono, 13px, var(--text-dim)), then zone name (DM Sans 13px var(--text))
- Middle: risk score displayed large (IBM Plex Mono 18px, var(--purple))
- Right: peak hour (IBM Plex Mono 12px, var(--cyan)) + Badge component
- Left border 3px colored by tier
- Selected state: background var(--blue-dim), border-left var(--blue)
- On click: call onSelect(cluster)

Show a subtle divider (1px var(--border)) between rows.

---

FILE: src/components/panels/SimulatorPanel.tsx

Props: cluster: Cluster | null, onClose: () => void

If cluster is null: render a centered placeholder "Select a zone from the map or priority list to simulate enforcement."

If cluster is provided:

Header: "ENFORCEMENT SIMULATOR" 11px uppercase label, close button (×) top right

Section 1 — Zone info:
  Zone name (16px DM Sans 600)
  Tier badge
  "Predicted violations today: [X]" in cyan mono

Section 2 — Officer slider:
  Label: "DEPLOY HOW MANY OFFICERS" 11px uppercase
  Custom slider input (range 1-5, step 1)
  Style the slider: track background var(--border), fill var(--blue), handle white circle 16px
  Display selected value: "[N] OFFICERS" in IBM Plex Mono 24px var(--cyan), below slider

Section 3 — Results (update when slider moves):
  Use useSimulate hook (described below)
  While loading: show "CALCULATING..." in dim text
  Results grid (2×2):
    [PREVENTED]     [CONGESTION]
    65  42%         ↓ 31%
    violations      reduction

    [REVENUE]       [TIME SAVED]
    ₹32,500         1,240 min
    est. fines      for commuters

  Each cell: label 10px uppercase var(--text-dim), value IBM Plex Mono 20px var(--cyan)
  CIS impact row: "CIS impact reduced by [X] points" in purple 12px mono

Section 4 — Actions:
  [DEPLOY NOW] — primary button, full width
  [SCHEDULE] — ghost button, full width

SimulatorPanel should call useSimulate hook on mount and when officer count or cluster changes.

---

FILE: src/hooks/useClusters.ts

Custom hook:
- Fetches clusters from GET /api/clusters?limit=100 on mount
- Updates zustand store on success
- Refreshes every 60 seconds
- Returns: { clusters, loading, error }

---

FILE: src/hooks/useSimulate.ts

Custom hook:
- Accepts cluster_id, num_officers, hour (default to current hour), day_of_week (default to today)
- Calls POST /api/simulate on any dependency change
- Debounces the call by 400ms (so slider dragging doesn't spam API)
- Returns: { result, loading, error }
- On error: result is null

---

FILE: src/pages/CommandCenter.tsx

This is the home page. Full-viewport layout.

Layout structure using CSS Grid:
- NavBar (fixed 48px top)
- KPIStrip (76px below nav)
- Main area (fills remaining height, split 65/35):
  - Left 65%: MapView (full height of main area)
  - Right 35%: vertical split:
    - Top 55%: PriorityPanel (scrollable)
    - Bottom 45%: SimulatorPanel (fixed, not scrollable)
- AlertStrip (fixed 36px bottom)

Logic:
- useClusters hook to load data
- When cluster selected in map or priority list: set selectedCluster in store
- SimulatorPanel reads selectedCluster from store
- When numOfficers changes in SimulatorPanel: update store
- useSimulate hook in SimulatorPanel calls API

Loading state: show "LOADING INTELLIGENCE DATA..." centered in page with pulsing cyan dot

---

FILE: src/pages/ZoneExplorer.tsx

Full-page view for exploring a single cluster.

Layout:
- NavBar
- Zone selector: dropdown showing all cluster zone names sorted by risk_score
  When zone selected, call getCluster(id) and getHourlyPattern(id)
- Stats row (5 cards):
  - CIS Score (purple mono large)
  - Violations (cyan mono)
  - Rank (cyan mono)
  - Peak Hour (cyan mono)
  - Top Vehicle (text)
- Two charts side-by-side:
  - Left: Violation type breakdown (horizontal bar chart using Recharts BarChart)
    Custom colors: bars colored by violation severity (use var(--tier1) for top severity violations)
  - Right: Vehicle type breakdown (same style)
- Mini-map below:
  A MapView showing only the selected cluster's marker, zoomed in to zoom level 15

For charts: use Recharts.
  Background: transparent
  Grid: horizontal only, stroke var(--border)
  Bar fill: var(--blue) for vehicle chart, gradient red→amber for violation severity chart
  Axis: stroke var(--text-dim), 12px DM Sans
  Tooltip: background var(--bg-elevated), border var(--border), text var(--text)

---

FILE: src/pages/TemporalAnalysis.tsx

Full-page view for time pattern analysis.

Layout:
- NavBar
- Cluster selector dropdown (same as ZoneExplorer, plus "City-wide" option)
- Below dropdown, two sections stacked:

Section 1 — Hourly Pattern Chart (full width, height 280px):
  Recharts BarChart with:
  - X axis: hours 0-23 (labeled "12AM 3AM 6AM 9AM 12PM 3PM 6PM 9PM")
  - Y axis: violation count
  - Bars: var(--blue), width proportional to count
  - Highlight bars for hours 12-17 with a different color (var(--tier1) with lower opacity)
    to visually show the enforcement blindspot
  - Title: "VIOLATION FREQUENCY BY HOUR — [cluster name or CITY-WIDE]"
  - Subtitle (11px dim): "Hours 12:00–17:00 highlighted: peak traffic, lowest enforcement"
  Use getHourlyPattern(cluster_id) to fetch data

Section 2 — Day × Hour Heatmap (full width):
  Title: "VIOLATION INTENSITY — DAY × HOUR"
  A 7-row × 24-column grid rendered as an HTML table or div grid
  Each cell: colored background from transparent (0 violations) to var(--tier1) (max violations)
  Use CSS opacity to represent intensity (count / max_count)
  Cell size: flexible, fills container
  Row labels: Mon Tue Wed Thu Fri Sat Sun (left side, IBM Plex Mono 11px)
  Column labels: 0 2 4 6 8 10 12 14 16 18 20 22 (bottom, IBM Plex Mono 11px)

---

FILE: App.tsx

Set up react-router-dom v6:
- Route / → CommandCenter
- Route /zones → ZoneExplorer
- Route /temporal → TemporalAnalysis

All routes wrapped in BrowserRouter.

---

ADDITIONAL REQUIREMENTS:
1. No border-radius anywhere. Everything sharp corners.
2. No box-shadows.
3. IBM Plex Mono for ALL numbers (violation counts, scores, percentages, timestamps).
4. DM Sans for all UI text.
5. Never use color for decoration. Only for meaning (tier classification, data values, actions).
6. All TypeScript strict: no 'any' types.
7. Leaflet CSS must be imported in main.tsx: import 'leaflet/dist/leaflet.css'
8. Fix the Leaflet default marker icon issue in MapView.tsx:
   import L from 'leaflet';
   delete (L.Icon.Default.prototype as any)._getIconUrl;
   L.Icon.Default.mergeOptions({iconRetinaUrl: ..., iconUrl: ..., shadowUrl: ...});
9. API calls in hooks should always clear previous results before fetching (set loading=true, result=null)
10. Empty states: if no clusters loaded, show "NO DATA — Start the backend server at localhost:8000"

Build all files now with complete implementation.
```

---

### After Copilot Generates the Frontend

Run these commands:

```bash
cd margdristi-frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

If you see a blank white page, open the browser console (F12). The most common issue is CORS — go back to the backend and confirm the CORS middleware is added correctly.

---

# PART 6: CONNECTING EVERYTHING
## Do This After Both Are Running

### Check 1: Backend is working

```bash
# In your terminal (backend folder):
curl http://localhost:8000/api/health
```

Should return JSON with all `true` values. If `clusters_loaded: false`, your CSV files are not in the `data/` folder.

### Check 2: Frontend is loading clusters

Open `http://localhost:5173` in browser.
Open browser console (F12 → Console tab).
You should see no red errors. If you see `Network Error` or `CORS`, the backend is not running.

### Check 3: Map shows clusters

The map should show colored circles at various points in Bengaluru. If the map is blank:
- Confirm Leaflet CSS is imported in `main.tsx`
- Confirm tile URL is correct (the CartoDB dark tile URL I specified)

### Check 4: Simulator works

Click any cluster circle on the map or any row in the Priority Panel.
The Simulator Panel should appear on the right showing zone info.
Drag the officer slider.
The numbers should update within 1 second (the API call should be fast).

### Check 5: Navigation works

Click Zone Explorer in the nav bar. Select a cluster from the dropdown. Charts should appear.
Click Temporal Analysis. Select a cluster. Bar chart and heat matrix should appear.

---

# PART 7: FULL TEST CHECKLIST
## Go Through This Top to Bottom Before Your Demo

### Backend Tests

```
□ uvicorn starts without errors
□ GET /api/health → all models show loaded: true
□ GET /api/clusters → returns list of clusters (should be 50+)
□ GET /api/clusters/0 → returns single cluster details
□ GET /api/enforcement/recommendations → returns 20 clusters
□ POST /api/simulate (body: {"cluster_id":0,"num_officers":3,"hour":10,"day_of_week":2})
     → returns prevention_rate, violations_prevented, revenue_inr
□ GET /api/temporal/hourly → returns 24 objects (one per hour)
□ GET /api/forecasts/0 → returns forecast data
□ No errors in terminal while calling these
□ Response times under 500ms for all (open /docs and check)
```

### Frontend Tests

```
□ npm run dev starts without TypeScript errors
□ No red errors in browser console
□ NavBar shows "MARGDRISTI" and three tabs
□ KPI Strip shows 5 metrics (not "undefined" or "NaN")
□ Map loads (dark base map with colored circles)
□ Clicking map circle → SimulatorPanel appears with zone name
□ Clicking Priority Panel row → SimulatorPanel updates
□ Adjusting slider → results update within 1 second
□ Revenue shows in ₹ format
□ Zone Explorer dropdown populates with zone names
□ Temporal Analysis charts render (not blank)
□ Heatmap grid renders (7 rows × 24 columns visible)
□ AlertStrip shows at bottom with scrolling text
□ All numbers use IBM Plex Mono font
□ Colors match: Tier 1 = red, Tier 2 = amber, Tier 3 = green
□ Background is very dark navy (#06080F), not white or gray
```

### Demo Flow Test (What Judges Will See)

```
□ Open http://localhost:5173
□ Dashboard loads immediately, map shows Bengaluru with clusters
□ KPI strip shows: N active Tier 1 clusters, top zone name, violations total
□ Alert strip shows messages at bottom
□ Click the highest-risk cluster on the map
□ SimulatorPanel appears on right
□ Drag slider from 1 → 3 → 5 officers
□ Numbers update: violations prevented goes up, congestion reduction increases
□ Show: "With 3 officers, we prevent 42% of violations and reduce congestion by 31%"
□ Navigate to Zone Explorer → select top cluster → charts load
□ Navigate to Temporal Analysis → select top cluster → hourly chart shows the 12-17 blindspot clearly
□ Return to Command Center. Point out the red clusters.
□ Demo is complete. Total time: under 3 minutes.
```

---

# PART 8: COMMON ERRORS AND FIXES

### "Module prophet not found" (Kaggle)

```bash
pip install prophet
```

If that doesn't work:

```bash
pip install pystan==2.19.1.1
pip install prophet
```

---

### "CORS policy blocked" (Browser console)

Your FastAPI backend is missing the CORS middleware. In `main.py`, confirm this block exists:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### "Map shows a blank gray box" (Frontend)

Two possible causes:

1. Missing Leaflet CSS import. In `main.tsx`:

```typescript
import 'leaflet/dist/leaflet.css';
```

2. Missing tile attribution. CartoDB requires proper attribution. Ensure the TileLayer has the `attribution` prop.

---

### "Simulator returns NaN" (Frontend)

The backend returned a numpy float64 that JSON serialized wrong. In your backend endpoint, wrap all numeric values:

```python
return {
    "prevention_rate": float(rate),
    "violations_prevented": int(prevented),
    "congestion_reduction_pct": float(congestion),
    "revenue_inr": float(revenue),
    "commuter_minutes_saved": int(minutes),
}
```

---

### "No clusters on map" (Frontend)

The cluster centroids may be loading but with wrong lat/lng column names. In the backend, ensure `centroid_lat` and `centroid_lng` are the exact column names returned. In the frontend MapView, ensure you're reading `cluster.centroid_lat` and `cluster.centroid_lng`.

---

### "Prophet training crashes" (Kaggle)

If daily violation count for a cluster is too low (< 20 days of data), Prophet will fail. The training code already skips clusters with `< 20` days. If you get a generic crash:

```python
# Add this before Prophet training:
from prophet.diagnostics import cross_validation
import logging
logging.getLogger('prophet').setLevel(logging.ERROR)
logging.getLogger('cmdstanpy').setLevel(logging.ERROR)
```

---

### "risk_score column missing in clusters" (Backend error)

If cluster_metadata.csv doesn't have a `risk_score` column, it means the Kaggle Cell 9 didn't complete. Re-run Cell 9, re-download cluster_metadata.csv, and replace the file in your `data/` folder.

---

# FINAL PROJECT STRUCTURE

After everything is done, your computer should have this:

```
margdristi/
├── notebooks/
│   └── margdristi_kaggle.ipynb  ← your Kaggle notebook (keep public)
│
├── data/
│   ├── violations_clean.csv
│   ├── violations_clustered.csv
│   ├── cluster_metadata.csv
│   ├── temporal_hourly_city.csv
│   ├── temporal_heatmap_matrix.csv
│   └── prophet_forecasts.csv
│
├── models/
│   ├── dbscan_model.pkl
│   ├── simulator_model.pkl
│   └── prophet_cluster_N.pkl  (multiple files)
│
├── margdristi-backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── data/ → (symlink or copy of ../data/)
│   ├── models/ → (symlink or copy of ../models/)
│   ├── routers/
│   ├── ml/
│   ├── schemas/
│   └── utils/
│
└── margdristi-frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── index.css
    │   ├── api/
    │   ├── types/
    │   ├── store/
    │   ├── components/
    │   ├── pages/
    │   └── hooks/
    └── dist/ → (built files, after npm run build)
```

---

# TO RUN THE FULL PROTOTYPE

Terminal 1 — Backend:
```bash
cd margdristi-backend
source venv/bin/activate   # or: venv\Scripts\activate on Windows
uvicorn main:app --reload --port 8000
```

Terminal 2 — Frontend:
```bash
cd margdristi-frontend
npm run dev
```

Open browser: `http://localhost:5173`

That is MargDristi. Running locally. Ready to demo.

---

*MargDristi — Vision for Every Road. Built for Bengaluru Traffic Police.*
