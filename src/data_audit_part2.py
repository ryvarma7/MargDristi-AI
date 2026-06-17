"""
MargDristi AI - Data Audit Part 2
Handles: constant columns, temporal analysis, summary JSON
Uses ASCII-safe output to avoid Windows cp1252 issues.
"""
import os, sys, json, warnings
from pathlib import Path
from datetime import datetime

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

warnings.filterwarnings("ignore")
import pandas as pd
import numpy as np

BASE_DIR  = Path(__file__).resolve().parent.parent
DATASET   = BASE_DIR / "Datasets" / "jan to may police violation_anonymized791b166.csv"
JSON_OUT  = BASE_DIR / "outputs" / "data_audit_summary.json"

print("Loading dataset...")
df = pd.read_csv(DATASET, low_memory=False)
TOTAL = len(df)
print(f"Rows: {TOTAL:,}  |  Cols: {len(df.columns)}")

# ── Temporal Analysis (full) ────────────────────────────────────────────────────
print("\n=== TEMPORAL ANALYSIS ===")
temporal_stats = {}

for col in ['created_datetime', 'modified_datetime', 'data_sent_to_scita_timestamp', 'validation_timestamp']:
    parsed = pd.to_datetime(df[col], errors='coerce', utc=True)
    valid  = parsed.dropna()
    print(f"\n[{col}]")
    print(f"  Valid  : {len(valid):,}  |  Null: {parsed.isnull().sum():,}")
    if len(valid) == 0:
        continue
    print(f"  Min    : {valid.min()}")
    print(f"  Max    : {valid.max()}")
    
    monthly = valid.dt.to_period('M').value_counts().sort_index()
    print("  Monthly distribution:")
    for period, cnt in monthly.items():
        print(f"    {period}: {cnt:,}")
    
    dow = valid.dt.day_name().value_counts()
    print("  Day of week:")
    for day, cnt in dow.items():
        print(f"    {day}: {cnt:,}")
    
    hourly = valid.dt.hour.value_counts().sort_index()
    print("  Hourly distribution:")
    for hr, cnt in hourly.items():
        print(f"    {hr:02d}h: {cnt:,}")
    
    temporal_stats[col] = {
        'min': str(valid.min()),
        'max': str(valid.max()),
        'range_days': (valid.max() - valid.min()).days,
        'null_count': int(parsed.isnull().sum()),
        'monthly': {str(k): int(v) for k,v in monthly.items()},
        'dow': {str(k): int(v) for k,v in dow.items()},
        'hourly': {str(k): int(v) for k,v in hourly.items()}
    }

# ── Constant / Quasi-Constant ───────────────────────────────────────────────────
print("\n=== CONSTANT / QUASI-CONSTANT COLUMNS ===")
const_cols, quasi_cols = [], []
for col in df.columns:
    vc = df[col].value_counts(normalize=True, dropna=False)
    top_val = vc.index[0]
    top_pct = vc.iloc[0]
    if top_pct >= 1.00:
        const_cols.append(col)
        print(f"  CONSTANT    : {col} => all = {repr(top_val)}")
    elif top_pct >= 0.95:
        quasi_cols.append(col)
        print(f"  QUASI-CONST : {col} => {top_pct*100:.2f}% = {repr(top_val)}")

print(f"\nTotal constant: {len(const_cols)}")
print(f"Total quasi-const: {len(quasi_cols)}")

# ── High-Cardinality ────────────────────────────────────────────────────────────
print("\n=== HIGH CARDINALITY COLUMNS ===")
high_card = []
for col in df.columns:
    nuniq = df[col].nunique(dropna=True)
    fill  = df[col].notnull().mean()
    ratio = nuniq / (TOTAL * fill) if fill > 0 else 0
    if ratio > 0.5 and nuniq > 1000:
        high_card.append(col)
        print(f"  {col}: nuniq={nuniq:,}  ratio={ratio:.4f}")

# ── validation_status breakdown ─────────────────────────────────────────────────
print("\n=== VALIDATION STATUS ===")
vs = df['validation_status'].value_counts(dropna=False)
print(vs.to_string())

# ── data_sent_to_scita breakdown ────────────────────────────────────────────────
print("\n=== DATA SENT TO SCITA ===")
sc = df['data_sent_to_scita'].value_counts(dropna=False)
print(sc.to_string())

# ── offence_code unique codes extraction ────────────────────────────────────────
print("\n=== UNIQUE OFFENCE CODES ===")
import ast
all_codes = []
for v in df['offence_code'].dropna():
    try:
        codes = ast.literal_eval(v)
        all_codes.extend(codes)
    except:
        pass
from collections import Counter
code_counts = Counter(all_codes).most_common(30)
print("Top offence codes (by frequency in multi-code records):")
for code, cnt in code_counts:
    print(f"  Code {code}: {cnt:,}")

# ── Violation type breakdown (single vs multi) ──────────────────────────────────
print("\n=== SINGLE vs MULTI VIOLATION ===")
def count_violations(x):
    try:
        return len(ast.literal_eval(x))
    except:
        return 0

viol_counts = df['violation_type'].apply(count_violations)
print(viol_counts.value_counts().sort_index().to_string())

# ── Build full JSON summary ──────────────────────────────────────────────────────
missing = df.isnull().sum()
missing_pct = (missing / TOTAL * 100).round(4)

summary = {
    "generated_at": datetime.now().isoformat(),
    "dataset": str(DATASET),
    "total_rows": TOTAL,
    "total_columns": len(df.columns),
    "columns": list(df.columns),
    "dtypes": {col: str(df[col].dtype) for col in df.columns},
    "missing_values": {
        col: {"count": int(missing[col]), "pct": float(missing_pct[col])}
        for col in df.columns if missing[col] > 0
    },
    "cardinality": {col: int(df[col].nunique(dropna=True)) for col in df.columns},
    "duplicates": {"full_row": int(df.duplicated().sum())},
    "constant_columns": const_cols,
    "quasi_constant_columns": quasi_cols,
    "high_cardinality_columns": high_card,
    "gps": {
        "lat_range": [float(df['latitude'].min()), float(df['latitude'].max())],
        "lon_range": [float(df['longitude'].min()), float(df['longitude'].max())],
        "out_of_bengaluru": int(((df['latitude'] < 12.70) | (df['latitude'] > 13.20) |
                                  (df['longitude'] < 77.40) | (df['longitude'] > 77.85)).sum())
    },
    "temporal_stats": temporal_stats,
    "validation_status": {str(k): int(v) for k,v in vs.items()},
    "data_sent_to_scita": {str(k): int(v) for k,v in sc.items()},
    "violation_type_unique": int(df['violation_type'].nunique()),
    "police_station_unique": int(df['police_station'].nunique()),
    "junction_name_unique": int(df['junction_name'].nunique()),
    "vehicle_type_distribution": {
        str(k): int(v) for k,v in df['vehicle_type'].value_counts(dropna=False).items()
    },
    "top_violation_types": {
        str(k): int(v) for k,v in df['violation_type'].value_counts().head(30).items()
    },
    "top_police_stations": {
        str(k): int(v) for k,v in df['police_station'].value_counts().head(54).items()
    },
    "top_junction_names": {
        str(k): int(v) for k,v in df['junction_name'].value_counts().head(30).items()
    },
    "offence_code_frequency": {str(k): int(v) for k,v in code_counts}
}

JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
with open(JSON_OUT, 'w', encoding='utf-8') as f:
    json.dump(summary, f, indent=2, default=str)
print(f"\nJSON saved => {JSON_OUT}")
print("\n=== PART 2 COMPLETE ===")
