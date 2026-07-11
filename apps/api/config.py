"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Main application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "AI Video Platform"
    app_version: str = "0.1.0"
    debug: bool = False

    # API Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Database (use PostgreSQL in production, SQLite for local dev without Docker)
    database_url: str = "sqlite+aiosqlite:///./data/ai_video_platform.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Storage
    upload_dir: Path = Path("uploads")
    output_dir: Path = Path("outputs")
    max_upload_size_mb: int = 100

    # Auth
    jwt_secret: str = "dev-secret-change-in-production-please"
    require_auth: bool = False  # Feature flag: set True to enforce auth on all endpoints
    cors_origins: str = "*"  # Comma-separated list of allowed origins. Restrict in production.

    # Worker
    worker_concurrency: int = 1
    job_timeout_seconds: int = 600  # 10 minutes default

    # Model
    models_dir: Path = Path("models")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
