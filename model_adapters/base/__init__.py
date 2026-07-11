"""Base model adapter interface for AI video generation models."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class TaskType(str, Enum):
    """Supported generation task types."""

    TEXT_TO_VIDEO = "text_to_video"
    IMAGE_TO_VIDEO = "image_to_video"


class AdapterStatus(str, Enum):
    """Model adapter lifecycle states."""

    UNLOADED = "unloaded"
    LOADING = "loading"
    READY = "ready"
    GENERATING = "generating"
    ERROR = "error"


@dataclass
class GenerationRequest:
    """
    Input request for video generation.

    Contains all info the adapter needs to produce a video.
    """

    job_id: str
    task_type: TaskType

    # Input content
    prompt: str = ""
    negative_prompt: str = ""
    image_path: Optional[str] = None  # For image_to_video

    # Generation parameters
    duration: float = 5.0  # seconds
    width: int = 1280
    height: int = 720
    fps: int = 24
    seed: Optional[int] = None
    guidance_scale: float = 7.5
    num_inference_steps: int = 50

    # Output
    output_dir: str = "outputs"

    # Extra model-specific params
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def output_path(self) -> str:
        """Default output video path."""
        return str(Path(self.output_dir) / f"{self.job_id}.mp4")

    @property
    def thumbnail_path(self) -> str:
        """Default thumbnail path."""
        return str(Path(self.output_dir) / f"{self.job_id}_thumb.jpg")


@dataclass
class GenerationResult:
    """
    Output from a successful video generation.

    Returned by adapter.generate() on success.
    """

    output_path: str
    thumbnail_path: Optional[str] = None

    # Video metadata
    width: int = 0
    height: int = 0
    duration: float = 0.0
    fps: int = 0
    file_size_mb: float = 0.0

    # Performance metrics
    inference_time_seconds: float = 0.0
    peak_vram_gb: float = 0.0

    def to_output_metadata(self) -> dict[str, Any]:
        """Convert to the output_metadata JSON stored on the Job model."""
        return {
            "width": self.width,
            "height": self.height,
            "duration": self.duration,
            "fps": self.fps,
            "file_size_mb": self.file_size_mb,
        }


@dataclass
class ModelCapabilities:
    """Describes what a model adapter can do."""

    supported_tasks: list[TaskType] = field(default_factory=list)
    max_resolution_width: int = 1280
    max_resolution_height: int = 720
    max_duration_seconds: int = 10
    max_fps: int = 30
    supports_negative_prompt: bool = True
    supports_seed: bool = True
    min_vram_gb: float = 0.0
    recommended_vram_gb: float = 0.0


class BaseModelAdapter(ABC):
    """
    Abstract base class for model adapters.

    Each AI video model (CogVideoX, Wan, LTX, etc.) implements this interface.
    The worker uses adapters to load/unload models and run inference.

    Lifecycle:
        1. __init__(model_id, config) — instantiate (lightweight, no GPU)
        2. load_model() — load weights into GPU memory
        3. generate(request) — run inference, produce video
        4. unload_model() — free GPU memory
    """

    def __init__(self, model_id: str, config: dict[str, Any] | None = None):
        """
        Initialize adapter (no GPU allocation here).

        Args:
            model_id: The registered model ID (e.g. "cogvideox-5b").
            config: Optional model-specific configuration.
        """
        self.model_id = model_id
        self.config = config or {}
        self._status = AdapterStatus.UNLOADED

    @property
    def status(self) -> AdapterStatus:
        """Current adapter status."""
        return self._status

    @property
    def is_loaded(self) -> bool:
        """Whether the model is loaded and ready for inference."""
        return self._status == AdapterStatus.READY

    @abstractmethod
    async def load_model(self) -> None:
        """
        Load model weights into memory (GPU/CPU).

        Should set self._status = AdapterStatus.READY on success.
        Raises RuntimeError if loading fails.
        """
        ...

    @abstractmethod
    async def unload_model(self) -> None:
        """
        Unload model from memory, free GPU/CPU resources.

        Should set self._status = AdapterStatus.UNLOADED.
        """
        ...

    @abstractmethod
    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """
        Run inference to generate a video.

        Args:
            request: Generation parameters and inputs.

        Returns:
            GenerationResult with output paths and metadata.

        Raises:
            RuntimeError: If generation fails.
            ValueError: If request params are invalid for this model.
        """
        ...

    @abstractmethod
    def get_capabilities(self) -> ModelCapabilities:
        """Return the capabilities of this model adapter."""
        ...

    @abstractmethod
    def get_vram_usage(self) -> float:
        """
        Return current VRAM usage in GB.

        Returns 0.0 if model is not loaded or running on CPU.
        """
        ...

    def validate_request(self, request: GenerationRequest) -> None:
        """
        Validate a generation request against model capabilities.

        Raises ValueError if the request exceeds model limits.
        """
        caps = self.get_capabilities()

        if request.task_type not in caps.supported_tasks:
            raise ValueError(
                f"Model '{self.model_id}' does not support task '{request.task_type.value}'. "
                f"Supported: {[t.value for t in caps.supported_tasks]}"
            )

        if request.width > caps.max_resolution_width:
            raise ValueError(
                f"Width {request.width} exceeds max {caps.max_resolution_width} "
                f"for model '{self.model_id}'"
            )

        if request.height > caps.max_resolution_height:
            raise ValueError(
                f"Height {request.height} exceeds max {caps.max_resolution_height} "
                f"for model '{self.model_id}'"
            )

        if request.duration > caps.max_duration_seconds:
            raise ValueError(
                f"Duration {request.duration}s exceeds max {caps.max_duration_seconds}s "
                f"for model '{self.model_id}'"
            )

        if request.fps > caps.max_fps:
            raise ValueError(
                f"FPS {request.fps} exceeds max {caps.max_fps} for model '{self.model_id}'"
            )

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(model_id='{self.model_id}', status={self._status.value})>"
