"""Pydantic schemas for Model Registry API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    """Schema for registering a new model."""

    id: str = Field(..., min_length=1, max_length=50, examples=["wan2.1-t2v-14b"])
    name: str = Field(..., min_length=1, max_length=200, examples=["Wan 2.1 Text-to-Video 14B"])
    version: str = Field(default="1.0", max_length=50)
    description: Optional[str] = None

    source: Optional[str] = Field(
        default=None, examples=["https://huggingface.co/Wan-AI/Wan2.1-T2V-14B"]
    )
    adapter_name: str = Field(..., min_length=1, max_length=100, examples=["wan"])

    capabilities: list[str] = Field(
        default_factory=list, examples=[["text_to_video", "image_to_video"]]
    )

    minimum_vram_gb: float = Field(default=0, ge=0)
    recommended_vram_gb: float = Field(default=0, ge=0)
    supports_quantization: bool = False
    supports_cpu_offload: bool = False
    supports_lora: bool = False

    max_resolution_width: int = Field(default=1280, ge=128)
    max_resolution_height: int = Field(default=720, ge=128)
    max_duration_seconds: int = Field(default=10, ge=1)
    max_fps: int = Field(default=30, ge=1)


class ModelUpdate(BaseModel):
    """Schema for updating a model (partial update)."""

    name: Optional[str] = Field(default=None, max_length=200)
    version: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = None
    source: Optional[str] = None
    capabilities: Optional[list[str]] = None
    status: Optional[str] = Field(default=None, pattern="^(available|disabled|error)$")

    minimum_vram_gb: Optional[float] = Field(default=None, ge=0)
    recommended_vram_gb: Optional[float] = Field(default=None, ge=0)
    supports_quantization: Optional[bool] = None
    supports_cpu_offload: Optional[bool] = None
    supports_lora: Optional[bool] = None

    max_resolution_width: Optional[int] = Field(default=None, ge=128)
    max_resolution_height: Optional[int] = Field(default=None, ge=128)
    max_duration_seconds: Optional[int] = Field(default=None, ge=1)
    max_fps: Optional[int] = Field(default=None, ge=1)


class ModelResponse(BaseModel):
    """Schema for model response."""

    id: str
    name: str
    version: str
    description: Optional[str]
    source: Optional[str]
    adapter_name: str
    capabilities: list[str]

    minimum_vram_gb: float
    recommended_vram_gb: float
    supports_quantization: bool
    supports_cpu_offload: bool
    supports_lora: bool

    max_resolution_width: int
    max_resolution_height: int
    max_duration_seconds: int
    max_fps: int

    status: str

    avg_inference_time_seconds: Optional[float]
    avg_vram_usage_gb: Optional[float]
    total_jobs_completed: int

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelListResponse(BaseModel):
    """Paginated list of models."""

    models: list[ModelResponse]
    total: int
