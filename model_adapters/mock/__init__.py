"""
Mock model adapter — generates fake videos using FFmpeg.

Used for testing the full pipeline end-to-end without requiring a GPU.
Produces a colored video with text overlay showing job parameters.
"""

import asyncio
import logging
import os
import random
import shutil
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


class MockAdapter(BaseModelAdapter):
    """
    Mock adapter that generates test videos via FFmpeg.

    Simulates the behavior of a real model adapter:
    - load_model() — simulates model loading delay
    - generate() — creates a real .mp4 video file with colored background + text
    - unload_model() — cleanup

    Requires FFmpeg to be installed and available in PATH.
    """

    # Simulated timing
    LOAD_TIME_SECONDS = 1.0  # Simulated model load time
    INFERENCE_OVERHEAD_SECONDS = 0.5  # Extra delay to simulate inference

    # Video styling
    COLORS = [
        "0x1a1a2e", "0x16213e", "0x0f3460", "0x533483",
        "0x2c3e50", "0x1b4332", "0x3d0066", "0x0a2647",
    ]

    def __init__(self, model_id: str, config: dict[str, Any] | None = None):
        super().__init__(model_id, config)
        self._ffmpeg_path: str | None = None
        self._simulated_vram: float = 0.0

    async def load_model(self) -> None:
        """Simulate loading a model (check FFmpeg availability)."""
        self._status = AdapterStatus.LOADING
        logger.info(f"[MockAdapter:{self.model_id}] Loading mock model...")

        # Check FFmpeg is available
        self._ffmpeg_path = shutil.which("ffmpeg")
        if not self._ffmpeg_path:
            self._status = AdapterStatus.ERROR
            raise RuntimeError(
                "FFmpeg not found in PATH. Install FFmpeg to use the MockAdapter. "
                "Download: https://ffmpeg.org/download.html"
            )

        # Simulate model load time
        await asyncio.sleep(self.LOAD_TIME_SECONDS)

        self._simulated_vram = 2.5  # Pretend we use 2.5 GB VRAM
        self._status = AdapterStatus.READY
        logger.info(f"[MockAdapter:{self.model_id}] Model loaded (simulated)")

    async def unload_model(self) -> None:
        """Simulate unloading the model."""
        logger.info(f"[MockAdapter:{self.model_id}] Unloading model...")
        self._simulated_vram = 0.0
        self._status = AdapterStatus.UNLOADED
        logger.info(f"[MockAdapter:{self.model_id}] Model unloaded")

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """
        Generate a mock video using FFmpeg.

        Creates an MP4 with:
        - Colored gradient background
        - Text overlay with prompt and job info
        - Specified duration, resolution, fps
        """
        if not self.is_loaded:
            raise RuntimeError(f"Model '{self.model_id}' is not loaded. Call load_model() first.")

        self._status = AdapterStatus.GENERATING
        start_time = time.time()

        try:
            # Validate request
            self.validate_request(request)

            # Ensure output directory exists
            output_dir = Path(request.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            output_path = request.output_path
            thumbnail_path = request.thumbnail_path

            # Build and run FFmpeg command for video
            await self._generate_video(request, output_path)

            # Generate thumbnail from first frame
            await self._generate_thumbnail(output_path, thumbnail_path)

            # Simulate additional inference overhead
            await asyncio.sleep(self.INFERENCE_OVERHEAD_SECONDS)

            # Calculate file size
            file_size_mb = 0.0
            if os.path.exists(output_path):
                file_size_mb = os.path.getsize(output_path) / (1024 * 1024)

            inference_time = time.time() - start_time

            result = GenerationResult(
                output_path=output_path,
                thumbnail_path=thumbnail_path,
                width=request.width,
                height=request.height,
                duration=request.duration,
                fps=request.fps,
                file_size_mb=round(file_size_mb, 2),
                inference_time_seconds=round(inference_time, 2),
                peak_vram_gb=self._simulated_vram,
            )

            logger.info(
                f"[MockAdapter:{self.model_id}] Generated video: "
                f"{output_path} ({file_size_mb:.1f} MB, {inference_time:.1f}s)"
            )

            return result

        except Exception as e:
            logger.error(f"[MockAdapter:{self.model_id}] Generation failed: {e}")
            raise RuntimeError(f"Mock generation failed: {e}") from e

        finally:
            self._status = AdapterStatus.READY

    def get_capabilities(self) -> ModelCapabilities:
        """Return mock model capabilities."""
        return ModelCapabilities(
            supported_tasks=[TaskType.TEXT_TO_VIDEO, TaskType.IMAGE_TO_VIDEO],
            max_resolution_width=1920,
            max_resolution_height=1080,
            max_duration_seconds=30,
            max_fps=60,
            supports_negative_prompt=True,
            supports_seed=True,
            min_vram_gb=0.0,
            recommended_vram_gb=0.0,
        )

    def get_vram_usage(self) -> float:
        """Return simulated VRAM usage."""
        return self._simulated_vram

    # --- Private helpers ---

    async def _generate_video(self, request: GenerationRequest, output_path: str) -> None:
        """Generate a video file using FFmpeg."""
        seed = request.seed if request.seed is not None else random.randint(0, 999999)
        color = self.COLORS[seed % len(self.COLORS)]
        num_frames = int(request.duration * request.fps)

        # Try with drawtext first, fallback to simple color+noise if fontconfig unavailable
        cmd = self._build_ffmpeg_cmd_simple(request, output_path, color, num_frames)

        logger.debug(f"[MockAdapter] FFmpeg cmd: {' '.join(cmd)}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            error_msg = stderr.decode(errors="replace")[-500:]
            raise RuntimeError(f"FFmpeg failed (exit {proc.returncode}): {error_msg}")

        if not os.path.exists(output_path):
            raise RuntimeError(f"FFmpeg completed but output file not found: {output_path}")

    def _build_ffmpeg_cmd_simple(
        self,
        request: GenerationRequest,
        output_path: str,
        color: str,
        num_frames: int,
    ) -> list[str]:
        """Build FFmpeg command with color background + geq pattern (no font needed)."""
        # Use geq (generic equation) filter to create an animated pattern
        # This avoids drawtext/fontconfig issues on Windows
        seed_val = request.seed if request.seed is not None else 42
        # Create animated gradient with noise effect using geq
        vf = (
            f"geq="
            f"r='clip(128+30*sin(2*PI*N/({request.fps}*2))+random(1)*20,0,255)':"
            f"g='clip(64+40*cos(2*PI*N/({request.fps}*3))+random(1)*20,0,255)':"
            f"b='clip(180+25*sin(2*PI*N/({request.fps}*4)+{seed_val})+random(1)*20,0,255)'"
        )

        return [
            self._ffmpeg_path or "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", (
                f"color=c=#{color[2:]}:s={request.width}x{request.height}"
                f":d={request.duration}:r={request.fps}"
            ),
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-pix_fmt", "yuv420p",
            "-frames:v", str(num_frames),
            output_path,
        ]

    async def _generate_thumbnail(self, video_path: str, thumbnail_path: str) -> None:
        """Extract the first frame as a JPEG thumbnail."""
        cmd = [
            self._ffmpeg_path or "ffmpeg",
            "-y",
            "-i", video_path,
            "-frames:v", "1",
            "-q:v", "5",
            thumbnail_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()

        # Thumbnail failure is non-critical
        if proc.returncode != 0:
            logger.warning(f"[MockAdapter] Thumbnail generation failed for {video_path}")
