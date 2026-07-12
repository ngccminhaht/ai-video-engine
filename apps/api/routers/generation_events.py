"""SSE endpoint for realtime generation progress."""

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies.auth import get_current_user
from apps.api.services.notification_service import get_redis_client, subscribe_job_events
from core.auth.models import User
from core.database import get_db
from core.job_queue.models import Job

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/generations/{job_id}/events")
async def generation_events(
    job_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Server-Sent Events stream for generation progress.

    Subscribes to Redis PubSub for realtime updates.
    Falls back to polling if Redis is unavailable.

    Event types:
    - status_change: {status, progress, stage}
    - progress: {progress, stage, eta_seconds}
    - completed: {status, output_url}
    - failed: {status, error}
    - heartbeat: keepalive
    """
    # Verify ownership
    job = await db.get(Job, job_id)
    if not job or job.is_deleted:
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Generation not found")

    # If already terminal, send single event and close
    if job.status in ("completed", "failed", "cancelled"):
        async def terminal_stream():
            event = {
                "type": job.status,
                "status": job.status,
                "progress": 100 if job.status == "completed" else job.progress,
                "output_path": job.output_path,
                "error": job.error_message,
            }
            yield f"data: {json.dumps(event)}\n\n"

        return StreamingResponse(
            terminal_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Try Redis PubSub, fallback to polling
    redis = await get_redis_client()

    if redis:
        async def sse_stream():
            async for event in subscribe_job_events(job_id):
                if await request.is_disconnected():
                    break
                if event.get("type") == "heartbeat":
                    yield "event: heartbeat\ndata: {}\n\n"
                else:
                    yield f"data: {json.dumps(event)}\n\n"

        return StreamingResponse(
            sse_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        # Polling fallback — check DB every 2s
        async def polling_stream():
            from core.database import async_session_factory

            last_status = job.status
            last_progress = job.progress

            for _ in range(300):  # Max 10 minutes (300 * 2s)
                if await request.is_disconnected():
                    break

                async with async_session_factory() as session:
                    current = await session.get(Job, job_id)
                    if not current:
                        break

                    if current.status != last_status or current.progress != last_progress:
                        event = {
                            "type": "progress" if current.status == last_status else "status_change",
                            "status": current.status,
                            "progress": current.progress,
                            "stage": current.stage,
                        }
                        if current.status == "completed":
                            event["type"] = "completed"
                            event["output_path"] = current.output_path
                        elif current.status == "failed":
                            event["type"] = "failed"
                            event["error"] = current.error_message

                        yield f"data: {json.dumps(event)}\n\n"
                        last_status = current.status
                        last_progress = current.progress

                        if current.status in ("completed", "failed", "cancelled"):
                            break
                    else:
                        yield "event: heartbeat\ndata: {}\n\n"

                await asyncio.sleep(2)

        return StreamingResponse(
            polling_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
