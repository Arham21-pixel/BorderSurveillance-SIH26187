from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AlertOut(BaseModel):
    id: UUID
    event_id: UUID
    camera_id: UUID
    risk_score: float = Field(ge=0, le=100)
    severity: str = Field(pattern="^(NORMAL|SUSPICIOUS|HIGH|CRITICAL)$")
    status: str = Field(pattern="^(OPEN|ACKNOWLEDGED|DISMISSED|RESOLVED)$")
    acknowledged_by: UUID | None = None
    acknowledged_at: datetime | None = None
    created_at: datetime
    reasons: list[str] = Field(default_factory=list)
    extra: dict[str, Any] = Field(default_factory=dict)


class AlertStatusUpdate(BaseModel):
    status: str = Field(pattern="^(OPEN|ACKNOWLEDGED|DISMISSED|RESOLVED)$")


class AlertFilter(BaseModel):
    camera_id: UUID | None = None
    severity: str | None = None
    status: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
