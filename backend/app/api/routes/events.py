from fastapi import APIRouter, HTTPException

from backend.app.schemas.event import EventRead
from backend.app.services import behaviour_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(limit: int = 50) -> list[EventRead]:
    return behaviour_service.list_events(limit=limit)


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: str) -> EventRead:
    event = behaviour_service.get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
