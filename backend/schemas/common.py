"""Shared API schemas."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIMessage(BaseModel):
    message: str


class PaginationParams(BaseModel):
    limit: int = Field(default=25, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    limit: int
    offset: int
    total: int


class TimeRangeFilter(BaseModel):
    start_at: datetime | None = None
    end_at: datetime | None = None
