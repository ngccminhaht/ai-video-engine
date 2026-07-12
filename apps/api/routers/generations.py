"""User-facing generation endpoints — create, list, get, cancel."""

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.dependencies.auth import get_current_user
from core.audit.models import AuditLog
from core.auth.models import User
from core.billing.service import create_credit_transaction
from core.database import get_db
from core.job_queue import enqueue_job
from core.job_queue.models import Job

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Schemas ---


class GenerationCreateRequest(BaseModel):
    task_type: str = Field(..., pattern="^(text_to_video|image_to_video)$")
    prompt: str = Field(..., min_length=1, max_length=2000)
    negative_prompt: Optional[str] = Field(default=None, max_length=2000)
    image_path: Optional[str] = None
    model_id: Optional[str] = None
    duration: float = Field(default=5.0, ge=1.0, le=30.0)
    resolution: str = Field(default="720p", pattern="^(480p|720p|1080p)$")
    fps: int = Field(default=24, ge=8, le=60)
    seed: Optional[int] = Field(default=None, ge=0)
    guidance_scale: float = Field(default=7.5, ge=1.0, le=20.0)
    num_inference_steps: int = Field(default=50, ge=10, le=200)
    project_id: Optional[str] = None
    idempotency_key: Optional[str] = Field(default=None, max_length=100)


class GenerationResponse(BaseModel):
    id: str
    task_type: str
    status: str
    model_id: Optional[str]
    prompt: Optional[str]
    progress: int
    stage: Optional[str]
    output_path: Optional[str]
    thumbnail_path: Optional[str]
    output_metadata: Optional[dict[str, Any]]
    error_message: Optional[str]
    credits_held: int
    credits_charged: int
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]


class GenerationListResponse(BaseModel):
    items: list[GenerationResponse]
    total: int
    page: int
    page_size: int


# --- Helpers ---


def job_to_response(job: Job) -> GenerationResponse:
    return GenerationResponse(
        id=job.id,
        task_type=job.task_type,
        status=job.status,
        model_id=job.model_id,
        prompt=job.inputs.get("prompt") if job.inputs else None,
        progress=job.progress,
        stage=job.stage,
        output_path=job.output_path,
        thumbnail_path=job.thumbnail_path,
        output_metadata=job.output_metadata,
        error_message=job.error_message,
        credits_held=job.credits_held,
        credits_charged=job.credits_charged,
        created_at=job.created_at.isoformat() if job.created_at else "",
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )


# --- Endpoints ---


@router.post("", response_model=GenerationResponse, status_code=201)
async def create_generation(
    data: GenerationCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new video generation job for the current user."""

    # Idempotency check: if client sends same key, return existing job
    if data.idempotency_key:
        result = await db.execute(
            select(Job).where(
                Job.user_id == user.id,
                Job.idempotency_key == data.idempotency_key,
            )
        )
        existing_job = result.scalar_one_or_none()
        if existing_job:
            return job_to_response(existing_job)

    # Calculate credit cost (simple: 2 credits per second of video)
    credit_cost = int(data.duration * 2)
    if data.resolution == "1080p":
        credit_cost = int(credit_cost * 2)

    # Check credits
    if user.credits < credit_cost:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient credits. Need {credit_cost}, have {user.credits}.",
        )

    # Hold credits
    user.credits -= credit_cost

    # Record credit hold transaction
    job_id = str(ULID())
    await create_credit_transaction(
        db=db,
        user_id=user.id,
        type="hold",
        amount=-credit_cost,
        job_id=job_id,
        note=f"Credit hold for {data.task_type} generation",
    )

    inputs: dict[str, Any] = {"prompt": data.prompt}
    if data.negative_prompt:
        inputs["negative_prompt"] = data.negative_prompt
    if data.image_path:
        inputs["image_path"] = data.image_path

    generation_params = {
        "duration": data.duration,
        "resolution": data.resolution,
        "fps": data.fps,
        "seed": data.seed,
        "guidance_scale": data.guidance_scale,
        "num_inference_steps": data.num_inference_steps,
    }

    job = Job(
        id=job_id,
        task_type=data.task_type,
        status="pending",
        user_id=user.id,
        project_id=data.project_id,
        model_id=data.model_id,
        inputs=inputs,
        generation_params=generation_params,
        priority=5,
        credits_held=credit_cost,
        idempotency_key=data.idempotency_key,
    )

    db.add(job)
    await db.flush()
    await db.refresh(job)

    # Enqueue to Redis
    enqueued = await enqueue_job(
        job_id=job_id,
        task_type=data.task_type,
        priority=5,
    )
    if enqueued:
        job.status = "queued"
        await db.flush()
        await db.refresh(job)

    logger.info(f"Generation created: {job_id} by user {user.id} (credits_held={credit_cost})")

    # Audit log
    db.add(AuditLog(
        id=str(ULID()), user_id=user.id, action="generation_created",
        resource_type="generation", resource_id=job_id,
        details={"task_type": data.task_type, "credits_held": credit_cost},
    ))
    await db.flush()

    return job_to_response(job)


@router.get("", response_model=GenerationListResponse)
async def list_generations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(default=None),
    task_type: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List current user's generations with optional filters."""
    query = select(Job).where(Job.user_id == user.id, not Job.is_deleted)

    if status and status != "all":
        query = query.where(Job.status == status)
    if task_type and task_type != "all":
        query = query.where(Job.task_type == task_type)
    if search:
        query = query.where(Job.inputs["prompt"].as_string().contains(search))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Job.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return GenerationListResponse(
        items=[job_to_response(j) for j in jobs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=GenerationResponse)
async def get_generation(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific generation by ID (must be owned by user)."""
    job = await db.get(Job, job_id)
    if not job or job.is_deleted:
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Generation not found")
    return job_to_response(job)


@router.post("/{job_id}/cancel")
async def cancel_generation(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a generation (refunds credits if held)."""
    job = await db.get(Job, job_id)
    if not job or job.is_deleted:
        raise HTTPException(status_code=404, detail="Generation not found")
    if job.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Generation not found")

    cancellable = ("pending", "queued")
    if job.status not in cancellable:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel job in '{job.status}' status.",
        )

    job.status = "cancelled"

    # Refund credits
    if job.credits_held > 0:
        user.credits += job.credits_held
        await create_credit_transaction(
            db=db,
            user_id=user.id,
            type="refund",
            amount=job.credits_held,
            job_id=job.id,
            note="Credits refunded due to cancellation",
        )
        job.credits_held = 0

    # Audit log
    db.add(AuditLog(
        id=str(ULID()), user_id=user.id, action="generation_cancelled",
        resource_type="generation", resource_id=job.id,
    ))
    await db.flush()
    return {"id": job.id, "status": "cancelled", "message": "Generation cancelled, credits refunded."}
