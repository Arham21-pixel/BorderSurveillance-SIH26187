from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ZoneBase(BaseModel):
    camera_id: UUID
    name: str = Field(min_length=2, max_length=120)
    zone_type: str = Field(default="MONITOR", pattern="^(MONITOR|RESTRICTED|ENTRY|EXIT)$")
    polygon: list[tuple[float, float]] = Field(default_factory=list)
    severity: str = Field(default="MEDIUM", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    zone_type: str | None = Field(default=None, pattern="^(MONITOR|RESTRICTED|ENTRY|EXIT)$")
    polygon: list[tuple[float, float]] | None = None
    severity: str | None = Field(default=None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")


class ZoneOut(ZoneBase):
    id: UUID
    created_at: datetime
