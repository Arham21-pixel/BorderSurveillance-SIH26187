"""Runtime configuration for Backend API."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Border AI Sentinel Backend"
    app_env: str = "development"
    app_debug: bool = False
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_version: str = "0.2.0"

    cors_origins: str = "http://localhost:5173"
    cors_allow_credentials: bool = True

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_timeout_seconds: float = 10.0

    auth_required: bool = True
    auth_header_scheme: str = "Bearer"

    event_dedupe_seconds: int = 20
    loitering_seconds: int = 30
    group_distance_threshold: float = 90.0
    group_min_members: int = 3
    risk_night_start_hour: int = 20
    risk_night_end_hour: int = 5

    pagination_limit_default: int = 25
    pagination_limit_max: int = 100

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def supabase_ready(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


settings = Settings()
