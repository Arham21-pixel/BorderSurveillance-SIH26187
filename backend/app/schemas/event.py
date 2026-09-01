from datetime import datetime

from pydantic import BaseModel


class EventRead(BaseModel):
    id: str
    camera_id: str
    track_id: int | None = None
    kind: str
    description: str
    risk_score: float
    timestamp: datetime
