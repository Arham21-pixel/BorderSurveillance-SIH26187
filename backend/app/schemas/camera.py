from datetime import datetime

from pydantic import BaseModel


class CameraCreate(BaseModel):
    name: str
    source: str
    latitude: float | None = None
    longitude: float | None = None
    sector: str = "unassigned"


class CameraUpdate(BaseModel):
    name: str | None = None
    source: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    sector: str | None = None
    status: str | None = None


class CameraRead(BaseModel):
    id: str
    name: str
    source: str
    latitude: float | None = None
    longitude: float | None = None
    sector: str
    status: str = "offline"
    last_seen: datetime | None = None
