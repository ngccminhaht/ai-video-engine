"""ORM model for AI Model Registry."""

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AIModel(Base):
    """Registered AI model in the platform."""

    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    version: Mapped[str] = mapped_column(String(50), default="1.0")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Model source info
    source: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # HuggingFace URL
    adapter_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "wan", "cogvideo"

    # Capabilities
    capabilities: Mapped[dict] = mapped_column(JSON, default=list)
    # e.g. ["text_to_video", "image_to_video"]

    # Resource requirements
    minimum_vram_gb: Mapped[float] = mapped_column(Float, default=0)
    recommended_vram_gb: Mapped[float] = mapped_column(Float, default=0)
    supports_quantization: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_cpu_offload: Mapped[bool] = mapped_column(Boolean, default=False)
    supports_lora: Mapped[bool] = mapped_column(Boolean, default=False)

    # Generation limits
    max_resolution_width: Mapped[int] = mapped_column(Integer, default=1280)
    max_resolution_height: Mapped[int] = mapped_column(Integer, default=720)
    max_duration_seconds: Mapped[int] = mapped_column(Integer, default=10)
    max_fps: Mapped[int] = mapped_column(Integer, default=30)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="available")
    # available, loading, loaded, error, disabled

    # Performance metrics (updated after each run)
    avg_inference_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_vram_usage_gb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_jobs_completed: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
