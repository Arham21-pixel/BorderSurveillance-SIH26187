from datetime import datetime

from pydantic import BaseModel


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    track_id: int | None = None
    label: str
    confidence: float
    bbox: BoundingBox


class DetectionResult(BaseModel):
    camera_id: str
    timestamp: datetime
    detections: list[Detection]
