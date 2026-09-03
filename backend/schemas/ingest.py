"""Generic detection/tracking integration contract."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Point(BaseModel):
    x: float
    y: float
    t: datetime | None = None


class DetectionInput(BaseModel):
    camera_id: UUID
    timestamp: datetime
    frame_id: str | None = None
    track_id: str
    object_class: str
    confidence: float = Field(ge=0, le=1)
    bounding_box: BoundingBox
    trajectory: list[Point] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)


class DetectionBatchInput(BaseModel):
    camera_id: UUID | None = None
    detections: list[DetectionInput] = Field(default_factory=list)


class PipelineItemResult(BaseModel):
    event_id: str
    camera_id: UUID
    track_id: str
    event_type: str
    risk_score: float
    severity: str
    reasons: list[str]
    alert_created: bool
    context: dict[str, Any] = Field(default_factory=dict)


class PipelineBatchResult(BaseModel):
    results: list[PipelineItemResult]
