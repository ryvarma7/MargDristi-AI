# MargDristi AI
## Bengaluru Traffic Intelligence & Enforcement Command Center

MargDristi is an AI-powered spatial-temporal command center platform built for the **Bengaluru Traffic Police**. The platform ingests parking violation data, clusters spatial points, forecasts violation frequencies, and simulates police officer deployments to optimize enforcement and reduce traffic congestion.

---

##  The Core Problem: The Enforcement Blindspot
During peak traffic hours (12:00 PM – 6:00 PM), on-duty traffic police officers are occupied directing vehicles at major junctions. Because they cannot leave their posts to ticket illegally parked vehicles, **over 99% of historical parking violation logs occur off-peak** (e.g., early mornings or late nights). 

This creates a massive data **blindspot**: the areas with the highest congestion and peak illegal parking are rarely logged. MargDristi resolves this by predicting peak violation zones and directing targeted patrols preemptively.

---

##  Core Architecture & Innovations
1. **HDBSCAN Spatial Hotspot Detection**: Clusters **298,450 raw parking violation GPS records** into spatial hotspot zones. HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise) extracts dense violation hotspots and filters out GPS noise without requiring a rigid global distance threshold.
2. **Congestion Impact Score (CIS)**: A custom multi-factor scoring algorithm that calculates traffic disruption per hotspot:
   $$\text{CIS} = \text{Violation Severity} \times \text{Vehicle Size Weight} \times \text{Junction Proximity} \times \text{Violation Density}$$
   *   *Violation Severity*: Wrong parking (2.5), Double parking (4.5), Footpath parking (2.0), Near Zebra Crossing (5.0).
   *   *Vehicle Size Weight*: Heavy Goods Vehicles (3.0), BMTC Buses (2.8), Cars (1.5), Two-wheelers (1.0).
   *   *Junction Proximity*: 1.4× multiplier for hotspots overlapping named junctions.
3. **Prophet Temporal Forecasting**: Time-series forecasting models trained for the top hotspots predict violation volumes 7 days in advance to enable proactive patrol schedules.
4. **XGBoost Enforcement Simulator**: Simulates patrol returns. By inputting a hotspot zone, hour, weekday, and the number of officers (1–5), the simulator predicts:
   *   Violation Prevention Rate
   *   Congestion Reduction Percentage
   *   Commuter Minutes Saved
   *   Estimated Fine Revenue (average ₹500 fine)
5. **Parking Intelligence & Deployment ROI**: Context-aware rankings (Commercial: 1.3×, Metro: 1.2×, Event: 1.4×) and real-time deployment logging that tracks effectiveness (violations before/after, ROI based on officer cost vs. commuter time saved).

---

##  Technology Stack
*   **Data Science & Machine Learning (Python)**:
    *   `pandas`, `numpy` for data manipulation.
    *   `hdbscan` for spatial clustering.
    *   `prophet` (Meta) for time-series forecasting.
    *   `xgboost` for simulator modeling.
    *   `joblib`, `pickle` for model serialization.
*   **Backend REST API (Python FastAPI)**:
    *   `FastAPI` for high-performance endpoints.
    *   `Pydantic v2` for request/response validation.
    *   `Uvicorn` as the ASGI web server.
    *   *In-Memory Caching* for data lookup (with Hugging Face fallback integration for remote dataset hosting).
*   **Frontend Dashboard (React + TypeScript)**:
    *   `Vite` for development/build.
    *   `React 18`, `TypeScript` for strict UI architecture.
    *   `Zustand` for global state store.
    *   `Tailwind CSS` for custom dark-themed control-room designs.
    *   `Leaflet.js` & `React-Leaflet` for spatial map visualization with CartoDB Dark tile layers.
    *   `Recharts` for interactive temporal graphs and vehicle/violation breakdowns.

---

##  Project Structure
```
margdristi/
├── data/                         # Small metadata & parking CSV files
├── models/                       # Serialized HDBSCAN, XGBoost, and Prophet models
├── backend/                      # Python FastAPI application
│   ├── main.py                   # API entry point
│   ├── config.py                 # Configuration and dataset loading URLs
│   ├── ml/                       # ML model loaders and estimators
│   ├── routers/                  # API endpoints (clusters, parking, enforcement)
│   ├── schemas/                  # Pydantic validation schemas
│   └── requirements.txt          # Python dependencies
└── frontend/                     # React + Vite application
    ├── package.json              # NPM dependencies
    ├── tailwind.config.cjs       # Custom design system configuration
    ├── index.html                # Main entry HTML
    └── src/
        ├── App.tsx               # Client router setup
        ├── api/                  # Axios HTTP client endpoints
        ├── components/           # Reusable UI cards, maps, and panels
        ├── store/                # Zustand state management
        └── pages/                # Command Center, Zone Explorer, Temporal Analysis
```

---

##  Running the Project Locally

### Prerequisites
*   **Python 3.10+** (with pip)
*   **Node.js v18+** (with npm)

### 1. Start Backend API Server
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Start the FastAPI application:
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    *Note: If local CSVs are not found in the `data/` directory, the backend automatically downloads them from Hugging Face on startup.*
4.  Verify the backend by opening: `http://localhost:8000/api/health`

### 2. Start Frontend App
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Access the Command Center at: `http://localhost:5173`
