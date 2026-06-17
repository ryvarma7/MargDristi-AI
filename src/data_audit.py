"""
MargDristi AI — Bengaluru Traffic Police Parking Violation Dataset Audit
==========================================================================
Senior Data Scientist analysis covering:
  1. Data quality issues
  2. Missing value detection
  3. GPS coordinate validation
  4. Temporal coverage analysis
  5. Violation distribution
  6. Vehicle distribution
  7. Police station distribution
  8. Junction distribution
  9. Feature retention recommendations
 10. Feature drop recommendations
 11. Feature engineering suggestions

Output: JSON summary + Markdown engineering report written to docs/data_audit.md
"""

import os
import sys
import json
import math
import warnings
from pathlib import Path
from datetime import datetime

warnings.filterwarnings("ignore")

# ── Dependencies ────────────────────────────────────────────────────────────────
try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Installing required packages...")
    os.system("pip install pandas numpy")
    import pandas as pd
    import numpy as np

# ── Paths ───────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
DATASET    = BASE_DIR / "Datasets" / "jan to may police violation_anonymized791b166.csv"
REPORT_OUT = BASE_DIR / "docs" / "data_audit.md"
JSON_OUT   = BASE_DIR / "outputs" / "data_audit_summary.json"

# Bengaluru bounding box (approx.)
BLR_LAT_MIN, BLR_LAT_MAX = 12.70, 13.20
BLR_LON_MIN, BLR_LON_MAX = 77.40, 77.85

# ── Helpers ─────────────────────────────────────────────────────────────────────
def pct(n, total): return round(100 * n / total, 4) if total else 0.0

def section(title):
    bar = "=" * 72
    print(f"\n{bar}\n  {title}\n{bar}")

def fmt_num(n):
    return f"{n:,}"

# ── 1. Load Dataset ─────────────────────────────────────────────────────────────
section("1 · Loading Dataset")

print(f"Dataset path : {DATASET}")
print(f"File size    : {DATASET.stat().st_size / 1_048_576:.2f} MB")

df = pd.read_csv(DATASET, low_memory=False)
TOTAL_ROWS = len(df)
TOTAL_COLS = len(df.columns)

print(f"Rows         : {fmt_num(TOTAL_ROWS)}")
print(f"Columns      : {TOTAL_COLS}")
print(f"Columns list : {list(df.columns)}")
print(df.dtypes)

# ── 2. Missing Values ───────────────────────────────────────────────────────────
section("2 · Missing Value Analysis")

missing = df.isnull().sum()
missing_pct = (missing / TOTAL_ROWS * 100).round(4)
missing_df = pd.DataFrame({
    "missing_count": missing,
    "missing_pct": missing_pct
}).sort_values("missing_pct", ascending=False)

print(missing_df[missing_df["missing_count"] > 0].to_string())

# ── 3. Duplicate Detection ──────────────────────────────────────────────────────
section("3 · Duplicate Detection")

dup_full   = df.duplicated().sum()
print(f"Full-row duplicates: {fmt_num(dup_full)} ({pct(dup_full, TOTAL_ROWS)}%)")

# ── 4. Data Types & Cardinality ─────────────────────────────────────────────────
section("4 · Data Types & Cardinality")

type_info = []
for col in df.columns:
    nuniq = df[col].nunique(dropna=False)
    dtype = str(df[col].dtype)
    sample_vals = df[col].dropna().head(3).tolist()
    type_info.append({
        "column": col,
        "dtype": dtype,
        "nunique": nuniq,
        "sample": sample_vals
    })
    print(f"  {col:<40} dtype={dtype:<10} nunique={nuniq:<8} sample={sample_vals}")

# ── 5. GPS Coordinate Validation ────────────────────────────────────────────────
section("5 · GPS Coordinate Validation")

# Detect lat/lon columns (flexible naming)
lat_candidates = [c for c in df.columns if any(k in c.lower() for k in ["lat", "latitude"])]
lon_candidates = [c for c in df.columns if any(k in c.lower() for k in ["lon", "longitude", "lng"])]
print(f"Latitude  columns detected : {lat_candidates}")
print(f"Longitude columns detected : {lon_candidates}")

