from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Border AI Sentinel"
    app_env: str = "development"
    app_debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_cors_origins: str = "http://localhost:5173"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    api_key: str = ""

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    detection_model_path: str = "vision/models/yolov8n.pt"
    detection_confidence: float = 0.45
    detection_device: str = "cpu"
    tracker_max_age: int = 30

    risk_high_threshold: float = 0.75
    risk_medium_threshold: float = 0.45

    evidence_output_dir: str = "data/demo"
    clip_seconds_before: int = 4
    clip_seconds_after: int = 4

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.api_cors_origins.split(",") if item.strip()]


settings = Settings()
