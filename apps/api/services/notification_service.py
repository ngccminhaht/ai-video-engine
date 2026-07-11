"""
Notification service — publishes and subscribes to job progress events via Redis PubSub.

Used by:
- Worker: publishes progress updates
- SSE endpoint: subscribes and streams to frontend
- Fallback: direct DB polling if Redis unavailable
"""

import asyncio
import json
import logging
from typing import AsyncGenerator

from apps.api.config import get_settings

logger = logging.getLogger(__name__)

# Try to import redis
try:
    import redis.asyncio as aioredis
    _redis_available = True
except ImportError:
    _redis_available = False
    logger.info("redis.asyncio not available — SSE will use polling fallback")


_redis_client: "aioredis.Redis | None" = None


async def get_redis_client() -> "aioredis.Redis | None":
    """Get or create async Redis client for PubSub."""
    global _redis_client
    if not _redis_available:
        return None
    if _redis_client is None:
        settings = get_settings()
        try:
            _redis_client = aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
            )
            await _redis_client.ping()
            logger.info("Redis PubSub client connected")
        except Exception as e:
            logger.warning(f"Redis PubSub unavailable: {e}")
            _redis_client = None
    return _redis_client


async def publish_job_event(job_id: str, event: dict) -> bool:
    """
    Publish a job progress event to Redis PubSub.

    Called by the worker during processing.
    """
    client = await get_redis_client()
    if not client:
        return False
    try:
        channel = f"job:{job_id}"
        await client.publish(channel, json.dumps(event))
        return True
    except Exception as e:
        logger.warning(f"Failed to publish event for job {job_id}: {e}")
        return False


async def subscribe_job_events(job_id: str) -> AsyncGenerator[dict, None]:
    """
    Subscribe to job progress events via Redis PubSub.

    Yields event dicts as they arrive. Sends heartbeat every 15s.
    """
    client = await get_redis_client()
    if not client:
        return

    pubsub = client.pubsub()
    channel = f"job:{job_id}"

    try:
        await pubsub.subscribe(channel)
        logger.debug(f"Subscribed to {channel}")

        while True:
            try:
                message = await asyncio.wait_for(
                    pubsub.get_message(ignore_subscribe_messages=True),
                    timeout=15.0,
                )
                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    yield data
                    # Stop if terminal
                    if data.get("status") in ("completed", "failed", "cancelled"):
                        break
                else:
                    # Heartbeat
                    yield {"type": "heartbeat"}
            except asyncio.TimeoutError:
                yield {"type": "heartbeat"}
    except Exception as e:
        logger.warning(f"PubSub error for {channel}: {e}")
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception:
            pass