gps_stats = {}

for lat_col in lat_candidates:
    for lon_col in lon_candidates:
        lat_s = pd.to_numeric(df[lat_col], errors="coerce")
        lon_s = pd.to_numeric(df[lon_col], errors="coerce")

        lat_null  = lat_s.isnull().sum()
        lon_null  = lon_s.isnull().sum()
        lat_zero  = (lat_s == 0).sum()
        lon_zero  = (lon_s == 0).sum()
        both_zero = ((lat_s == 0) & (lon_s == 0)).sum()

        out_of_range = (
            (lat_s < BLR_LAT_MIN) | (lat_s > BLR_LAT_MAX) |
            (lon_s < BLR_LON_MIN) | (lon_s > BLR_LON_MAX)
        ) & lat_s.notnull() & lon_s.notnull()

        swapped = (
            (lat_s >= BLR_LON_MIN) & (lat_s <= BLR_LON_MAX) &
            (lon_s >= BLR_LAT_MIN) & (lon_s <= BLR_LAT_MAX)
        )
        swapped_count = swapped.sum()

        print(f"\n  Pair: ({lat_col}, {lon_col})")
        print(f"    Null lat      : {fmt_num(lat_null)}  ({pct(lat_null, TOTAL_ROWS)}%)")
        print(f"    Null lon      : {fmt_num(lon_null)}  ({pct(lon_null, TOTAL_ROWS)}%)")
        print(f"    Zero lat      : {fmt_num(lat_zero)}  ({pct(lat_zero, TOTAL_ROWS)}%)")
        print(f"    Zero lon      : {fmt_num(lon_zero)}  ({pct(lon_zero, TOTAL_ROWS)}%)")
        print(f"    Both zero     : {fmt_num(both_zero)}  ({pct(both_zero, TOTAL_ROWS)}%)")
        print(f"    Out-of-Blr    : {fmt_num(out_of_range.sum())}  ({pct(out_of_range.sum(), TOTAL_ROWS)}%)")
        print(f"    Possibly swapped: {fmt_num(swapped_count)}")

        if lat_s.notnull().any():
            print(f"    Lat range     : [{lat_s.min():.6f}, {lat_s.max():.6f}]")
            print(f"    Lon range     : [{lon_s.min():.6f}, {lon_s.max():.6f}]")

        gps_stats[f"{lat_col}|{lon_col}"] = {
            "lat_null": int(lat_null), "lon_null": int(lon_null),
            "lat_zero": int(lat_zero), "lon_zero": int(lon_zero),
            "both_zero": int(both_zero),
            "out_of_bengaluru": int(out_of_range.sum()),
            "possibly_swapped": int(swapped_count)
        }

# ── 6. Temporal Coverage ────────────────────────────────────────────────────────
section("6 · Temporal Coverage Analysis")

date_candidates = [c for c in df.columns if any(k in c.lower() for k in ["date", "time", "datetime", "timestamp", "challan"])]
print(f"Date/time columns detected: {date_candidates}")

temporal_stats = {}

for col in date_candidates:
    try:
        parsed = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
        valid  = parsed.dropna()
        if len(valid) == 0:
            continue

        date_min   = valid.min()
        date_max   = valid.max()
        date_range = (date_max - date_min).days
        null_dates = parsed.isnull().sum()

        # Monthly distribution
        monthly = valid.dt.to_period("M").value_counts().sort_index()

        # Day-of-week
        dow = valid.dt.day_name().value_counts()

        # Hour distribution
        hourly = valid.dt.hour.value_counts().sort_index()

        print(f"\n  Column: {col}")
        print(f"    Valid dates     : {fmt_num(len(valid))} / {fmt_num(TOTAL_ROWS)}")
        print(f"    Null dates      : {fmt_num(null_dates)} ({pct(null_dates, TOTAL_ROWS)}%)")
        print(f"    Date range      : {date_min.date()} → {date_max.date()} ({date_range} days)")
        print(f"    Monthly counts  :\n{monthly.to_string()}")
        print(f"    Top days-of-week:\n{dow.head(7).to_string()}")
        if hourly.sum() > 0:
            print(f"    Hourly dist     :\n{hourly.to_string()}")

        temporal_stats[col] = {
            "min": str(date_min.date()),
            "max": str(date_max.date()),
            "range_days": date_range,
            "null_count": int(null_dates),
            "monthly": {str(k): int(v) for k, v in monthly.items()},
            "day_of_week": {str(k): int(v) for k, v in dow.items()},
            "hourly": {str(k): int(v) for k, v in hourly.items()} if len(hourly) > 1 else {}
        }
    except Exception as e:
        print(f"  Could not parse {col}: {e}")

