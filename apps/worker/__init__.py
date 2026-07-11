"""
arq Worker for processing video generation jobs.

Run with:
    arq apps.worker.WorkerSettings
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select

from apps.api.config import get_settings
from core.database import async_session_factory
from core.job_queue import get_redis_settings
from core.job_queue.models import Job

logger = logging.getLogger(__name__)


async def process_video_job(ctx: dict, job_id: str, task_type: str) -> dict:
    """
    Main worker function: process a video generation job.

    Steps:
    1. Load job from DB, update status to 'processing'
    2. Resolve model adapter
    3. Run inference (mock for now)
    4. Save output, update job status to 'completed'

    This is a skeleton — actual model inference is added in Step 1.4.
    """
    logger.info(f"Processing job {job_id} (task_type={task_type})")

    async with async_session_factory() as session:
        # Fetch job from database
        job = await session.get(Job, job_id)
        if not job:
            logger.error(f"Job {job_id} not found in database")
            return {"status": "error", "message": "Job not found"}

        # Check if cancelled before processing
        if job.status == "cancelled":
            logger.info(f"Job {job_id} was cancelled, skipping")
            return {"status": "cancelled"}

        started_at = datetime.now(timezone.utc)

        try:
            # Update status to processing
            job.status = "processing"
            job.started_at = started_at
            await session.commit()

            # --- MOCK INFERENCE (replaced in Step 1.4 with real model adapter) ---
            logger.info(f"Job {job_id}: Running mock inference for {task_type}")

            # Simulate work — in production this calls the model adapter
            # from model_adapters import get_adapter
            # adapter = get_adapter(job.model_id)
            # result = await adapter.generate(job.inputs, job.generation_params)

            import asyncio
            await asyncio.sleep(2)  # Simulate 2s inference

            # Mock output
            output_path = f"outputs/{job_id}.mp4"
            thumbnail_path = f"outputs/{job_id}_thumb.jpg"

            # --- END MOCK ---

            completed_at = datetime.now(timezone.utc)
            total_time = (completed_at - started_at).total_seconds()

            # Update job with results
            job.status = "completed"
            job.output_path = output_path
            job.thumbnail_path = thumbnail_path
            job.output_metadata = {
                "width": 1280,
                "height": 720,
                "duration": job.generation_params.get("duration", 5.0),
                "fps": job.generation_params.get("fps", 24),
                "file_size_mb": 0.0,  # Mock
            }
            job.completed_at = completed_at
            job.total_time_seconds = total_time
            job.inference_time_seconds = total_time  # All time is "inference" in mock
            job.queue_time_seconds = (
                (started_at - job.created_at).total_seconds() if job.created_at else None
            )

            await session.commit()
            logger.info(f"Job {job_id} completed in {total_time:.1f}s")

            return {"status": "completed", "output_path": output_path}

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)

            # Update job status to failed
            job.status = "failed"
            job.error_message = str(e)
            job.retry_count += 1
            await session.commit()

            # Let arq handle retry if max_retries not exceeded
            if job.retry_count < job.max_retries:
                raise  # arq will retry
            return {"status": "failed", "error": str(e)}


async def startup(ctx: dict) -> None:
    """Worker startup hook — runs once when the worker process starts."""
    logger.info("Worker starting up...")
    # Future: pre-load models, warm up GPU, etc.


async def shutdown(ctx: dict) -> None:
    """Worker shutdown hook — runs once when the worker process stops."""
    logger.info("Worker shutting down...")
    # Future: unload models, cleanup VRAM


# --- arq WorkerSettings ---

settings = get_settings()


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
