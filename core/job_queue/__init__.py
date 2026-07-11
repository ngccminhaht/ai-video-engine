"""Job queue service using arq (Redis-backed async job queue)."""

import logging
from typing import Optional

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from apps.api.config import get_settings

logger = logging.getLogger(__name__)

# Global Redis pool for the API process
_arq_pool: Optional[ArqRedis] = None


def get_redis_settings() -> RedisSettings:
    """Parse REDIS_URL into arq RedisSettings."""
    settings = get_settings()
    url = settings.redis_url  # e.g. redis://localhost:6379/0

    # Parse redis://host:port/db
    url_body = url.replace("redis://", "")
    db = 0
    if "/" in url_body:
        host_port, db_str = url_body.rsplit("/", 1)
        db = int(db_str) if db_str else 0
    else:
        host_port = url_body

    if ":" in host_port:
        host, port_str = host_port.split(":", 1)
        port = int(port_str)
    else:
        host = host_port
        port = 6379

    return RedisSettings(host=host, port=port, database=db)


async def init_pool() -> ArqRedis:
    """Initialize the arq Redis connection pool. Call on app startup."""
    global _arq_pool
    if _arq_pool is None:
        redis_settings = get_redis_settings()
        _arq_pool = await create_pool(redis_settings)
        logger.info(f"arq Redis pool connected: {redis_settings.host}:{redis_settings.port}")
    return _arq_pool


async def close_pool() -> None:
    """Close the arq Redis pool. Call on app shutdown."""
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.aclose()
        _arq_pool = None
        logger.info("arq Redis pool closed")


def get_pool() -> Optional[ArqRedis]:
    """Get the current arq pool (must call init_pool first)."""
    return _arq_pool


async def enqueue_job(job_id: str, task_type: str, priority: int = 5) -> bool:
    """
    Enqueue a video generation job for the worker to pick up.

    Args:
        job_id: The ULID of the job record in the database.
        task_type: The type of task (text_to_video, image_to_video).
        priority: Job priority (1=highest, 10=lowest).

    Returns:
        True if successfully enqueued, False otherwise.
    """
    pool = get_pool()
    if pool is None:
        logger.error("Cannot enqueue job: Redis pool not initialized")
        return False

    try:
        await pool.enqueue_job(
            "process_video_job",  # Worker function name
            job_id=job_id,
            task_type=task_type,
            _job_id=f"job:{job_id}",  # Deduplicate by job ID
            _queue_name="arq:queue",
        )
        logger.info(f"Job {job_id} enqueued (task_type={task_type}, priority={priority})")
        return True
    except Exception as e:
        logger.error(f"Failed to enqueue job {job_id}: {e}")
        return False
