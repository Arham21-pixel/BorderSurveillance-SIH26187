from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from backend.core.config import settings
from backend.core.dependencies import get_current_user, get_repo
from backend.schemas.common import PaginatedResponse
from backend.schemas.event import EventFilter, EventOut
from backend.schemas.user import UserContext
from backend.services.event_service import EventService
from backend.services.repository import BaseRepository

router = APIRouter(prefix="/api/events", tags=["events"])


def _service(repo: BaseRepository = Depends(get_repo)) -> EventService:
    return EventService(repo)


@router.get("", response_model=PaginatedResponse[EventOut])
def list_events(
    camera_id: UUID | None = Query(default=None),
    event_type: str | None = Query(default=None),
    start_at: datetime | None = Query(default=None),
    end_at: datetime | None = Query(default=None),
    limit: int = Query(default=settings.pagination_limit_default, ge=1, le=settings.pagination_limit_max),
    offset: int = Query(default=0, ge=0),
    service: EventService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> PaginatedResponse[EventOut]:
    filters = EventFilter(
        camera_id=camera_id,
        event_type=event_type,
        start_at=start_at,
        end_at=end_at,
    )
    return service.list_events(filters=filters, limit=limit, offset=offset)


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: UUID,
    service: EventService = Depends(_service),
    _: UserContext = Depends(get_current_user),
) -> EventOut:
    return service.get_event(event_id)
