"""
Pipeline Engine — multi-step video generation workflows.

A pipeline defines a sequence of steps that process a job:
1. Pre-processing (validate input, prepare data)
2. Generation (run AI model inference)
3. Post-processing (encode, resize, thumbnail, etc.)
4. Finalization (save outputs, update metadata)

Pipelines are composable and extensible:
- Add custom steps via PipelineStep subclass
- Define pipelines in code or via YAML/JSON config
- Steps can be conditional, parallel, or sequential
"""

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class PipelineContext:
    """
    Shared context passed between pipeline steps.

    Each step reads from and writes to this context.
    """

    job_id: str
    task_type: str

    # Input data (from job)
    inputs: dict[str, Any] = field(default_factory=dict)
    generation_params: dict[str, Any] = field(default_factory=dict)
    model_id: Optional[str] = None

    # Working data (set by steps)
    output_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    output_metadata: dict[str, Any] = field(default_factory=dict)

    # Timing
    step_times: dict[str, float] = field(default_factory=dict)
    total_time: float = 0.0

    # Error tracking
    error: Optional[str] = None
    error_step: Optional[str] = None

    # Extra data (steps can store arbitrary data here)
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class StepResult:
    """Result from a single pipeline step."""

    status: StepStatus
    duration_seconds: float = 0.0
    message: str = ""
    error: Optional[str] = None


class PipelineStep(ABC):
    """
    Abstract base class for a pipeline step.

    Subclass this to create custom processing steps.
    """

    def __init__(self, name: str, required: bool = True):
        self.name = name
        self.required = required  # If False, failure doesn't stop pipeline

    @abstractmethod
    async def execute(self, context: PipelineContext) -> StepResult:
        """
        Execute this step.

        Args:
            context: Shared pipeline context.

        Returns:
            StepResult indicating success/failure.
        """
        ...

    def should_skip(self, context: PipelineContext) -> bool:
        """Override to conditionally skip this step."""
        return False


# --- Built-in Steps ---


class ValidateInputStep(PipelineStep):
    """Validate job inputs before processing."""

    def __init__(self):
        super().__init__("validate_input")

    async def execute(self, context: PipelineContext) -> StepResult:
        errors = []

        if context.task_type == "text_to_video":
            if not context.inputs.get("prompt"):
                errors.append("Prompt is required for text_to_video")
        elif context.task_type == "image_to_video":
            if not context.inputs.get("image_path"):
                errors.append("image_path is required for image_to_video")

        if errors:
            return StepResult(
                status=StepStatus.FAILED,
                error="; ".join(errors),
            )

        return StepResult(status=StepStatus.COMPLETED, message="Inputs valid")


class GenerationStep(PipelineStep):
    """Run AI model inference via adapter."""

    def __init__(self):
        super().__init__("generation")

    async def execute(self, context: PipelineContext) -> StepResult:
        from model_adapters import get_adapter_instance
        from model_adapters.base import GenerationRequest, TaskType
        from apps.api.config import get_settings

        settings = get_settings()

        # Get adapter
        adapter_name = context.extra.get("adapter_name", "mock")
        adapter = get_adapter_instance(
            model_id=context.model_id or "auto",
            adapter_name=adapter_name,
        )

        # Load if needed
        if not adapter.is_loaded:
            await adapter.load_model()

        # Parse resolution
        gen_params = context.generation_params
        resolution = gen_params.get("resolution", "720p")
        width, height = _resolve_resolution(resolution)

        # Build request
        request = GenerationRequest(
            job_id=context.job_id,
            task_type=TaskType(context.task_type),
            prompt=context.inputs.get("prompt", ""),
            negative_prompt=context.inputs.get("negative_prompt", ""),
            image_path=context.inputs.get("image_path"),
            duration=gen_params.get("duration", 5.0),
            width=width,
            height=height,
            fps=gen_params.get("fps", 24),
            seed=gen_params.get("seed"),
            guidance_scale=gen_params.get("guidance_scale", 7.5),
            num_inference_steps=gen_params.get("num_inference_steps", 50),
            output_dir=str(settings.output_dir),
        )

        # Generate
        result = await adapter.generate(request)

        # Store in context
        context.output_path = result.output_path
        context.thumbnail_path = result.thumbnail_path
        context.output_metadata = result.to_output_metadata()
        context.extra["peak_vram_gb"] = result.peak_vram_gb
        context.extra["inference_time"] = result.inference_time_seconds

        return StepResult(
            status=StepStatus.COMPLETED,
            duration_seconds=result.inference_time_seconds,
            message=f"Generated: {result.output_path}",
        )


class PostProcessStep(PipelineStep):
    """Apply FFmpeg post-processing to generated video."""

    def __init__(self, config: Optional[dict] = None):
        super().__init__("post_processing", required=False)
        self.config = config or {}

    def should_skip(self, context: PipelineContext) -> bool:
        # Skip if no output to process
        return context.output_path is None

    async def execute(self, context: PipelineContext) -> StepResult:
        import os
        from postprocessing.ffmpeg import get_ffmpeg_processor, PostProcessConfig

        processor = get_ffmpeg_processor()
        if not processor.is_available:
            return StepResult(
                status=StepStatus.SKIPPED,
                message="FFmpeg not available, skipping post-processing",
            )

        input_path = context.output_path
        if not input_path or not os.path.exists(input_path):
            return StepResult(status=StepStatus.SKIPPED, message="No output to process")

        # Build config from job params and step config
        gen_params = context.generation_params
        pp_config = PostProcessConfig(
            codec=self.config.get("codec", "h264"),
            preset=self.config.get("preset", "medium"),
            crf=self.config.get("crf", 23),
            target_fps=self.config.get("target_fps") or gen_params.get("fps"),
        )

        # Process to temp file, then replace
        output_path = input_path.replace(".mp4", "_pp.mp4")
        try:
            info = await processor.process(input_path, output_path, pp_config)

            # Replace original with processed version
            os.replace(output_path, input_path)

            # Update metadata
            context.output_metadata["file_size_mb"] = info.file_size_mb
            context.output_metadata["codec"] = pp_config.codec

            return StepResult(
                status=StepStatus.COMPLETED,
                message=f"Post-processed: {info.file_size_mb:.1f} MB",
            )
        except Exception as e:
            # Non-critical — clean up temp file
            if os.path.exists(output_path):
                os.unlink(output_path)
            return StepResult(
                status=StepStatus.FAILED,
                error=str(e),
                message="Post-processing failed (non-critical)",
            )


