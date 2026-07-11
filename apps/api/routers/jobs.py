"""Job management API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.schemas.job_schemas import (
    JobCancelResponse,
    JobCreate,
    JobListResponse,
    JobResponse,
)
from core.database import get_db
from core.job_queue import enqueue_job
from core.job_queue.models import Job

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(data: JobCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new video generation job.

    The job is saved to the database with status 'pending', then pushed
    into the Redis queue for the worker to pick up.
    """
    job_id = str(ULID())

    job = Job(
        id=job_id,
        task_type=data.task_type,
        status="pending",
        model_id=data.model_id,
        inputs=data.inputs,
        generation_params=data.generation_params.model_dump(),
        priority=data.priority,
    )

    db.add(job)
    await db.flush()
    await db.refresh(job)

    # Enqueue to Redis for worker processing
    enqueued = await enqueue_job(
        job_id=job_id,
        task_type=data.task_type,
        priority=data.priority,
    )

    if enqueued:
        job.status = "queued"
        await db.flush()
        await db.refresh(job)
    else:
        # Job stays as 'pending' — can be retried later
        logger.warning(f"Job {job_id} created but failed to enqueue (Redis may be unavailable)")

    return job


@router.get("", response_model=JobListResponse)
async def list_jobs(
    status: str | None = Query(default=None, description="Filter by status"),
    task_type: str | None = Query(default=None, description="Filter by task_type"),
    model_id: str | None = Query(default=None, description="Filter by model_id"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List jobs with optional filters and pagination."""
    query = select(Job)

    if status:
        query = query.where(Job.status == status)
    if task_type:
        query = query.where(Job.task_type == task_type)
    if model_id:
        query = query.where(Job.model_id == model_id)

    # Count total matching
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate, order by newest first
    query = query.offset(skip).limit(limit).order_by(Job.created_at.desc())
    result = await db.execute(query)
    jobs = result.scalars().all()

    return JobListResponse(jobs=jobs, total=total or 0)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific job by ID."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


@router.post("/{job_id}/cancel", response_model=JobCancelResponse)
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Cancel a job.

    Only jobs in 'pending' or 'queued' status can be cancelled.
    Jobs already processing will complete (graceful cancellation is a future feature).
    """
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    cancellable_statuses = ("pending", "queued")
    if job.status not in cancellable_statuses:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel job in '{job.status}' status. "
            f"Only jobs in {cancellable_statuses} can be cancelled.",
        )

    job.status = "cancelled"
    await db.flush()
    await db.refresh(job)

    return JobCancelResponse(
        id=job.id,
        status=job.status,
        message="Job cancelled successfully",
    )
