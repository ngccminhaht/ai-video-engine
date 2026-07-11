"""User-facing endpoints — dashboard, profile, usage."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies.auth import get_current_user
from apps.api.schemas.auth_schemas import UserResponse
from apps.api.services.auth_service import hash_password, verify_password
from core.auth.models import User
from core.database import get_db
from core.job_queue.models import Job

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Response schemas ---


class DashboardStats(BaseModel):
    total_videos: int
    completed_videos: int
    processing_jobs: int
    failed_jobs: int
    credits: int


class ActiveJob(BaseModel):
    id: str
    task_type: str
    status: str
    progress: int
    stage: str | None
    prompt: str | None
    created_at: str

    model_config = {"from_attributes": True}


class UserDashboardResponse(BaseModel):
    stats: DashboardStats
    active_jobs: list[ActiveJob]
    recent_completed: list[ActiveJob]


# --- Endpoints ---


@router.get("/me", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Get current user profile."""
    return user


@router.get("/me/dashboard", response_model=UserDashboardResponse)
async def get_user_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user dashboard data — stats, active jobs, recent completions."""

    # Stats
    total = await db.scalar(
        select(func.count()).select_from(Job).where(
            Job.user_id == user.id, Job.is_deleted == False
        )
    ) or 0

    completed = await db.scalar(
        select(func.count()).select_from(Job).where(
            Job.user_id == user.id, Job.status == "completed", Job.is_deleted == False
        )
    ) or 0

    processing = await db.scalar(
        select(func.count()).select_from(Job).where(
            Job.user_id == user.id,
            Job.status.in_(["pending", "queued", "loading_model", "processing", "post_processing"]),
            Job.is_deleted == False,
        )
    ) or 0

    failed = await db.scalar(
        select(func.count()).select_from(Job).where(
            Job.user_id == user.id, Job.status == "failed", Job.is_deleted == False
        )
    ) or 0

    stats = DashboardStats(
        total_videos=total,
        completed_videos=completed,
        processing_jobs=processing,
        failed_jobs=failed,
        credits=user.credits,
    )

    # Active jobs (non-terminal)
    active_result = await db.execute(
        select(Job)
        .where(
            Job.user_id == user.id,
            Job.status.in_(["pending", "queued", "loading_model", "processing", "post_processing"]),
            Job.is_deleted == False,
        )
        .order_by(Job.created_at.desc())
        .limit(10)
    )
    active_jobs = [
        ActiveJob(
            id=j.id,
            task_type=j.task_type,
            status=j.status,
            progress=j.progress,
            stage=j.stage,
            prompt=j.inputs.get("prompt", "") if j.inputs else None,
            created_at=j.created_at.isoformat() if j.created_at else "",
        )
        for j in active_result.scalars().all()
    ]

    # Recent completed (last 5)
    recent_result = await db.execute(
        select(Job)
        .where(
            Job.user_id == user.id,
            Job.status == "completed",
            Job.is_deleted == False,
        )
        .order_by(Job.completed_at.desc())
        .limit(5)
    )
    recent_completed = [
        ActiveJob(
            id=j.id,
            task_type=j.task_type,
            status=j.status,
            progress=100,
            stage=None,
            prompt=j.inputs.get("prompt", "") if j.inputs else None,
            created_at=j.created_at.isoformat() if j.created_at else "",
        )
        for j in recent_result.scalars().all()
    ]

    return UserDashboardResponse(
        stats=stats,
        active_jobs=active_jobs,
        recent_completed=recent_completed,
    )


# --- Profile Update ---


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile (name, avatar)."""
    if data.name is not None:
        user.name = data.name.strip()
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url

    await db.flush()
    await db.refresh(user)
    return user


# --- Password Change ---


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/me/change-password")
async def change_password(
    data: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password (requires current password verification)."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(data.new_password)
    await db.flush()

    return {"message": "Password changed successfully"}
