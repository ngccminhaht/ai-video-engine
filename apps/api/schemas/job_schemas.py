"""Pydantic schemas for Job API."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


# --- Input schemas ---


class TextToVideoInputs(BaseModel):
    """Input fields for text-to-video jobs."""

    prompt: str = Field(..., min_length=1, max_length=2000, examples=["A cat walking on the moon"])
    negative_prompt: Optional[str] = Field(default=None, max_length=2000)


class ImageToVideoInputs(BaseModel):
    """Input fields for image-to-video jobs."""

    prompt: Optional[str] = Field(default=None, max_length=2000)
    negative_prompt: Optional[str] = Field(default=None, max_length=2000)
    image_path: str = Field(..., min_length=1, examples=["uploads/input_image.png"])


class GenerationParams(BaseModel):
    """Common generation parameters for video generation."""

    duration: float = Field(default=5.0, ge=1.0, le=30.0, description="Duration in seconds")
    resolution: str = Field(
        default="720p",
        pattern="^(480p|720p|1080p|\\d+x\\d+)$",
        description="Resolution preset or WxH",
    )
    fps: int = Field(default=24, ge=8, le=60, description="Frames per second")
    seed: Optional[int] = Field(default=None, ge=0, description="Random seed for reproducibility")
    guidance_scale: float = Field(default=7.5, ge=1.0, le=20.0)
    num_inference_steps: int = Field(default=50, ge=10, le=200)


class JobCreate(BaseModel):
    """Schema for creating a new job."""

    task_type: str = Field(
        ...,
        pattern="^(text_to_video|image_to_video)$",
        examples=["text_to_video"],
        description="Type of video generation task",
    )
    model_id: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Model ID to use, or null for auto-selection",
        examples=["wan2.1-t2v-14b"],
    )
    inputs: dict[str, Any] = Field(
        ...,
        description="Input data (prompt, image_path, etc.)",
        examples=[{"prompt": "A cat walking on the moon", "negative_prompt": "blurry"}],
    )
    generation_params: GenerationParams = Field(default_factory=GenerationParams)
    priority: int = Field(default=5, ge=1, le=10, description="Priority 1=highest, 10=lowest")

    @model_validator(mode="after")
    def validate_inputs_by_task_type(self) -> "JobCreate":
        """Validate inputs match the task_type."""
        if self.task_type == "text_to_video":
            TextToVideoInputs(**self.inputs)
        elif self.task_type == "image_to_video":
            ImageToVideoInputs(**self.inputs)
        return self


# --- Response schemas ---


class JobResponse(BaseModel):
    """Full job response schema."""

    id: str
    task_type: str
    status: str
    model_id: Optional[str]

    inputs: dict[str, Any]
    generation_params: dict[str, Any]

    # Output
    output_path: Optional[str]
    thumbnail_path: Optional[str]
    output_metadata: Optional[dict[str, Any]]

    # Error
    error_message: Optional[str]
    retry_count: int
    max_retries: int

    # Performance
    queue_time_seconds: Optional[float]
    load_model_time_seconds: Optional[float]
    inference_time_seconds: Optional[float]
    postprocess_time_seconds: Optional[float]
    total_time_seconds: Optional[float]
    peak_vram_gb: Optional[float]

    # Priority
    priority: int

    # Timestamps
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    """Paginated list of jobs."""

    jobs: list[JobResponse]
    total: int


class JobCancelResponse(BaseModel):
    """Response after cancelling a job."""

    id: str
    status: str
    message: str