class ThumbnailStep(PipelineStep):
    """Generate high-quality thumbnail."""

    def __init__(self):
        super().__init__("thumbnail", required=False)

    def should_skip(self, context: PipelineContext) -> bool:
        return context.output_path is None

    async def execute(self, context: PipelineContext) -> StepResult:
        import os
        from postprocessing.ffmpeg import get_ffmpeg_processor

        processor = get_ffmpeg_processor()
        if not processor.is_available:
            return StepResult(status=StepStatus.SKIPPED, message="FFmpeg not available")

        if not context.output_path or not os.path.exists(context.output_path):
            return StepResult(status=StepStatus.SKIPPED)

        # Generate thumbnail at 10% into the video
        duration = context.output_metadata.get("duration", 5.0)
        timestamp = duration * 0.1  # 10% in

        thumb_path = context.output_path.replace(".mp4", "_thumb.jpg")
        success = await processor.generate_thumbnail(
            context.output_path, thumb_path, timestamp=timestamp, width=640
        )

        if success:
            context.thumbnail_path = thumb_path
            return StepResult(status=StepStatus.COMPLETED, message="Thumbnail generated")
        else:
            return StepResult(status=StepStatus.FAILED, error="Thumbnail generation failed")


# --- Pipeline ---


class Pipeline:
    """
    A sequence of steps that process a video generation job.

    Steps run in order. Required steps that fail abort the pipeline.
    Optional steps that fail are logged but don't stop execution.
    """

    def __init__(self, name: str, steps: list[PipelineStep]):
        self.name = name
        self.steps = steps

    async def run(self, context: PipelineContext) -> PipelineContext:
        """
        Execute all pipeline steps in order.

        Returns the updated context (with outputs and timing).
        """
        logger.info(f"[Pipeline:{self.name}] Starting ({len(self.steps)} steps)")
        pipeline_start = time.time()

        for step in self.steps:
            # Check if step should be skipped
            if step.should_skip(context):
                logger.debug(f"[Pipeline:{self.name}] Skipping step: {step.name}")
                context.step_times[step.name] = 0.0
                continue

            # Execute step
            step_start = time.time()
            logger.info(f"[Pipeline:{self.name}] Running step: {step.name}")

            try:
                result = await step.execute(context)
                step_duration = time.time() - step_start
                context.step_times[step.name] = round(step_duration, 2)

                if result.status == StepStatus.FAILED:
                    if step.required:
                        context.error = result.error
                        context.error_step = step.name
                        logger.error(
                            f"[Pipeline:{self.name}] Step '{step.name}' failed: {result.error}"
                        )
                        break
                    else:
                        logger.warning(
                            f"[Pipeline:{self.name}] Optional step '{step.name}' failed: {result.error}"
                        )
                elif result.status == StepStatus.COMPLETED:
                    logger.info(
                        f"[Pipeline:{self.name}] Step '{step.name}' completed "
                        f"({step_duration:.1f}s): {result.message}"
                    )

            except Exception as e:
                step_duration = time.time() - step_start
                context.step_times[step.name] = round(step_duration, 2)

                if step.required:
                    context.error = str(e)
                    context.error_step = step.name
                    logger.error(
                        f"[Pipeline:{self.name}] Step '{step.name}' raised: {e}"
                    )
                    break
                else:
                    logger.warning(
                        f"[Pipeline:{self.name}] Optional step '{step.name}' raised: {e}"
                    )

        context.total_time = round(time.time() - pipeline_start, 2)
        status = "FAILED" if context.error else "COMPLETED"
        logger.info(
            f"[Pipeline:{self.name}] {status} in {context.total_time:.1f}s"
        )

        return context


# --- Pre-built Pipelines ---


def create_default_pipeline(post_process_config: Optional[dict] = None) -> Pipeline:
    """
    Create the default video generation pipeline.

    Steps:
    1. Validate inputs
    2. Generate video (AI model)
    3. Post-process (encode, optional)
    4. Generate thumbnail
    """
    steps = [
        ValidateInputStep(),
        GenerationStep(),
        PostProcessStep(config=post_process_config),
        ThumbnailStep(),
    ]
    return Pipeline(name="default", steps=steps)


def create_lightweight_pipeline() -> Pipeline:
    """Pipeline without post-processing (faster, for previews)."""
    steps = [
        ValidateInputStep(),
        GenerationStep(),
    ]
    return Pipeline(name="lightweight", steps=steps)


# --- Helpers ---

def _resolve_resolution(resolution: str) -> tuple[int, int]:
    """Convert resolution string to (width, height)."""
    presets = {
        "480p": (854, 480),
        "720p": (1280, 720),
        "1080p": (1920, 1080),
    }
    if resolution in presets:
        return presets[resolution]
    if "x" in resolution:
        parts = resolution.split("x")
        try:
            return (int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            pass
    return (1280, 720)
