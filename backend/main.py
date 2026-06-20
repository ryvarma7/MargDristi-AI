from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.clusters import router as clusters_router
from routers.enforcement import router as enforcement_router
from routers.forecasts import router as forecasts_router
from routers.health import router as health_router
from routers.parking import router as parking_router
from ml.loader import loader

app = FastAPI(title="MargDristi API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clusters_router)
app.include_router(enforcement_router)
app.include_router(forecasts_router)
app.include_router(health_router)
app.include_router(parking_router)


@app.on_event("startup")
async def startup():
    loader.load_all()


@app.get("/api/status")
def status():
    return {
        "ready": loader.is_ready(),
        "loaded_items": loader.status,
    }
