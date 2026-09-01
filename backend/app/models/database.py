"""Optional Supabase client. Local demo uses in-memory stores."""

from backend.app.core.config import settings


def get_client():
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)
