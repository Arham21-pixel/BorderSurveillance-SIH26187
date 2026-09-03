from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CameraBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    camera_code: str = Field(min_length=2, max_length=40)
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = None
    longitude: float | None = None
    stream_ref: str = Field(min_length=1, max_length=500)
    status: str = Field(default="ACTIVE", pattern="^(ACTIVE|INACTIVE|ERROR)$")


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = None
    longitude: float | None = None
    stream_ref: str | None = Field(default=None, min_length=1, max_length=500)
    status: str | None = Field(default=None, pattern="^(ACTIVE|INACTIVE|ERROR)$")


class CameraOut(CameraBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