# ── 7. Violation Distribution ───────────────────────────────────────────────────
section("7 · Violation Distribution")

violation_cols = [c for c in df.columns if any(k in c.lower() for k in ["violation", "offence", "offense", "section", "act", "challan_type", "fine"])]
print(f"Violation-related columns: {violation_cols}")

violation_stats = {}
for col in violation_cols:
    vc = df[col].value_counts(dropna=False)
    total_unique = df[col].nunique()
    print(f"\n  {col} — {total_unique} unique values")
    print(vc.head(20).to_string())
    violation_stats[col] = {
        "unique_count": int(total_unique),
        "top_values": {str(k): int(v) for k, v in vc.head(20).items()}
    }

# ── 8. Vehicle Distribution ─────────────────────────────────────────────────────
section("8 · Vehicle Distribution")

vehicle_cols = [c for c in df.columns if any(k in c.lower() for k in ["vehicle", "veh", "rc", "registration", "plate", "number"])]
print(f"Vehicle-related columns: {vehicle_cols}")

vehicle_stats = {}
for col in vehicle_cols:
    vc = df[col].value_counts(dropna=False)
    nuniq = df[col].nunique(dropna=True)
    print(f"\n  {col} — {fmt_num(nuniq)} unique values (top 15):")
    print(vc.head(15).to_string())
    vehicle_stats[col] = {
        "unique_count": int(nuniq),
        "top_values": {str(k): int(v) for k, v in vc.head(15).items()}
    }

# ── 9. Police Station Distribution ─────────────────────────────────────────────
section("9 · Police Station Distribution")

ps_cols = [c for c in df.columns if any(k in c.lower() for k in ["station", "ps", "police", "circle", "division", "zone"])]
print(f"Police station columns: {ps_cols}")

ps_stats = {}
for col in ps_cols:
    vc = df[col].value_counts(dropna=False)
    print(f"\n  {col} — {df[col].nunique()} unique values (top 20):")
    print(vc.head(20).to_string())
    ps_stats[col] = {
        "unique_count": int(df[col].nunique()),
        "top_values": {str(k): int(v) for k, v in vc.head(20).items()}
    }

# ── 10. Junction Distribution ───────────────────────────────────────────────────
section("10 · Junction / Location Distribution")

junc_cols = [c for c in df.columns if any(k in c.lower() for k in ["junction", "location", "place", "spot", "area", "road", "street"])]
print(f"Junction/location columns: {junc_cols}")

junction_stats = {}
for col in junc_cols:
    vc = df[col].value_counts(dropna=False)
    print(f"\n  {col} — {df[col].nunique()} unique values (top 20):")
    print(vc.head(20).to_string())
    junction_stats[col] = {
        "unique_count": int(df[col].nunique()),
        "top_values": {str(k): int(v) for k, v in vc.head(20).items()}
    }

# ── 11. Fine / Amount Distribution ─────────────────────────────────────────────
section("11 · Fine / Amount Distribution")

fine_cols = [c for c in df.columns if any(k in c.lower() for k in ["amount", "fine", "penalty", "fee", "paid", "due"])]
print(f"Fine/amount columns: {fine_cols}")

fine_stats = {}
for col in fine_cols:
    series = pd.to_numeric(df[col], errors="coerce")
    if series.notnull().sum() > 0:
        desc = series.describe()
        print(f"\n  {col}:")
        print(desc)
        fine_stats[col] = {k: round(float(v), 2) for k, v in desc.items()}
    else:
        vc = df[col].value_counts(dropna=False).head(15)
        print(f"\n  {col} (categorical):")
        print(vc.to_string())
        fine_stats[col] = {"type": "categorical", "top_values": {str(k): int(v) for k, v in vc.items()}}

