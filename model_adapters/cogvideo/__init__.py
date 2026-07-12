"""
CogVideoX model adapter — text-to-video and image-to-video generation.

Supports:
- CogVideoX-5B (text-to-video + image-to-video)
- Quantization (8-bit, 4-bit) for lower VRAM usage
- CPU offloading for memory efficiency
- Seed control for reproducibility

Requirements:
    pip install torch torchvision diffusers transformers accelerate
    pip install bitsandbytes  # For quantization (optional)

VRAM Requirements:
    - FP16 (no quantization): ~18 GB
    - 8-bit quantization: ~12 GB
    - 4-bit quantization: ~8 GB
    - With CPU offload: ~6 GB (slower)
"""

import gc
import logging
import os
import time
from pathlib import Path
from typing import Any

from model_adapters.base import (
    AdapterStatus,
    BaseModelAdapter,
    GenerationRequest,
    GenerationResult,
    ModelCapabilities,
    TaskType,
)

logger = logging.getLogger(__name__)


class CogVideoXAdapter(BaseModelAdapter):
    """
    CogVideoX adapter using Hugging Face diffusers.

    Supports text-to-video and image-to-video pipelines.
    Model ID on HuggingFace: THUDM/CogVideoX-5b

    Config options:
        model_path: HuggingFace model ID or local path (default: "THUDM/CogVideoX-5b")
        quantization: "none", "8bit", "4bit" (default: "none")
        cpu_offload: bool (default: False)
        torch_dtype: "float16", "bfloat16" (default: "bfloat16")
        device: "cuda", "cpu" (default: "cuda")
    """

    DEFAULT_MODEL_PATH = "THUDM/CogVideoX-5b"

    def __init__(self, model_id: str, config: dict[str, Any] | None = None):
        super().__init__(model_id, config)
        self.config.setdefault("model_path", self.DEFAULT_MODEL_PATH)
        self.config.setdefault("quantization", "none")
        self.config.setdefault("cpu_offload", False)
        self.config.setdefault("torch_dtype", "bfloat16")
        self.config.setdefault("device", "cuda")

        self._pipe = None
        self._pipe_i2v = None
        self._vram_usage: float = 0.0

    async def load_model(self) -> None:
        """Load CogVideoX pipeline into GPU memory."""
        import torch
        from diffusers import CogVideoXImageToVideoPipeline, CogVideoXPipeline

        self._status = AdapterStatus.LOADING
        model_path = self.config["model_path"]
        quantization = self.config["quantization"]
        cpu_offload = self.config["cpu_offload"]

        logger.info(
            f"[CogVideoX:{self.model_id}] Loading model '{model_path}' "
            f"(quantization={quantization}, cpu_offload={cpu_offload})"
        )

        try:
            # Determine torch dtype
            dtype_map = {
                "float16": torch.float16,
                "bfloat16": torch.bfloat16,
                "float32": torch.float32,
            }
            torch_dtype = dtype_map.get(self.config["torch_dtype"], torch.bfloat16)

            # Load pipeline with optional quantization
            pipe_kwargs: dict[str, Any] = {
                "torch_dtype": torch_dtype,
            }

            if quantization == "8bit":
                try:
                    from transformers import BitsAndBytesConfig
                    quantization_config = BitsAndBytesConfig(load_in_8bit=True)
                    pipe_kwargs["quantization_config"] = quantization_config
                    logger.info(f"[CogVideoX:{self.model_id}] Using 8-bit quantization")
                except ImportError:
                    logger.warning(
                        "[CogVideoX] bitsandbytes not installed, falling back to FP16"
                    )
            elif quantization == "4bit":
                try:
                    from transformers import BitsAndBytesConfig
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_compute_dtype=torch_dtype,
                    )
                    pipe_kwargs["quantization_config"] = quantization_config
                    logger.info(f"[CogVideoX:{self.model_id}] Using 4-bit quantization")
                except ImportError:
                    logger.warning(
                        "[CogVideoX] bitsandbytes not installed, falling back to FP16"
                    )

            # Load Text-to-Video pipeline
            self._pipe = CogVideoXPipeline.from_pretrained(model_path, **pipe_kwargs)

            if cpu_offload:
                self._pipe.enable_sequential_cpu_offload()
                logger.info(f"[CogVideoX:{self.model_id}] CPU offload enabled")
            else:
                device = self.config["device"]
                if device == "cuda" and torch.cuda.is_available():
                    self._pipe = self._pipe.to("cuda")
                else:
                    self._pipe = self._pipe.to("cpu")
                    logger.warning(
                        f"[CogVideoX:{self.model_id}] CUDA not available, running on CPU (slow!)"
                    )

            # Enable memory optimizations
            self._pipe.enable_vae_slicing()
            self._pipe.enable_vae_tiling()

            # Also load I2V pipeline (shares transformer weights)
            try:
                self._pipe_i2v = CogVideoXImageToVideoPipeline.from_pretrained(
                    model_path, **pipe_kwargs
                )
                if cpu_offload:
                    self._pipe_i2v.enable_sequential_cpu_offload()
                elif device == "cuda" and torch.cuda.is_available():
                    self._pipe_i2v = self._pipe_i2v.to("cuda")
                self._pipe_i2v.enable_vae_slicing()
                self._pipe_i2v.enable_vae_tiling()
                logger.info(f"[CogVideoX:{self.model_id}] I2V pipeline loaded")
            except Exception as e:
                logger.warning(
                    f"[CogVideoX:{self.model_id}] I2V pipeline not available: {e}"
                )
                self._pipe_i2v = None

            # Track VRAM usage
            if torch.cuda.is_available():
                self._vram_usage = torch.cuda.memory_allocated() / (1024**3)

            self._status = AdapterStatus.READY
            logger.info(
                f"[CogVideoX:{self.model_id}] Model loaded successfully "
                f"(VRAM: {self._vram_usage:.1f} GB)"
            )

        except Exception as e:
            self._status = AdapterStatus.ERROR
            logger.error(f"[CogVideoX:{self.model_id}] Failed to load: {e}")
            raise RuntimeError(f"Failed to load CogVideoX model: {e}") from e

    async def unload_model(self) -> None:
        """Unload model and free GPU memory."""
        import torch

        logger.info(f"[CogVideoX:{self.model_id}] Unloading model...")

        del self._pipe
        del self._pipe_i2v
        self._pipe = None
        self._pipe_i2v = None

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()

        self._vram_usage = 0.0
        self._status = AdapterStatus.UNLOADED
        logger.info(f"[CogVideoX:{self.model_id}] Model unloaded, GPU memory freed")

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """Run CogVideoX inference to generate a video."""
        import torch

        if not self.is_loaded:
            raise RuntimeError(
                f"Model '{self.model_id}' is not loaded. Call load_model() first."
            )

        self._status = AdapterStatus.GENERATING
        start_time = time.time()

        try:
            self.validate_request(request)

            # Ensure output directory
            output_dir = Path(request.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            output_path = request.output_path
            thumbnail_path = request.thumbnail_path

            # Set seed for reproducibility
            generator = None
            if request.seed is not None:
                generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu")
                generator.manual_seed(request.seed)

            # Calculate number of frames
            # CogVideoX generates in multiples of 8 frames
            num_frames = max(8, int(request.duration * request.fps))
            num_frames = (num_frames // 8) * 8  # Round down to nearest 8

            # Route to appropriate pipeline
            if request.task_type == TaskType.IMAGE_TO_VIDEO and self._pipe_i2v:
                video_frames = await self._generate_i2v(request, generator, num_frames)
            else:
                video_frames = await self._generate_t2v(request, generator, num_frames)

            # Export frames to video file
            from diffusers.utils import export_to_video
            export_to_video(video_frames, output_path, fps=request.fps)

            # Generate thumbnail from first frame
            self._save_thumbnail(video_frames, thumbnail_path)

            # Calculate metrics
            inference_time = time.time() - start_time
            file_size_mb = 0.0
            if os.path.exists(output_path):
                file_size_mb = os.path.getsize(output_path) / (1024 * 1024)

            peak_vram = 0.0
            if torch.cuda.is_available():
                peak_vram = torch.cuda.max_memory_allocated() / (1024**3)
                torch.cuda.reset_peak_memory_stats()

            result = GenerationResult(
                output_path=output_path,
                thumbnail_path=thumbnail_path,
                width=request.width,
                height=request.height,
                duration=request.duration,
                fps=request.fps,
                file_size_mb=round(file_size_mb, 2),
                inference_time_seconds=round(inference_time, 2),
                peak_vram_gb=round(peak_vram, 2),
            )

            logger.info(
                f"[CogVideoX:{self.model_id}] Generated video: "
                f"{output_path} ({file_size_mb:.1f} MB, {inference_time:.1f}s, "
                f"VRAM peak: {peak_vram:.1f} GB)"
            )

            return result

        except Exception as e:
            logger.error(f"[CogVideoX:{self.model_id}] Generation failed: {e}")
            raise RuntimeError(f"CogVideoX generation failed: {e}") from e

        finally:
            self._status = AdapterStatus.READY
            # Free intermediate tensors
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    async def _generate_t2v(self, request: GenerationRequest, generator, num_frames: int):
        """Text-to-video generation."""
        import torch

        logger.info(
            f"[CogVideoX:{self.model_id}] T2V: prompt='{request.prompt[:60]}...', "
            f"frames={num_frames}, size={request.width}x{request.height}"
        )

        with torch.inference_mode():
            output = self._pipe(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt or None,
                num_frames=num_frames,
                height=request.height,
                width=request.width,
                guidance_scale=request.guidance_scale,
                num_inference_steps=request.num_inference_steps,
                generator=generator,
            )

        return output.frames[0]  # List of PIL images

    async def _generate_i2v(self, request: GenerationRequest, generator, num_frames: int):
        """Image-to-video generation."""
        import torch
        from PIL import Image

        if not request.image_path:
            raise ValueError("image_path is required for image_to_video task")

        if not os.path.exists(request.image_path):
            raise ValueError(f"Input image not found: {request.image_path}")

        # Load and resize input image
        image = Image.open(request.image_path).convert("RGB")
        image = image.resize((request.width, request.height))

        logger.info(
            f"[CogVideoX:{self.model_id}] I2V: image={request.image_path}, "
            f"prompt='{(request.prompt or '')[:60]}...', frames={num_frames}"
        )

        with torch.inference_mode():
            output = self._pipe_i2v(
                prompt=request.prompt or "",
                negative_prompt=request.negative_prompt or None,
                image=image,
                num_frames=num_frames,
                height=request.height,
                width=request.width,
                guidance_scale=request.guidance_scale,
                num_inference_steps=request.num_inference_steps,
                generator=generator,
            )

        return output.frames[0]

    def _save_thumbnail(self, frames, thumbnail_path: str) -> None:
        """Save the first frame as a JPEG thumbnail."""
        try:
            if frames and len(frames) > 0:
                first_frame = frames[0]
                if hasattr(first_frame, "save"):
                    first_frame.save(thumbnail_path, quality=85)
                    return
            logger.warning(f"[CogVideoX:{self.model_id}] Could not save thumbnail")
        except Exception as e:
            logger.warning(f"[CogVideoX:{self.model_id}] Thumbnail failed: {e}")

    def get_capabilities(self) -> ModelCapabilities:
        """Return CogVideoX model capabilities."""
        tasks = [TaskType.TEXT_TO_VIDEO]
        if self._pipe_i2v is not None:
            tasks.append(TaskType.IMAGE_TO_VIDEO)

        return ModelCapabilities(
            supported_tasks=tasks,
            max_resolution_width=1360,  # CogVideoX max
            max_resolution_height=768,
            max_duration_seconds=6,  # ~49 frames at 8fps
            max_fps=16,  # CogVideoX native fps
            supports_negative_prompt=True,
            supports_seed=True,
            min_vram_gb=8.0,
            recommended_vram_gb=16.0,
        )

    def get_vram_usage(self) -> float:
        """Return current VRAM usage."""
        try:
            import torch
            if torch.cuda.is_available():
                return torch.cuda.memory_allocated() / (1024**3)
        except ImportError:
            pass
        return self._vram_usage
