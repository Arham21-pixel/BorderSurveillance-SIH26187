from datetime import datetime

from pydantic import BaseModel


class UserContext(BaseModel):
    id: str
    email: str | None = None
    role: str | None = None
    authenticated_at: datetime | None = None
