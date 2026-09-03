from uuid import UUID

from backend.core.errors import AppError
from backend.schemas.common import PaginatedResponse
from backend.schemas.event import EventFilter, EventOut
from backend.services.repository import BaseRepository


class EventService:
    def __init__(self, repo: BaseRepository) -> None:
        self.repo = repo

    def list_events(self, filters: EventFilter, limit: int, offset: int) -> PaginatedResponse[EventOut]:
        rows, total = self.repo.list_events(filters.model_dump(exclude_none=True), limit, offset)
        items = [EventOut.model_validate(row) for row in rows]
        return PaginatedResponse[EventOut](items=items, limit=limit, offset=offset, total=total)

    def get_event(self, event_id: UUID) -> EventOut:
        row = self.repo.get_event(event_id)
        if row is None:
            raise AppError("Event not found.", "not_found", 404)
        return EventOut.model_validate(row)
