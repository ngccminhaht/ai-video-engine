"""
arq Worker for processing video generation jobs.

Full pipeline:
    API creates job → Redis queue → Worker picks up → Pipeline processes → DB updated

Run with:
    arq apps.worker.WorkerSettings
"""

import logging
import time
from datetime import datetime, timezone

from apps.api.config import get_settings
from core.database import async_session_factory
from core.job_queue import get_redis_settings
from core.job_queue.models import Job
from core.model_registry.models import AIModel
from model_adapters import get_adapter_instance, list_loaded_instances
from model_adapters.base import (
    AdapterStatus,
    GenerationRequest,
    GenerationResult,
    TaskType,
)

logger = logging.getLogger(__name__)

settings = get_settings()

# Default adapter for models without an explicit adapter_name
DEFAULT_ADAPTER = "mock"


def _resolve_resolution(resolution: str) -> tuple[int, int]:
    """Convert resolution string to (width, height) tuple."""
    presets = {
        "480p": (854, 480),
        "720p": (1280, 720),
        "1080p": (1920, 1080),
    }
    if resolution in presets:
        return presets[resolution]

    # Try WxH format
    if "x" in resolution:
        parts = resolution.split("x")
        try:
            return (int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            pass

    # Default to 720p
    return (1280, 720)


async def _publish_progress(
    job_id: str,
    status: str,
    progress: int,
    stage: str | None,
    output_path: str | None = None,
    error: str | None = None,
) -> None:
    """Publish progress event to Redis PubSub (best-effort)."""
    try:
        from apps.api.services.notification_service import publish_job_event
        event = {
            "type": "status_change" if status != "completed" else "completed",
            "status": status,
            "progress": progress,
            "stage": stage,
        }
        if output_path:
            event["output_path"] = output_path
        if error:
            event["type"] = "failed"
            event["error"] = error
        await publish_job_event(job_id, event)
    except Exception as e:
        logger.debug(f"[Worker] Failed to publish progress: {e}")


async def _check_cancelled(session, job_id: str) -> bool:
    """Check if a job has been cancelled mid-processing."""
    await session.refresh(await session.get(Job, job_id), ["status"])
    job = await session.get(Job, job_id)
    return job is not None and job.status == "cancelled"


async def _finalize_credits(session, job: Job, success: bool) -> None:
    """
    Finalize credit accounting after job completion.

    On success: Mark credits as charged (keep held amount).
    On failure/cancel: Refund held credits back to user.
    """
    if not job.user_id or job.credits_held <= 0:
        return

    from core.auth.models import User

    user = await session.get(User, job.user_id)
    if not user:
        return

    if success:
        # Transfer held → charged
        job.credits_charged = job.credits_held
        job.credits_held = 0
        logger.info(f"[Worker] Charged {job.credits_charged} credits for job {job.id}")
    else:
        # Refund held credits
        user.credits += job.credits_held
        logger.info(f"[Worker] Refunded {job.credits_held} credits for job {job.id}")
        job.credits_held = 0


async def process_video_job(ctx: dict, job_id: str, task_type: str) -> dict:
    """
    Main worker function: process a video generation job.

    Full pipeline:
    1. Load job from DB, update status to 'processing'
    2. Resolve model → get adapter
    3. Load model if not already loaded
    4. Run inference via adapter
    5. Post-processing (optional)
    6. Save output, update job status + metadata
    7. Finalize credits (charge on success, refund on failure)
    """
    logger.info(f"[Worker] Processing job {job_id} (task_type={task_type})")

    async with async_session_factory() as session:
        # ── Step 1: Fetch job ──
        job = await session.get(Job, job_id)
        if not job:
            logger.error(f"[Worker] Job {job_id} not found in database")
            return {"status": "error", "message": "Job not found"}

        # Check if cancelled before processing
        if job.status == "cancelled":
            logger.info(f"[Worker] Job {job_id} was cancelled, skipping")
            return {"status": "cancelled"}

        started_at = datetime.now(timezone.utc)

        try:
            # Update status → processing
            job.status = "processing"
            job.started_at = started_at
            job.progress = 5
            job.stage = "Initializing"

            # Calculate queue time (handle naive/aware datetime mismatch from SQLite)
            if job.created_at:
                created = job.created_at
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                job.queue_time_seconds = (started_at - created).total_seconds()
            else:
                job.queue_time_seconds = 0.0

            await session.commit()
            await _publish_progress(job_id, "processing", 5, "Initializing")

            # ── Step 2: Resolve model + adapter ──
            model_id = job.model_id
            adapter_name = DEFAULT_ADAPTER

            if model_id and model_id != "auto":
                # Look up the model in the registry to get its adapter_name
                model = await session.get(AIModel, model_id)
                if model:
                    adapter_name = model.adapter_name or DEFAULT_ADAPTER
                else:
                    logger.warning(
                        f"[Worker] Model '{model_id}' not found in registry, using '{DEFAULT_ADAPTER}'"
                    )
            else:
                # Auto mode — pick first available model (simplified)
                model_id = "auto"
                logger.info(f"[Worker] Job {job_id} using auto model selection → mock adapter")

            adapter = get_adapter_instance(
                model_id=model_id,
                adapter_name=adapter_name,
            )

            # ── Step 3: Load model if needed ──
            load_model_start = time.time()

            if not adapter.is_loaded:
                job.status = "loading_model"
                job.progress = 10
                job.stage = "Loading AI model"
                await session.commit()
                await _publish_progress(job_id, "loading_model", 10, "Loading AI model")

                logger.info(f"[Worker] Loading model '{model_id}' via adapter '{adapter_name}'")
                await adapter.load_model()

            load_model_time = time.time() - load_model_start
            job.load_model_time_seconds = round(load_model_time, 2)

            # Check cancellation after model load
            if await _check_cancelled(session, job_id):
                logger.info(f"[Worker] Job {job_id} cancelled during model load")
                await _finalize_credits(session, job, success=False)
                await session.commit()
                return {"status": "cancelled"}

            # ── Step 4: Build request + run inference ──
            job.status = "processing"
            job.progress = 25
            job.stage = "Generating video"
            await session.commit()
            await _publish_progress(job_id, "processing", 25, "Generating video")

            # Parse generation params
            gen_params = job.generation_params or {}
            inputs = job.inputs or {}
            resolution = gen_params.get("resolution", "720p")
            width, height = _resolve_resolution(resolution)

            request = GenerationRequest(
                job_id=job_id,
                task_type=TaskType(task_type),
                prompt=inputs.get("prompt", ""),
                negative_prompt=inputs.get("negative_prompt", ""),
                image_path=inputs.get("image_path"),
                duration=gen_params.get("duration", 5.0),
                width=width,
                height=height,
                fps=gen_params.get("fps", 24),
                seed=gen_params.get("seed"),
                guidance_scale=gen_params.get("guidance_scale", 7.5),
                num_inference_steps=gen_params.get("num_inference_steps", 50),
                output_dir=str(settings.output_dir),
            )

            inference_start = time.time()
            result: GenerationResult = await adapter.generate(request)
            inference_time = time.time() - inference_start

            # ── Step 5: Post-processing ──
            job.progress = 80
            job.stage = "Post-processing"
            await session.commit()
            await _publish_progress(job_id, "post_processing", 80, "Post-processing")

            postprocess_start = time.time()
            try:
                from postprocessing.ffmpeg import get_ffmpeg_processor
                processor = get_ffmpeg_processor()
                if processor and processor.is_available and result.output_path:
                    # Generate a better thumbnail if ffmpeg is available
                    import os
                    thumb_path = result.output_path.replace(".mp4", "_thumb.jpg")
                    if not os.path.exists(thumb_path):
                        await processor.generate_thumbnail(
                            result.output_path, thumb_path, timestamp=0.5, width=640
                        )
                        if os.path.exists(thumb_path):
                            result.thumbnail_path = thumb_path
            except Exception as pp_err:
                logger.warning(f"[Worker] Post-processing skipped: {pp_err}")

            job.postprocess_time_seconds = round(time.time() - postprocess_start, 2)

            # ── Step 6: Finalize job ──
            job.progress = 95
            job.stage = "Saving output"
            await session.commit()
            await _publish_progress(job_id, "processing", 95, "Saving output")

            completed_at = datetime.now(timezone.utc)
            total_time = (completed_at - started_at).total_seconds()

            job.status = "completed"
            job.output_path = result.output_path
            job.thumbnail_path = result.thumbnail_path
            job.output_metadata = result.to_output_metadata()
            job.completed_at = completed_at
            job.inference_time_seconds = round(inference_time, 2)
            job.total_time_seconds = round(total_time, 2)
            job.peak_vram_gb = result.peak_vram_gb
            job.progress = 100
            job.stage = None

            # ── Step 7: Finalize credits ──
            await _finalize_credits(session, job, success=True)

            await session.commit()
            await _publish_progress(job_id, "completed", 100, None, output_path=result.output_path)

            # Update model stats (non-critical)
            try:
                if model_id and model_id != "auto":
                    model = await session.get(AIModel, model_id)
                    if model:
                        model.total_jobs_completed = (model.total_jobs_completed or 0) + 1
                        # Running average of inference time
                        if model.avg_inference_time_seconds:
                            model.avg_inference_time_seconds = round(
                                (model.avg_inference_time_seconds + inference_time) / 2, 2
                            )
                        else:
                            model.avg_inference_time_seconds = round(inference_time, 2)
                        if result.peak_vram_gb:
                            model.avg_vram_usage_gb = result.peak_vram_gb
                        await session.commit()
            except Exception as e:
                logger.warning(f"[Worker] Failed to update model stats: {e}")

            logger.info(
                f"[Worker] Job {job_id} completed in {total_time:.1f}s "
                f"(queue={job.queue_time_seconds:.1f}s, load={load_model_time:.1f}s, "
                f"inference={inference_time:.1f}s, post={job.postprocess_time_seconds:.1f}s)"
            )

            return {
                "status": "completed",
                "output_path": result.output_path,
                "total_time": round(total_time, 2),
            }

        except Exception as e:
            logger.error(f"[Worker] Job {job_id} failed: {e}", exc_info=True)

            # Update job status to failed
            job.status = "failed"
            job.error_message = str(e)[:1000]  # Truncate long errors
            job.completed_at = datetime.now(timezone.utc)
            job.total_time_seconds = (
                (job.completed_at - started_at).total_seconds() if started_at else None
            )
            job.retry_count = (job.retry_count or 0) + 1

            # Refund credits on final failure
            if job.retry_count >= job.max_retries:
                await _finalize_credits(session, job, success=False)

            await session.commit()
            await _publish_progress(job_id, "failed", job.progress, None, error=str(e)[:200])

            # Re-raise if retries remaining so arq can retry
            if job.retry_count < job.max_retries:
                logger.info(
                    f"[Worker] Job {job_id} will retry "
                    f"({job.retry_count}/{job.max_retries})"
                )
                raise

            logger.error(
                f"[Worker] Job {job_id} exhausted all retries "
                f"({job.retry_count}/{job.max_retries})"
            )
            return {"status": "failed", "error": str(e)}


async def startup(ctx: dict) -> None:
    """Worker startup hook — runs once when the worker process starts."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger.info("=" * 60)
    logger.info("[Worker] Starting up...")
    logger.info(f"[Worker] Output directory: {settings.output_dir}")
    logger.info(f"[Worker] Concurrency: {settings.worker_concurrency}")
    logger.info(f"[Worker] Job timeout: {settings.job_timeout_seconds}s")
    logger.info("=" * 60)

    # Ensure output directory exists
    settings.output_dir.mkdir(parents=True, exist_ok=True)

    # Log registered adapters
    from model_adapters import list_registered_adapters
    logger.info(f"[Worker] Registered adapters: {list_registered_adapters()}")


async def shutdown(ctx: dict) -> None:
    """Worker shutdown hook — unload all models and cleanup."""
    logger.info("[Worker] Shutting down...")

    # Unload all loaded adapters
    loaded = list_loaded_instances()
    if loaded:
        logger.info(f"[Worker] Unloading {len(loaded)} adapter(s)...")
        from model_adapters import _ADAPTER_INSTANCES, remove_adapter_instance

        for model_id, adapter in list(_ADAPTER_INSTANCES.items()):
            try:
                if adapter.status in (AdapterStatus.READY, AdapterStatus.GENERATING):
                    await adapter.unload_model()
                remove_adapter_instance(model_id)
            except Exception as e:
                logger.warning(f"[Worker] Error unloading '{model_id}': {e}")

    logger.info("[Worker] Shutdown complete")


# --- arq WorkerSettings ---


class WorkerSettings:
    """arq worker configuration."""

    functions = [process_video_job]
    on_startup = startup
    on_shutdown = shutdown

    redis_settings = get_redis_settings()

    max_jobs = settings.worker_concurrency
    job_timeout = settings.job_timeout_seconds
    queue_name = "arq:queue"

    # Retry settings
    max_tries = 3
    retry_delay = 10  # seconds between retries
