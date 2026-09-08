from datetime import datetime, timezone
from uuid import uuid4

from backend.app.schemas.event import EventRead
from intelligence.event_classifier import classify
from intelligence.risk_engine import score_event

_EVENTS: list[EventRead] = []



def list_events(limit: int = 50) -> list[EventRead]:
    return list(reversed(_EVENTS[-limit:]))


def get_event(event_id: str) -> EventRead | None:
    return next((event for event in _EVENTS if event.id == event_id), None)


def record(camera_id: str, track_id: int | None, kind: str, description: str, features: dict) -> EventRead:
    event = EventRead(
        id=str(uuid4()),
        camera_id=camera_id,
        track_id=track_id,
        kind=kind or classify(features),
        description=description,
        risk_score=score_event(features),
        timestamp=datetime.now(timezone.utc),
    )
    _EVENTS.append(event)
    return event