# ── 12. Constant / Near-Constant Columns ────────────────────────────────────────
section("12 · Constant / Near-Constant Columns")

const_cols = []
quasi_const_cols = []

for col in df.columns:
    vc = df[col].value_counts(normalize=True, dropna=False)
    if vc.iloc[0] >= 1.00:
        const_cols.append(col)
        print(f"  CONSTANT     : {col} → all = {repr(df[col].iloc[0])}")
    elif vc.iloc[0] >= 0.99:
        quasi_const_cols.append(col)
        print(f"  QUASI-CONST  : {col} → {vc.iloc[0]*100:.2f}% = {repr(vc.index[0])}")

print(f"\n  Total constant     : {len(const_cols)}")
print(f"  Total quasi-const  : {len(quasi_const_cols)}")

# ── 13. Free-text / High-cardinality Detection ──────────────────────────────────
section("13 · High-Cardinality & Free-Text Detection")

high_card = []
for col in df.columns:
    nuniq = df[col].nunique(dropna=True)
    fill_rate = df[col].notnull().mean()
    ratio = nuniq / (TOTAL_ROWS * fill_rate) if fill_rate > 0 else 0
    if ratio > 0.5 and nuniq > 1000:
        high_card.append((col, nuniq, round(ratio, 4)))
        print(f"  HIGH CARDINALITY: {col:<40} nuniq={fmt_num(nuniq):<10} ratio={ratio:.4f}")

# ── 14. Summary Aggregation ─────────────────────────────────────────────────────
section("14 · Summary Aggregation")

# Collect all column names for classification
all_cols = list(df.columns)
missing_cols   = list(missing_df[missing_df["missing_pct"] > 0].index)
zero_var_cols  = const_cols + quasi_const_cols
high_card_cols = [c[0] for c in high_card]

print(f"Total columns       : {TOTAL_COLS}")
print(f"Columns w/ missing  : {len(missing_cols)}")
print(f"Constant cols       : {len(const_cols)}")
print(f"Quasi-constant cols : {len(quasi_const_cols)}")
print(f"High-cardinality    : {len(high_card_cols)}")

# Compile full audit summary
summary = {
    "generated_at": datetime.now().isoformat(),
    "dataset": str(DATASET),
    "total_rows": TOTAL_ROWS,
    "total_columns": TOTAL_COLS,
    "columns": all_cols,
    "missing_values": {
        col: {
            "count": int(missing[col]),
            "pct": float(missing_pct[col])
        }
        for col in all_cols if missing[col] > 0
    },
    "duplicates": {
        "full_row_duplicates": int(dup_full),
        "full_row_dup_pct": pct(dup_full, TOTAL_ROWS)
    },
    "cardinality": {r["column"]: r["nunique"] for r in type_info},
    "constant_columns": const_cols,
    "quasi_constant_columns": quasi_const_cols,
    "high_cardinality_columns": high_card_cols,
    "gps_stats": gps_stats,
    "temporal_stats": temporal_stats,
    "violation_stats": violation_stats,
    "vehicle_stats": vehicle_stats,
    "police_station_stats": ps_stats,
    "junction_stats": junction_stats,
    "fine_stats": fine_stats
}

JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
with open(JSON_OUT, "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, default=str)
print(f"\nJSON summary saved → {JSON_OUT}")

# ── 15. Print raw info for report generation ─────────────────────────────────────
print("\n\n=== RAW COLUMN DUMP FOR REPORT ===")
print(json.dumps({
    "columns": all_cols,
    "dtypes": {col: str(df[col].dtype) for col in df.columns},
    "missing_pct": {col: float(missing_pct[col]) for col in df.columns},
    "nunique": {col: int(df[col].nunique(dropna=True)) for col in df.columns},
    "const_cols": const_cols,
    "quasi_const_cols": quasi_const_cols,
    "high_card_cols": high_card_cols,
    "sample_rows": df.head(3).to_dict(orient="records")
}, indent=2, default=str))

print("\n\n=== AUDIT SCRIPT COMPLETE ===")
