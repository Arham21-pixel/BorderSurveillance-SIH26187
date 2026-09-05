from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class EvidenceInput(BaseModel):
    alert_id: UUID
    camera_id: UUID
    snapshot_ref: str | None = Field(default=None, max_length=500)
    video_clip_ref: str | None = Field(default=None, max_length=500)
    trajectory_data: dict[str, Any] | list[dict[str, Any]] | None = None
    timestamp: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvidenceOut(BaseModel):
    id: UUID
    alert_id: UUID
    snapshot_url: str | None = None
    video_clip_url: str | None = None
    trajectory_data: dict[str, Any] | list[dict[str, Any]] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
