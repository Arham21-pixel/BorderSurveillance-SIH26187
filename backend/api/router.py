from fastapi import APIRouter

from backend.api.routes import alerts, analytics, cameras, events, evidence, health, ingest, ws_alerts, zones

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(cameras.router)
api_router.include_router(zones.router)
api_router.include_router(events.router)
api_router.include_router(alerts.router)
api_router.include_router(evidence.router)
api_router.include_router(analytics.router)
api_router.include_router(ingest.router)
api_router.include_router(ws_alerts.router)
