"""
FFmpeg Post-processing Module.

Provides video post-processing capabilities:
- Re-encode (H.264/H.265)
- Resize/scale video
- Frame interpolation (increase FPS)
- Add audio track
- Generate thumbnail at specific timestamp
- Trim/cut video
- Adjust quality/bitrate
- Concatenate multiple videos

All operations are async and use subprocess for non-blocking execution.
"""

import asyncio
import logging
import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class VideoInfo:
    """Metadata about a video file."""

    path: str
    width: int = 0
    height: int = 0
    duration: float = 0.0
    fps: float = 0.0
    codec: str = ""
    bitrate_kbps: int = 0
    file_size_mb: float = 0.0
    has_audio: bool = False


@dataclass
class PostProcessConfig:
    """Configuration for post-processing a video."""

    # Encoding
    codec: str = "h264"  # h264, h265, vp9
    preset: str = "medium"  # ultrafast, fast, medium, slow, veryslow
    crf: int = 23  # Quality (0-51, lower=better, 23 is default)
    pixel_format: str = "yuv420p"

    # Resize
    target_width: Optional[int] = None
    target_height: Optional[int] = None
    maintain_aspect: bool = True

    # FPS
    target_fps: Optional[int] = None
    interpolation: bool = False  # Use minterpolate for smooth frame interp

    # Audio
    audio_path: Optional[str] = None  # Path to audio file to add
    audio_volume: float = 1.0

    # Trim
    start_time: Optional[float] = None  # seconds
    end_time: Optional[float] = None  # seconds

    # Output
    output_format: str = "mp4"  # mp4, webm, avi


