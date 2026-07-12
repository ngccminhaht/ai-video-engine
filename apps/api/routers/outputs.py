"""Output endpoints — download, preview, duplicate, variations."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.dependencies.auth import get_current_user
from core.auth.models import User
from core.billing.service import create_credit_transaction
from core.database import get_db
from core.job_queue import enqueue_job
from core.job_queue.models import Job

logger = logging.getLogger(__name__)

router = APIRouter()


class DownloadResponse(BaseModel):
    download_url: str
    filename: str


class DuplicateResponse(BaseModel):
    id: str
    status: str
    message: str


@router.get("/outputs/{job_id}/download", response_model=DownloadResponse)
async def get_download_url(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get download URL for a completed generation output."""
    job = await db.get(Job, job_id)
    if not job or job.is_deleted:
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.status != "completed" or not job.output_path:
        raise HTTPException(status_code=404, detail="No output available")

    # For local storage, return the file serve URL
    # In production, this would return a presigned S3 URL
    clean_path = job.output_path.replace("\\", "/")
    if not clean_path.startswith("/"):
        download_url = f"/api/v1/files/{clean_path}"
    else:
        download_url = f"/api/v1/files{clean_path}"

    filename = clean_path.split("/")[-1] if "/" in clean_path else clean_path

    return DownloadResponse(download_url=download_url, filename=filename)


@router.get("/outputs/{job_id}/preview")
async def get_preview_url(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get preview/thumbnail URL for a generation."""
    job = await db.get(Job, job_id)
    if not job or job.is_deleted:
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Generation not found")

    thumbnail = job.thumbnail_path
    output = job.output_path

    # Return thumbnail if available, else output
    path = thumbnail or output
    if not path:
        raise HTTPException(status_code=404, detail="No preview available")

    clean_path = path.replace("\\", "/")
    preview_url = f"/api/v1/files/{clean_path}" if not clean_path.startswith("/") else f"/api/v1/files{clean_path}"

    return {"preview_url": preview_url}


@router.post("/generations/{job_id}/duplicate", response_model=DuplicateResponse)
async def duplicate_generation(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a generation with the exact same settings."""
    job = await db.get(Job, job_id)
    if not job or job.is_deleted:
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Generation not found")

    # Calculate credit cost
    gen_params = job.generation_params or {}
    duration = gen_params.get("duration", 5)
    resolution = gen_params.get("resolution", "720p")
    cost_multiplier = 4 if resolution == "1080p" else 2 if resolution == "720p" else 1
    credit_cost = int(duration * cost_multiplier)

    if user.credits < credit_cost:
        raise HTTPException(status_code=403, detail=f"Insufficient credits. Need {credit_cost}.")

    user.credits -= credit_cost

    new_id = str(ULID())

    # Record credit hold transaction
    await create_credit_transaction(
        db=db,
        user_id=user.id,
        type="hold",
        amount=-credit_cost,
        job_id=new_id,
        note="Credit hold for duplicate generation",
    )

    new_job = Job(
        id=new_id,
        task_type=job.task_type,
        status="pending",
        user_id=user.id,
        project_id=job.project_id,
        model_id=job.model_id,
        inputs=job.inputs,
        generation_params=job.generation_params,
        priority=5,
        credits_held=credit_cost,
    )
    db.add(new_job)
    await db.flush()

    enqueued = await enqueue_job(job_id=new_id, task_type=job.task_type, priority=5)
    if enqueued:
        new_job.status = "queued"
        await db.flush()

    return DuplicateResponse(id=new_id, status=new_job.status, message="Generation duplicated")


@router.post("/generations/{job_id}/variations", response_model=DuplicateResponse)
async def generate_variation(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a variation — same prompt/settings but different seed."""
    job = await db.get(Job, job_id)
    if not job or job.is_deleted:
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Generation not found")

    import random

    # Same settings but new seed
    gen_params = dict(job.generation_params or {})
    gen_params["seed"] = random.randint(0, 2**32 - 1)

    duration = gen_params.get("duration", 5)
    resolution = gen_params.get("resolution", "720p")
    cost_multiplier = 4 if resolution == "1080p" else 2 if resolution == "720p" else 1
    credit_cost = int(duration * cost_multiplier)

    if user.credits < credit_cost:
        raise HTTPException(status_code=403, detail=f"Insufficient credits. Need {credit_cost}.")

    user.credits -= credit_cost

    new_id = str(ULID())

    # Record credit hold transaction
    await create_credit_transaction(
        db=db,
        user_id=user.id,
        type="hold",
        amount=-credit_cost,
        job_id=new_id,
        note="Credit hold for variation generation",
    )

    new_job = Job(
        id=new_id,
        task_type=job.task_type,
        status="pending",
        user_id=user.id,
        project_id=job.project_id,
        model_id=job.model_id,
        inputs=job.inputs,
        generation_params=gen_params,
        priority=5,
        credits_held=credit_cost,
    )
    db.add(new_job)
    await db.flush()

    enqueued = await enqueue_job(job_id=new_id, task_type=job.task_type, priority=5)
    if enqueued:
        new_job.status = "queued"
        await db.flush()

    return DuplicateResponse(id=new_id, status=new_job.status, message="Variation created with new seed")
