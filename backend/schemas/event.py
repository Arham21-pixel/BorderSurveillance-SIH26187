from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class EventOut(BaseModel):
    id: UUID
    camera_id: UUID
    track_id: UUID | None = None
    event_type: str
    event_data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class EventFilter(BaseModel):
    camera_id: UUID | None = None
    event_type: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
