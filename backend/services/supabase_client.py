"""Supabase client factory and auth helper."""

from datetime import datetime, timezone
from typing import Any

import httpx
from supabase import Client, create_client

from backend.core.config import settings
from backend.core.errors import AppError
from backend.schemas.user import UserContext


class SupabaseClientFactory:
    _client: Client | None = None

    @classmethod
    def get_service_client(cls) -> Client:
        if not settings.supabase_ready:
            raise AppError(
                message="Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
                code="supabase_not_configured",
                status_code=503,
            )
        if cls._client is None:
            cls._client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        return cls._client


class SupabaseAuthVerifier:
    @staticmethod
    async def verify_access_token(access_token: str) -> UserContext:
        if not settings.supabase_url or not settings.supabase_anon_key:
            raise AppError(
                message="Supabase auth is not configured.",
                code="auth_not_configured",
                status_code=503,
            )

        url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "apikey": settings.supabase_anon_key,
        }
        try:
            async with httpx.AsyncClient(timeout=settings.supabase_timeout_seconds) as client:
                response = await client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            raise AppError("Unable to verify access token.", "auth_upstream_error", 502) from exc

        if response.status_code != 200:
            raise AppError("Invalid or expired access token.", "unauthorized", 401)

        payload: dict[str, Any] = response.json()
        return UserContext(
            id=str(payload.get("id")),
            email=payload.get("email"),
            role=(payload.get("app_metadata") or {}).get("role"),
            authenticated_at=datetime.now(timezone.utc),
        )
