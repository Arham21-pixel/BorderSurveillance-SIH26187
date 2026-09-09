"""YOLO clip → one event / risk / alert / evidence package."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from backend.schemas.evidence import EvidenceInput
from backend.services.ingest_service import IngestService
from backend.services.repository import BaseRepository
from intelligence.risk.risk_engine import RiskContext, RiskEngine
from vision.behaviour.analyser import BehaviourEvent

EVENT_TYPE = {
    "loitering": "loitering",
    "zone_intrusion": "restricted_zone_entry",
    "group": "group_movement",
    "animal": "animal_detected",
    "fast_movement": "unusual_trajectory",
}

EVENT_TITLE = {
    "loitering": "Loitering detected",
    "zone_intrusion": "Restricted zone entry",
    "group": "Group movement",
    "animal": "Animal detected",
    "fast_movement": "Fast movement",
}


def resolve_camera_id(repo: BaseRepository, camera_ref: str) -> tuple[UUID, str]:
    ref = camera_ref.strip()
    try:
        uid = UUID(ref)
        row = repo.get_camera(uid)
        if row:
            return uid, str(row.get("camera_code") or row.get("name") or ref)
    except ValueError:
        pass
    for cam in repo.list_cameras():
        code = str(cam.get("camera_code") or "")
        name = str(cam.get("name") or "")
        if ref == code or ref == name or ref.upper() == code.upper():
            return UUID(str(cam["id"])), code or ref
    raise ValueError(f"Unknown camera '{camera_ref}'")


def _event_timestamp(event: BehaviourEvent) -> datetime:
    raw = (event.timestamp or "").replace("Z", "+00:00")
    try:
        ts = datetime.fromisoformat(raw)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    except ValueError:
        return datetime.now(timezone.utc)


async def publish_clip_episode(
    service: IngestService,
    camera_uuid: UUID,
    camera_code: str,
    event: BehaviourEvent,
    evidence: dict,
) -> dict:
    ts = _event_timestamp(event)
    obj = (event.object_class or "person").lower()
    is_animal = event.kind == "animal" or obj in {
        "animal", "dog", "cat", "horse", "cow", "sheep", "bear", "elephant", "zebra", "giraffe", "bird",
    }
    event_type = EVENT_TYPE.get(event.kind, event.kind)
    title = EVENT_TITLE.get(event.kind, event.description)

    track_row = service.repo.upsert_track(
        {
            "camera_id": str(camera_uuid),
            "external_track_id": event.track_id,
            "object_class": event.object_class,
            "start_time": ts.isoformat(),
            "last_seen": ts.isoformat(),
            "direction": "UNKNOWN",
            "dwell_time": float(event.features.get("dwell_seconds") or 0.0),
            "trajectory": [{"x": p[0], "y": p[1]} for p in (event.trajectory or [])],
        }
    )

    ctx = RiskContext(
        event_id=str(camera_uuid),
        timestamp=ts,
        object_class=event.object_class,
        detection_confidence=float(event.confidence),
        restricted_zone_violation=event.kind == "zone_intrusion" and not is_animal,
        loitering=event.kind == "loitering" and not is_animal,
        group_movement=event.kind == "group" and not is_animal,
        is_animal=is_animal,
        dwell_time=float(event.features.get("dwell_seconds") or 0.0),
        night_time=bool(event.features.get("night")) and not is_animal,
        normal_trajectory=is_animal or event.kind == "normal",
    )
    risk = RiskEngine().evaluate(ctx)

    event_row = service.repo.create_event(
        {
            "camera_id": str(camera_uuid),
            "track_id": track_row["id"],
            "event_type": event_type,
            "event_data": {
                "kind": event.kind,
                "description": event.description,
                "features": event.features,
                "risk_score": risk.score,
                "camera_code": camera_code,
            },
            "timestamp": ts.isoformat(),
        }
    )

    service.repo.create_risk_score(
        {
            "event_id": event_row["id"],
            "score": risk.score,
            "severity": risk.severity,
            "reasons": risk.reasons,
            "contributing_factors": risk.contributing_factors,
            "calculated_at": risk.timestamp.isoformat(),
        }
    )

    snapshot = evidence.get("snapshot")
    clip = evidence.get("clip")
    snapshot_url = f"/evidence-files/{Path(snapshot).parent.name}/snapshot.jpg" if snapshot else None
    clip_url = f"/evidence-files/{Path(clip).parent.name}/clip.mp4" if clip else None

    # One operator alert per threat episode. Animals stay event-only (benign context).
    alert_created = event.kind in {"loitering", "zone_intrusion", "group"} and not is_animal
    alert_row = None
    extra = {
        "event_type": event_type,
        "camera_code": camera_code,
        "title": title,
        "description": event.description,
        "snapshot_url": snapshot_url,
        "clip_url": clip_url,
        "object_class": event.object_class,
    }
    if alert_created:
        alert_row = service.repo.create_alert(
            {
                "event_id": event_row["id"],
                "camera_id": str(camera_uuid),
                "risk_score": risk.score,
                "severity": risk.severity,
                "status": "OPEN",
                "acknowledged_by": None,
                "acknowledged_at": None,
                "reasons": risk.reasons,
                "extra": extra,
            }
        )

    if alert_row:
        try:
            from backend.services.websocket_manager import alert_ws_manager

            await alert_ws_manager.broadcast(
                {
                    "type": "new_alert",
                    "data": {
                        "alert_id": alert_row["id"],
                        "camera_id": camera_code,
                        "severity": alert_row["severity"],
                        "risk_score": alert_row["risk_score"],
                        "event_type": event_type,
                        "timestamp": alert_row["created_at"],
                        "reasons": risk.reasons,
                        "title": title,
                        "snapshot_url": snapshot_url,
                    },
                }
            )
        except Exception:
            pass
        try:
            service.repo.create_evidence(
                EvidenceInput(
                    alert_id=UUID(alert_row["id"]),
                    camera_id=camera_uuid,
                    snapshot_ref=str(snapshot) if snapshot else None,
                    video_clip_ref=str(clip) if clip else None,
                    trajectory_data={"points": event.trajectory},
                    timestamp=ts,
                    metadata={"kind": event.kind, "track_id": event.track_id},
                )
            )
        except Exception:
            pass

    return {
        "event_id": event_row["id"],
        "alert_id": alert_row["id"] if alert_row else None,
        "event_type": event_type,
        "kind": event.kind,
        "title": title,
        "description": event.description,
        "object_class": event.object_class,
        "severity": risk.severity,
        "risk_score": risk.score,
        "reasons": risk.reasons,
        "alert_created": alert_created,
        "snapshot_url": snapshot_url,
        "clip_url": clip_url,
        "camera_code": camera_code,
        "trajectory": event.trajectory,
    }