class FFmpegProcessor:
    """
    Async FFmpeg video processor.

    Wraps FFmpeg CLI for various video post-processing operations.
    """

    def __init__(self):
        self._ffmpeg_path = shutil.which("ffmpeg")
        self._ffprobe_path = shutil.which("ffprobe")

        if not self._ffmpeg_path:
            logger.warning("FFmpeg not found in PATH — post-processing disabled")

    @property
    def is_available(self) -> bool:
        return self._ffmpeg_path is not None

    async def get_video_info(self, video_path: str) -> VideoInfo:
        """Probe a video file for metadata using ffprobe."""
        if not self._ffprobe_path:
            # Fallback: basic info from file
            info = VideoInfo(path=video_path)
            if os.path.exists(video_path):
                info.file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
            return info

        cmd = [
            self._ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()

        info = VideoInfo(path=video_path)
        if os.path.exists(video_path):
            info.file_size_mb = round(os.path.getsize(video_path) / (1024 * 1024), 2)

        if proc.returncode == 0:
            import json
            try:
                data = json.loads(stdout.decode())
                # Parse video stream
                for stream in data.get("streams", []):
                    if stream.get("codec_type") == "video":
                        info.width = int(stream.get("width", 0))
                        info.height = int(stream.get("height", 0))
                        info.codec = stream.get("codec_name", "")
                        # FPS from r_frame_rate (e.g. "24/1")
                        fps_str = stream.get("r_frame_rate", "0/1")
                        if "/" in fps_str:
                            num, den = fps_str.split("/")
                            info.fps = float(num) / float(den) if float(den) > 0 else 0
                    elif stream.get("codec_type") == "audio":
                        info.has_audio = True

                # Duration from format
                fmt = data.get("format", {})
                info.duration = float(fmt.get("duration", 0))
                info.bitrate_kbps = int(fmt.get("bit_rate", 0)) // 1000
            except (json.JSONDecodeError, ValueError, KeyError) as e:
                logger.warning(f"Failed to parse ffprobe output: {e}")

        return info

    async def process(
        self,
        input_path: str,
        output_path: str,
        config: PostProcessConfig,
    ) -> VideoInfo:
        """
        Apply post-processing to a video file.

        Returns VideoInfo of the output file.
        """
        if not self.is_available:
            raise RuntimeError("FFmpeg not available")

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input video not found: {input_path}")

        # Build FFmpeg command
        cmd = [self._ffmpeg_path, "-y", "-i", input_path]

        # Input audio if specified
        if config.audio_path and os.path.exists(config.audio_path):
            cmd.extend(["-i", config.audio_path])

        # Video filters
        vf_filters = []

        # Trim
        if config.start_time is not None:
            cmd.extend(["-ss", str(config.start_time)])
        if config.end_time is not None:
            cmd.extend(["-to", str(config.end_time)])

        # Resize
        if config.target_width and config.target_height:
            if config.maintain_aspect:
                vf_filters.append(
                    f"scale={config.target_width}:{config.target_height}:"
                    f"force_original_aspect_ratio=decrease,"
                    f"pad={config.target_width}:{config.target_height}:(ow-iw)/2:(oh-ih)/2"
                )
            else:
                vf_filters.append(f"scale={config.target_width}:{config.target_height}")
        elif config.target_width:
            vf_filters.append(f"scale={config.target_width}:-2")
        elif config.target_height:
            vf_filters.append(f"scale=-2:{config.target_height}")

        # FPS change
        if config.target_fps:
            if config.interpolation:
                vf_filters.append(
                    f"minterpolate=fps={config.target_fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
                )
            else:
                vf_filters.append(f"fps={config.target_fps}")

        # Apply video filters
        if vf_filters:
            cmd.extend(["-vf", ",".join(vf_filters)])

        # Codec settings
        codec_map = {
            "h264": "libx264",
            "h265": "libx265",
            "vp9": "libvpx-vp9",
        }
        cmd.extend(["-c:v", codec_map.get(config.codec, "libx264")])
        cmd.extend(["-preset", config.preset])
        cmd.extend(["-crf", str(config.crf)])
        cmd.extend(["-pix_fmt", config.pixel_format])

        # Audio handling
        if config.audio_path and os.path.exists(config.audio_path):
            cmd.extend(["-c:a", "aac", "-b:a", "192k"])
            if config.audio_volume != 1.0:
                cmd.extend(["-af", f"volume={config.audio_volume}"])
            cmd.extend(["-map", "0:v:0", "-map", "1:a:0", "-shortest"])
        else:
            cmd.extend(["-an"])  # No audio

        cmd.append(output_path)

        logger.info(f"[FFmpeg] Processing: {input_path} → {output_path}")
        logger.debug(f"[FFmpeg] Command: {' '.join(cmd)}")

        # Run FFmpeg
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            error = stderr.decode(errors="replace")[-500:]
            raise RuntimeError(f"FFmpeg post-processing failed: {error}")

        # Get output info
        output_info = await self.get_video_info(output_path)
        logger.info(
            f"[FFmpeg] Done: {output_info.file_size_mb:.1f} MB, "
            f"{output_info.width}x{output_info.height}, {output_info.duration:.1f}s"
        )
        return output_info

    async def generate_thumbnail(
        self,
        video_path: str,
        output_path: str,
        timestamp: float = 0.0,
        width: int = 320,
    ) -> bool:
        """Extract a frame as thumbnail at given timestamp."""
        if not self.is_available:
            return False

        cmd = [
            self._ffmpeg_path, "-y",
            "-ss", str(timestamp),
            "-i", video_path,
            "-vf", f"scale={width}:-2",
            "-frames:v", "1",
            "-q:v", "5",
            output_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        return proc.returncode == 0

    async def concatenate(
        self,
        input_paths: list[str],
        output_path: str,
        codec: str = "h264",
    ) -> VideoInfo:
        """Concatenate multiple video files into one."""
        if not self.is_available:
            raise RuntimeError("FFmpeg not available")

        if len(input_paths) < 2:
            raise ValueError("Need at least 2 videos to concatenate")

        # Create concat file list
        concat_file = output_path + ".concat.txt"
        with open(concat_file, "w") as f:
            for path in input_paths:
                f.write(f"file '{os.path.abspath(path)}'\n")

        cmd = [
            self._ffmpeg_path, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-c:v", "libx264" if codec == "h264" else "libx265",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            output_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        # Clean up concat file
        if os.path.exists(concat_file):
            os.unlink(concat_file)

        if proc.returncode != 0:
            error = stderr.decode(errors="replace")[-500:]
            raise RuntimeError(f"FFmpeg concat failed: {error}")

        return await self.get_video_info(output_path)

    async def upscale(
        self,
        input_path: str,
        output_path: str,
        scale_factor: int = 2,
    ) -> VideoInfo:
        """
        Upscale video using lanczos scaling.

        For AI-based upscaling, use a dedicated upscaler (Real-ESRGAN, etc.)
        """
        if not self.is_available:
            raise RuntimeError("FFmpeg not available")

        info = await self.get_video_info(input_path)
        target_w = info.width * scale_factor
        target_h = info.height * scale_factor

        config = PostProcessConfig(
            target_width=target_w,
            target_height=target_h,
            maintain_aspect=False,
            preset="slow",
            crf=20,  # Higher quality for upscaling
        )

        # Use lanczos filter for better upscaling
        cmd = [
            self._ffmpeg_path, "-y",
            "-i", input_path,
            "-vf", f"scale={target_w}:{target_h}:flags=lanczos",
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            output_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            error = stderr.decode(errors="replace")[-500:]
            raise RuntimeError(f"FFmpeg upscale failed: {error}")

        return await self.get_video_info(output_path)


# --- Singleton ---

_processor: Optional[FFmpegProcessor] = None


def get_ffmpeg_processor() -> FFmpegProcessor:
    """Get or create the FFmpeg processor singleton."""
    global _processor
    if _processor is None:
        _processor = FFmpegProcessor()
    return _processor
