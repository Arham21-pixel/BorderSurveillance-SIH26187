from datetime import datetime

from pydantic import BaseModel


class AlertRead(BaseModel):
    id: str
    camera_id: str
    event_id: str
    severity: str
    title: str
    description: str
    status: str
    evidence_path: str | None = None
    timestamp: datetime
