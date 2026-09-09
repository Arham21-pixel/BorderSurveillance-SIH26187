"""FastAPI entry point for Border AI Sentinel backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.router import api_router
from backend.core.config import settings
from backend.core.errors import register_error_handlers
from backend.core.logging import configure_logging
from pathlib import Path

configure_logging(debug=settings.app_debug)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.app_debug,
    description="Backend API for Border AI Sentinel (MVP).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)
app.include_router(api_router)

_evidence_dir = Path("evidence/events")
_evidence_dir.mkdir(parents=True, exist_ok=True)
Path("data/uploads").mkdir(parents=True, exist_ok=True)
Path("data/videos").mkdir(parents=True, exist_ok=True)
app.mount("/evidence-files", StaticFiles(directory=str(_evidence_dir)), name="evidence-files")
