import glob
import io
import joblib
import pickle
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import requests

# Config imports – use try/except so the loader works even when imported
# from outside the backend package during testing.
try:
    from config import DATA_DIR, HF_DATASET_URLS, get_cache_dir  # type: ignore
except ModuleNotFoundError:
    from backend.config import DATA_DIR, HF_DATASET_URLS, get_cache_dir  # type: ignore


class ModelLoader:
    def __init__(self, models_dir: Path, data_dir: Path):
        self.models_dir = Path(models_dir)
        self.data_dir = Path(data_dir)
        self.dbscan = None
        self.simulator = None
        self.prophet: Dict[int, object] = {}
        self.clusters = None
        self.violations = None
        self.hourly = None
        self.heatmap = None
        self.forecasts = None
        # Parking data
        self.parking_violations = None
        self.parking_hotspots = None
        self.parking_heatmap = None
        self.parking_deployments = None
        self.status = {}

    def load_all(self) -> None:
        self._load_dbscan()
        self._load_simulator()
        self._load_prophet_models()
        self._load_dataframes()
        self._load_parking_data()

    def _load_dbscan(self) -> None:
        path = self.models_dir / "hdbscan_model.pkl"
        try:
            self.dbscan = joblib.load(path)
            self.status["dbscan"] = True
        except Exception:
            self.status["dbscan"] = False

    def _load_simulator(self) -> None:
        path = self.models_dir / "simulator_model.pkl"
        try:
            self.simulator = joblib.load(path)
            self.status["simulator"] = True
        except Exception:
            self.status["simulator"] = False

    def _load_prophet_models(self) -> None:
        pattern = self.models_dir / "prophet_cluster_*.pkl"
        files = glob.glob(str(pattern))
        loaded = 0
        for file_path in files:
            try:
                cluster_id = int(Path(file_path).stem.split("_")[-1])
                with open(file_path, "rb") as model_file:
                    self.prophet[cluster_id] = pickle.load(model_file)
                loaded += 1
            except Exception:
                continue
        self.status["prophet_models_loaded"] = loaded

    def _load_dataframes(self) -> None:
        self.clusters = self._load_csv("cluster_metadata.csv")
        self.violations = self._load_csv("violations_clustered.csv")
        self.hourly = self._load_csv("temporal_hourly_city.csv")
        self.heatmap = self._load_csv("temporal_heatmap_matrix.csv")
        self.forecasts = self._load_csv("prophet_forecasts.csv")

        self.status["clusters"] = self.clusters is not None
        self.status["violations"] = self.violations is not None
        self.status["hourly"] = self.hourly is not None
        self.status["heatmap"] = self.heatmap is not None
        self.status["forecasts"] = self.forecasts is not None

    def _load_parking_data(self) -> None:
        """Load parking-related data for the new parking intelligence module."""
        self.parking_violations = self._load_csv("parking_violations.csv")
        self.parking_hotspots = self._load_csv("parking_hotspots.csv")
        self.parking_heatmap = self._load_csv("parking_temporal_heatmap.csv")
        
        self.status["parking_violations"] = self.parking_violations is not None
        self.status["parking_hotspots"] = self.parking_hotspots is not None
        self.status["parking_heatmap"] = self.parking_heatmap is not None

    def _load_csv(self, name: str):
        """Load a CSV by name.

        Resolution order:
        1. If the file is one of the HuggingFace-hosted datasets:
           a. Check the cache directory; load from cache if present.
           b. Otherwise download from HuggingFace, save to cache, then load.
        2. For every other CSV, load directly from the data directory.
        """
        if name in HF_DATASET_URLS:
            return self._load_hf_csv(name)

        path = self.data_dir / name
        try:
            return pd.read_csv(path)
        except FileNotFoundError:
            print(f"[loader] WARNING: local file not found: {path}")
            return None
        except pd.errors.ParserError as exc:
            print(f"[loader] ERROR: corrupted CSV '{name}': {exc}")
            return None
        except Exception as exc:
            print(f"[loader] ERROR loading '{name}': {exc}")
            return None

    def _load_hf_csv(self, name: str):
        """Download from HuggingFace (with local caching) or load from cache."""
        url = HF_DATASET_URLS[name]
        cache_dir = get_cache_dir()
        cached_path = cache_dir / name

        # ── 1. Cache hit ──────────────────────────────────────────────────────
        if cached_path.exists():
            print(f"[loader] Loading dataset from cache: {cached_path}")
            try:
                df = pd.read_csv(cached_path)
                if df.empty:
                    raise ValueError("Cached file is empty")
                return df
            except (pd.errors.ParserError, ValueError) as exc:
                print(f"[loader] WARNING: cached file is corrupted ({exc}), re-downloading…")
                cached_path.unlink(missing_ok=True)

        # ── 2. Cache miss – download from HuggingFace ─────────────────────────
        print(f"[loader] Downloading dataset from Hugging Face: {url}")
        try:
            response = requests.get(url, timeout=120)
            response.raise_for_status()
        except requests.exceptions.ConnectionError as exc:
            print(f"[loader] ERROR: network failure while downloading '{name}': {exc}")
            return None
        except requests.exceptions.Timeout:
            print(f"[loader] ERROR: request timed out while downloading '{name}'")
            return None
        except requests.exceptions.HTTPError as exc:
            print(f"[loader] ERROR: HTTP {exc.response.status_code} while downloading '{name}'")
            return None
        except requests.exceptions.RequestException as exc:
            print(f"[loader] ERROR: unexpected error while downloading '{name}': {exc}")
            return None

        # ── 3. Validate the downloaded content ────────────────────────────────
        try:
            df = pd.read_csv(io.StringIO(response.text))
            if df.empty:
                raise ValueError("Downloaded CSV has no rows")
        except (pd.errors.ParserError, ValueError) as exc:
            print(f"[loader] ERROR: downloaded '{name}' is not a valid CSV: {exc}")
            return None

        # ── 4. Persist to cache ───────────────────────────────────────────────
        try:
            cache_dir.mkdir(parents=True, exist_ok=True)
            cached_path.write_bytes(response.content)
            print(f"[loader] Dataset cache created successfully: {cached_path}")
        except OSError as exc:
            # Cache write failure is non-fatal – we already have the DataFrame
            print(f"[loader] WARNING: could not write cache for '{name}': {exc}")

        return df

    def is_ready(self) -> bool:
        """Core data CSVs are the source of truth for all API endpoints.
        HDBSCAN and Prophet models are optional; their absence causes degraded
        (not broken) operation — forecasts and cluster similarity won't work
        but the main dashboard data will be served normally."""
        return (
            self.clusters is not None and
            self.violations is not None
        )


    def predict_simulator(self, cluster_id: int, num_officers: int, hour: int, day_of_week: int) -> float:
        if self.simulator is None or self.clusters is None:
            return 0.0
        cluster_row = self.clusters[self.clusters["cluster_id"] == cluster_id]
        if cluster_row.empty:
            return 0.0

        daily_avg = float(cluster_row["violation_count"].iloc[0]) / 150.0
        tier = cluster_row["tier"].iloc[0]
        tier1 = 1 if tier == "Tier 1" else 0
        tier2 = 1 if tier == "Tier 2" else 0
        peak_hour = 1 if 8 <= hour <= 18 else 0
        features = np.array([[cluster_id, num_officers, hour, daily_avg, tier1, tier2, peak_hour]])
        try:
            prediction = self.simulator.predict(features)
            return float(prediction[0])
        except Exception:
            return 0.0

    def get_cluster(self, cluster_id: int) -> Optional[Dict]:
        if self.clusters is None:
            return None
        row = self.clusters[self.clusters["cluster_id"] == cluster_id]
        if row.empty:
            return None
        return row.iloc[0].to_dict()

    def get_top_clusters(self, n: int = 20, tier: Optional[str] = None) -> List[Dict]:
        if self.clusters is None:
            return []
        df = self.clusters
        if tier:
            df = df[df["tier"] == tier]
        top = df.sort_values(by="risk_score", ascending=False).head(n)
        return top.to_dict(orient="records")

    def get_forecast(self, cluster_id: int, days: int = 7) -> List[Dict]:
        if self.forecasts is None:
            return []
        df = self.forecasts[self.forecasts["cluster_id"] == cluster_id]
        if df.empty:
            return []
        df = df.sort_values(by="ds").tail(days)
        return [
            {
                "date": str(row["ds"]),
                "predicted": int(round(max(0, row["yhat"]))),
                "lower": int(round(max(0, row["yhat_lower"]))),
                "upper": int(round(max(0, row["yhat_upper"]))),
            }
            for _, row in df.iterrows()
        ]

    def get_hourly_pattern(self, cluster_id: Optional[int] = None) -> List[Dict]:
        if cluster_id is None:
            if self.hourly is None:
                return []
            return [
                {"hour": int(row["hour"]), "count": int(row["count"])}
                for _, row in self.hourly.iterrows()
            ]
        if self.violations is None:
            return []
        df = self.violations[self.violations["cluster_id"] == cluster_id]
        if df.empty:
            return []
        grouped = df.groupby("hour")["violation_count"].sum().reset_index()
        return [
            {"hour": int(row["hour"]), "count": int(row["violation_count"])}
            for _, row in grouped.iterrows()
        ]

    def get_violation_types(self, cluster_id: int, top_n: int = 10) -> List[Dict]:
        """Return top violation types and their counts for a cluster."""
        if self.violations is None:
            return []
        df = self.violations[self.violations["cluster_id"] == cluster_id]
        if df.empty:
            return []
        grouped = df.groupby("primary_violation").size().reset_index(name="count")
        grouped = grouped.sort_values("count", ascending=False).head(top_n)
        return [
            {"violation_type": str(row["primary_violation"]), "count": int(row["count"])}
            for _, row in grouped.iterrows()
        ]

    def get_vehicle_types(self, cluster_id: int, top_n: int = 10) -> List[Dict]:
        """Return vehicle type distribution for a cluster."""
        if self.violations is None:
            return []
        df = self.violations[self.violations["cluster_id"] == cluster_id]
        if df.empty:
            return []
        grouped = df.groupby("vehicle_type").size().reset_index(name="count")
        grouped = grouped.sort_values("count", ascending=False).head(top_n)
        total = int(grouped["count"].sum())
        return [
            {
                "vehicle_type": str(row["vehicle_type"]),
                "count": int(row["count"]),
                "pct": round(100 * int(row["count"]) / total, 1) if total > 0 else 0.0,
            }
            for _, row in grouped.iterrows()
        ]

    def get_heatmap_matrix(self, cluster_id: Optional[int] = None) -> Dict:
        matrix = {}
        if self.heatmap is None:
            return matrix
        if cluster_id is not None:
            if self.violations is None:
                return matrix
            df = self.violations[self.violations["cluster_id"] == cluster_id]
            if df.empty:
                return matrix
            pivot = df.pivot_table(index="day_name", columns="hour", values="violation_count", aggfunc="sum", fill_value=0)
            for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
                if day in pivot.index:
                    matrix[day] = {int(hour): int(pivot.loc[day, hour]) for hour in pivot.columns}
                else:
                    matrix[day] = {int(hour): 0 for hour in pivot.columns}
            return matrix

        for _, row in self.heatmap.iterrows():
            day_name = row["Unnamed: 0"] if "Unnamed: 0" in row else row.index[0]
            day_label = str(day_name)[:3]
            matrix[day_label] = {
                int(col): int(row[col])
                for col in self.heatmap.columns
                if str(col) != "Unnamed: 0"
            }
        return matrix

    # ==================== Parking Methods ====================

    def get_parking_hotspots(self) -> List[Dict]:
        """Return all parking hotspots ranked by priority."""
        if self.parking_hotspots is None:
            return []
        return self.parking_hotspots.sort_values("priority_score", ascending=False).to_dict(orient="records")

    def get_parking_hotspot(self, cluster_id: int) -> Optional[Dict]:
        """Get parking hotspot details for a specific cluster."""
        if self.parking_hotspots is None:
            return None
        row = self.parking_hotspots[self.parking_hotspots["cluster_id"] == cluster_id]
        if row.empty:
            return None
        return row.iloc[0].to_dict()

    def get_parking_violations_by_cluster(self, cluster_id: int) -> List[Dict]:
        """Get all parking violations for a cluster."""
        if self.parking_violations is None:
            return []
        df = self.parking_violations[self.parking_violations["cluster_id"] == cluster_id]
        return df.to_dict(orient="records")

    def get_parking_priorities(self) -> List[Dict]:
        """Calculate and return parking enforcement priorities ranked by impact."""
        if self.parking_hotspots is None:
            return []
        
        df = self.parking_hotspots.copy()
        df["recommended_officers"] = df.apply(
            lambda row: max(2, min(8, int(row["parking_violation_count"] / 2))), axis=1
        )
        df["priority_rank"] = range(1, len(df) + 1)
        
        priorities = []
        for _, row in df.iterrows():
            priorities.append({
                "cluster_id": int(row["cluster_id"]),
                "zone_name": str(row["zone_name"]),
                "priority_rank": int(row["priority_rank"]),
                "priority_score": float(row["priority_score"]),
                "violation_count": int(row["parking_violation_count"]),
                "congestion_impact": float(row["avg_congestion_impact_pct"]),
                "peak_hours": str(row["peak_hours"]),
                "location_context": str(row["location_context"]),
                "recommended_officers": int(row["recommended_officers"]),
                "enforcement_gap_hours": float(row["enforcement_gap"]),
            })
        
        return sorted(priorities, key=lambda x: x["priority_score"], reverse=True)

    def get_parking_heatmap_matrix(self) -> Dict:
        """Get temporal heatmap for parking violations."""
        matrix = {}
        if self.parking_heatmap is None:
            return matrix
        
        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        for _, row in self.parking_heatmap.iterrows():
            day_name = str(row.iloc[0]) if len(row) > 0 else None
            if day_name and day_name in day_order:
                day_short = day_name[:3]
                matrix[day_short] = {}
                for hour in range(24):
                    col_name = f"hour_{hour}"
                    if col_name in self.parking_heatmap.columns:
                        matrix[day_short][hour] = int(row[col_name])
                    else:
                        matrix[day_short][hour] = 0
        
        return matrix

    def add_parking_deployment(self, cluster_id: int, officers: int, deploy_date: str) -> str:
        """Record a parking enforcement deployment."""
        import uuid
        deployment_id = str(uuid.uuid4())[:8]
        
        if self.parking_deployments is None:
            self.parking_deployments = pd.DataFrame(columns=[
                "deployment_id", "cluster_id", "officers", "deploy_date", "violations_before", "violations_after"
            ])
        
        new_deployment = {
            "deployment_id": deployment_id,
            "cluster_id": cluster_id,
            "officers": officers,
            "deploy_date": deploy_date,
            "violations_before": 0,
            "violations_after": 0,
        }
        
        self.parking_deployments = pd.concat(
            [self.parking_deployments, pd.DataFrame([new_deployment])],
            ignore_index=True
        )
        
        return deployment_id

    def get_parking_effectiveness(self, cluster_id: Optional[int] = None) -> List[Dict]:
        """Get enforcement effectiveness metrics for parking."""
        if self.parking_deployments is None:
            return []
        
        df = self.parking_deployments
        if cluster_id is not None:
            df = df[df["cluster_id"] == cluster_id]
        
        results = []
        for _, row in df.iterrows():
            violations_before = int(row.get("violations_before", 0))
            violations_after = int(row.get("violations_after", 0))
            prevention = violations_before - violations_after
            prevention_rate = (prevention / violations_before * 100) if violations_before > 0 else 0
            
            results.append({
                "cluster_id": int(row["cluster_id"]),
                "deployment_id": str(row["deployment_id"]),
                "deploy_date": str(row["deploy_date"]),
                "officers_deployed": int(row["officers"]),
                "violations_before": violations_before,
                "violations_after": violations_after,
                "prevention_rate_pct": round(prevention_rate, 1),
                "congestion_reduction_pct": round(prevention_rate * 0.8, 1),
                "commuter_minutes_saved": int(prevention * 2.5),
                "enforcement_cost_inr": int(row["officers"]) * 500,
            })
        
        return results


loader = ModelLoader(
    models_dir=Path(__file__).resolve().parent.parent.parent / "models",
    data_dir=DATA_DIR,
)
# Note: loader.load_all() is called by the FastAPI startup event in main.py.
# Do NOT call it here — it would load all data twice at startup.

