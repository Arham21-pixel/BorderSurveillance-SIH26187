from datetime import datetime, timezone

from fastapi import Header

from backend.core.config import settings
from backend.core.errors import AppError
from backend.schemas.user import UserContext
from backend.services.supabase_client import SupabaseAuthVerifier


async def require_authenticated_user(authorization: str | None = Header(default=None)) -> UserContext:
    if not settings.auth_required:
        return UserContext(id="local-dev-user", role="admin", authenticated_at=datetime.now(timezone.utc))

    if not authorization:
        raise AppError("Missing Authorization header.", "unauthorized", 401)

    parts = authorization.split(" ", maxsplit=1)
    if len(parts) != 2 or parts[0] != settings.auth_header_scheme:
        raise AppError("Invalid Authorization header format.", "unauthorized", 401)

    token = parts[1].strip()
    if not token:
        raise AppError("Empty access token.", "unauthorized", 401)

    return await SupabaseAuthVerifier.verify_access_token(token)
