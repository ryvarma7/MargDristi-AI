import glob
import joblib
import pickle
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd


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
        self.status = {}

    def load_all(self) -> None:
        self._load_dbscan()
        self._load_simulator()
        self._load_prophet_models()
        self._load_dataframes()

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

    def _load_csv(self, name: str):
        path = self.data_dir / name
        try:
            return pd.read_csv(path)
        except Exception:
            return None

    def is_ready(self) -> bool:
        return (
            self.dbscan is not None and
            self.simulator is not None and
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


loader = ModelLoader(Path(__file__).resolve().parent.parent / "models", Path(__file__).resolve().parent.parent / "data")
loader.load_all()
