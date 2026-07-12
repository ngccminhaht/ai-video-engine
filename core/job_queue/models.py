"""ORM model for video generation jobs."""

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Job(Base):
    """A video generation job."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)  # ULID
    task_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # text_to_video, image_to_video, etc.

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    # pending, queued, loading_model, processing, post_processing, completed, failed, cancelled

    # Ownership
    user_id: Mapped[Optional[str]] = mapped_column(String(26), nullable=True, index=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(26), nullable=True, index=True)

    # Model info
    model_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Can be "auto" initially, resolved to actual model_id when processing

    # Input
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    # e.g. {"prompt": "...", "image": "path/to/file", "negative_prompt": "..."}

    generation_params: Mapped[dict] = mapped_column(JSON, default=dict)
    # e.g. {"duration": 5, "resolution": "720p", "fps": 24, "seed": 12345}

    # Output
    output_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    output_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g. {"width": 1280, "height": 720, "duration": 5.0, "fps": 24, "file_size_mb": 12.5}

    # Error info
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=2)

    # Idempotency
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Performance tracking
    queue_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    load_model_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    inference_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    postprocess_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peak_vram_gb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Priority (lower = higher priority)
    priority: Mapped[int] = mapped_column(Integer, default=5)

    # Progress tracking (for SSE/realtime)
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    stage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Credits
    credits_held: Mapped[int] = mapped_column(Integer, default=0)
    credits_charged: Mapped[int] = mapped_column(Integer, default=0)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
