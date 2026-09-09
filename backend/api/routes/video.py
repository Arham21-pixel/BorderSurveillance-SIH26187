"""Video analysis session routes.

Provides the bridge between the NETRA frontend source-selector UI
and the backend AI pipeline (OpenCV → YOLO → ByteTrack → Behaviour → Risk → Alert).

Allowed to CREATE here:  /backend/api/routes/
NOT allowed to modify:   /backend/services/, /backend/core/, /intelligence/

Endpoints
---------
POST /api/video/analyze
    Start a video analysis session (mp4 | rtsp | webcam).
    Named demo MP4s run YOLO → ByteTrack → one behaviour episode.

POST /api/video/analyze-file
    Upload a clip and run the same pipeline.

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

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from pathlib import Path

from backend.core.dependencies import get_repo
from backend.services.clip_pipeline import publish_clip_episode, resolve_camera_id
from backend.services.ingest_service import IngestService
from backend.services.repository import BaseRepository
from vision.pipeline.clip_analyze import analyze_clip_file, find_clip, infer_scenario

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
        "border-crossing.mp4",
        "group movement.mp4",
        "group ppl moving.mp4",
        "animal demo.mp4",
        "animal.mp4",
        "animal video.mp4",
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
    status: str             # "analyzing" | "stopped" | "error" | "complete"
    source_type: str
    source_reference: str
    camera_id: str
    started_at: str
    stopped_at: Optional[str] = None
    frames_processed: int = 0
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


def _blank_session(
    session_id: str,
    camera_id: str,
    source_type: str,
    source_reference: str,
    started_at: str,
) -> dict[str, Any]:
    return {
        "session_id": session_id,
        "status": "analyzing",
        "source_type": source_type,
        "source_reference": source_reference,
        "camera_id": camera_id,
        "started_at": started_at,
        "stopped_at": None,
        "frames_processed": 0,
        "error": None,
        "result": None,
    }


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
) -> AnalyzeResponse:
    """Create an analysis session and, for demo MP4 sources, run
    YOLO → ByteTrack → one event / risk / alert / evidence package."""

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

    _sessions[session_id] = _blank_session(
        session_id, payload.camera_id, payload.source_type, payload.source_reference, now
    )

    if payload.source_type == "mp4":
        clip = find_clip(payload.source_reference)
        if clip is None:
            _sessions[session_id]["status"] = "error"
            _sessions[session_id]["error"] = (
                f"Clip '{payload.source_reference}' not found. Put it in data/videos/."
            )
        else:
            background_tasks.add_task(
                _run_clip_pipeline,
                session_id,
                payload.camera_id,
                str(clip),
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
) -> SessionStatus:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return SessionStatus(**session)


@router.post(
    "/analyze-file",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a clip and run YOLO → ByteTrack → one episode",
)
async def analyze_uploaded_file(
    background_tasks: BackgroundTasks,
    camera_id: str = Form(...),
    file: UploadFile = File(...),
    service: IngestService = Depends(_get_service),
) -> AnalyzeResponse:
    uploads = Path("data/uploads")
    uploads.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "clip.mp4").name
    dest = uploads / f"{uuid.uuid4().hex}_{safe_name}"
    dest.write_bytes(await file.read())

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    _sessions[session_id] = _blank_session(session_id, camera_id, "mp4", safe_name, now)
    background_tasks.add_task(
        _run_clip_pipeline,
        session_id,
        camera_id,
        str(dest),
        safe_name,
        service,
    )
    return AnalyzeResponse(
        session_id=session_id,
        status="started",
        camera_id=camera_id,
        source_type="mp4",
        source_reference=safe_name,
        started_at=now,
    )


async def _run_clip_pipeline(
    session_id: str,
    camera_ref: str,
    source_path: str,
    filename: str,
    service: IngestService,
) -> None:
    """YOLO → ByteTrack → behaviour → one event / risk / alert / evidence."""
    session = _sessions.get(session_id)
    if not session:
        return
    try:
        camera_uuid, camera_code = resolve_camera_id(service.repo, camera_ref)
    except ValueError as exc:
        session["status"] = "error"
        session["error"] = str(exc)
        return

    try:
        result = await asyncio.to_thread(
            analyze_clip_file,
            source_path,
            camera_code,
            scenario=infer_scenario(filename),
        )
        session["frames_processed"] = result.frames
        if result.error:
            session["status"] = "error"
            session["error"] = result.error
            # #region agent log
            try:
                import json, time
                with open(r"c:\Users\arham\OneDrive\Documents\SIH-2026\debug-9f5899.log", "a", encoding="utf-8") as _f:
                    _f.write(json.dumps({
                        "sessionId": "9f5899",
                        "runId": "post-fix",
                        "hypothesisId": "H5",
                        "location": "video.py:_run_clip_pipeline",
                        "message": "Clip pipeline error",
                        "data": {"error": result.error, "frames": result.frames},
                        "timestamp": int(time.time() * 1000),
                    }) + "\n")
            except Exception:
                pass
            # #endregion
            return
        payload: Dict[str, Any] = {
            "kind": result.kind,
            "expected": result.expected,
            "alert_created": False,
            "event_id": None,
            "alert_id": None,
            "duration_s": result.duration_s,
        }
        if result.event is not None:
            payload = await publish_clip_episode(
                service,
                camera_uuid,
                camera_code,
                result.event,
                result.evidence,
            )
            payload["expected"] = result.expected
            payload["duration_s"] = result.duration_s
        session["result"] = payload
        session["status"] = "complete"
        # #region agent log
        try:
            import json, time
            with open(r"c:\Users\arham\OneDrive\Documents\SIH-2026\debug-9f5899.log", "a", encoding="utf-8") as _f:
                _f.write(json.dumps({
                    "sessionId": "9f5899",
                    "runId": "post-fix",
                    "hypothesisId": "H5",
                    "location": "video.py:_run_clip_pipeline",
                    "message": "Clip pipeline complete",
                    "data": {
                        "kind": payload.get("kind"),
                        "event_id": payload.get("event_id"),
                        "alert_id": payload.get("alert_id"),
                        "clip_url": payload.get("clip_url"),
                        "frames": session.get("frames_processed"),
                    },
                    "timestamp": int(time.time() * 1000),
                }) + "\n")
        except Exception:
            pass
        # #endregion
    except Exception as exc:
        session["status"] = "error"
        session["error"] = str(exc)
