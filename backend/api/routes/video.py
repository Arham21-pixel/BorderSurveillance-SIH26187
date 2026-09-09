"""Video analysis session routes.

Provides the bridge between the NETRA frontend source-selector UI
and the backend AI pipeline (OpenCV → YOLO → ByteTrack → Behaviour → Risk → Alert).

Allowed to CREATE here:  /backend/api/routes/
NOT allowed to modify:   /backend/services/, /backend/core/, /intelligence/

Endpoints
---------
POST /api/video/analyze
    Start a video analysis session (mp4 | rtsp | webcam).
    For demo MP4 sources a background pipeline injection is triggered
    so that events/alerts appear on the dashboard shortly after the
    operator clicks START ANALYSIS.

POST /api/video/stop
    Stop a running session.

GET  /api/video/status/{session_id}
    Poll the current state of a session.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.user import UserContext
from backend.services.ingest_service import IngestService
from backend.services.repository import BaseRepository

router = APIRouter(prefix="/api/video", tags=["video"])

# ---------------------------------------------------------------------------
# In-memory session registry
# (A production build would persist this in Supabase / Redis.)
# ---------------------------------------------------------------------------
_sessions: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Allowed demo video filenames (exactly as the frontend sends them)
# ---------------------------------------------------------------------------
DEMO_MP4_FILES: frozenset[str] = frozenset(
    {
        "walking.mp4",
        "loitering.mp4",
        "border crossing.mp4",
        "group movement.mp4",
        "animal demo.mp4",
    }
)


# ---------------------------------------------------------------------------
# Pydantic schemas (local — no changes to /backend/schemas/ needed)
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    source_type: str        # "mp4" | "rtsp" | "webcam"
    source_reference: str   # mp4 filename, rtsp:// URL, or "webcam"
    camera_id: str          # UUID string or "DEMO-01" etc.


class AnalyzeResponse(BaseModel):
    session_id: str
    status: str
    camera_id: str
    source_type: str
    source_reference: str
    started_at: str


class StopRequest(BaseModel):
    session_id: str


class SessionStatus(BaseModel):
    session_id: str
    status: str             # "analyzing" | "stopped" | "error"
    source_type: str
    source_reference: str
    camera_id: str
    started_at: str
    stopped_at: Optional[str] = None
    frames_processed: int = 0


# ---------------------------------------------------------------------------
# Dependency helpers
# ---------------------------------------------------------------------------

def _get_service(repo: BaseRepository = Depends(get_repo)) -> IngestService:
    return IngestService(repo)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start a video analysis session",
)
async def start_analysis(
    payload: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    service: IngestService = Depends(_get_service),
    _: UserContext = Depends(get_current_user),
) -> AnalyzeResponse:
    """Create an analysis session and — for demo MP4 sources — fire a
    background pipeline injection so the full
    Detection → Behaviour → Risk → Alert → Evidence flow runs."""

    # Validate MP4 filename whitelist
    if payload.source_type == "mp4" and payload.source_reference not in DEMO_MP4_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unknown demo MP4 '{payload.source_reference}'. "
                f"Allowed: {sorted(DEMO_MP4_FILES)}"
            ),
        )

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    _sessions[session_id] = {
        "session_id": session_id,
        "status": "analyzing",
        "source_type": payload.source_type,
        "source_reference": payload.source_reference,
        "camera_id": payload.camera_id,
        "started_at": now,
        "stopped_at": None,
        "frames_processed": 0,
    }

    # For demo MP4 sources kick the full AI pipeline in a background task.
    # walking.mp4      → single detection (normal tracking)
    # loitering.mp4    → two detections with a delay (dwell-time trigger)
    # border crossing.mp4 → two detections with zone-crossing payload
    if payload.source_type == "mp4":
        background_tasks.add_task(
            _run_demo_pipeline,
            session_id,
            payload.camera_id,
            payload.source_reference,
            service,
        )

    return AnalyzeResponse(
        session_id=session_id,
        status="started",
        camera_id=payload.camera_id,
        source_type=payload.source_type,
        source_reference=payload.source_reference,
        started_at=now,
    )


@router.post(
    "/stop",
    status_code=status.HTTP_200_OK,
    summary="Stop a running analysis session",
)
async def stop_analysis(
    payload: StopRequest,
    _: UserContext = Depends(get_current_user),
) -> dict:
    session = _sessions.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{payload.session_id}' not found.",
        )

    now = datetime.now(timezone.utc).isoformat()
    session["status"] = "stopped"
    session["stopped_at"] = now

    return {
        "session_id": payload.session_id,
        "status": "stopped",
        "stopped_at": now,
    }


@router.get(
    "/status/{session_id}",
    response_model=SessionStatus,
    summary="Poll the status of an analysis session",
)
async def get_session_status(
    session_id: str,
    _: UserContext = Depends(get_current_user),
) -> SessionStatus:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return SessionStatus(**session)


# ---------------------------------------------------------------------------
# Background pipeline runner
# ---------------------------------------------------------------------------

async def _run_demo_pipeline(
    session_id: str,
    camera_id_str: str,
    mp4_filename: str,
    service: IngestService,
) -> None:
    """Trigger demo detections through the full AI pipeline.

    Behaviour depends on which demo MP4 was selected:
    - walking.mp4        → one detection (normal movement)
    - loitering.mp4      → two detections with 4 s gap (triggers dwell-time)
    - border crossing.mp4 → two detections with 2 s gap (triggers zone alert)
    """
    try:
        cam_uuid = uuid.UUID(camera_id_str)
    except ValueError:
        # camera_id is a label like "DEMO-01" — we can't inject without a real UUID.
        # The dashboard will still update when Aaryan's pipeline sends real frames.
        _sessions[session_id]["status"] = "analyzing"
        return

    try:
        # First injection
        await service.demo_inject_detection(cam_uuid)
        _sessions[session_id]["frames_processed"] = 1

        if mp4_filename in {"loitering.mp4", "border crossing.mp4"}:
            # Second injection after a brief pause — enough to cross dwell / zone thresholds
            delay = 4.0 if mp4_filename == "loitering.mp4" else 2.0
            await asyncio.sleep(delay)

            if _sessions[session_id]["status"] == "stopped":
                return  # Operator stopped analysis before second frame

            await service.demo_inject_detection(cam_uuid)
            _sessions[session_id]["frames_processed"] = 2

    except Exception:
        # Don't crash the server — mark session as error
        _sessions[session_id]["status"] = "error"
