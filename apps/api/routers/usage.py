"""Usage and billing endpoints for end-users."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies.auth import get_current_user
from core.auth.models import User
from core.billing.models import CreditTransaction, Subscription, UsageRecord
from core.database import get_db
from core.job_queue.models import Job

router = APIRouter()


class UsageSummary(BaseModel):
    credits_balance: int
    credits_used_this_month: int
    total_videos_generated: int
    total_seconds_generated: float
    storage_used_mb: float


class PlanInfo(BaseModel):
    name: str
    monthly_credits: int
    max_storage_gb: int
    max_resolution: str
    status: str


class TransactionItem(BaseModel):
    id: str
    type: str
    amount: int
    status: str
    note: Optional[str]
    created_at: str


class UsageResponse(BaseModel):
    summary: UsageSummary
    plan: PlanInfo
    recent_transactions: list[TransactionItem]


@router.get("/me/usage", response_model=UsageResponse)
async def get_usage(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's usage summary, plan info, and recent credit transactions."""

    # Total videos
    total_videos = await db.scalar(
        select(func.count()).select_from(Job).where(
            Job.user_id == user.id, Job.status == "completed"
        )
    ) or 0

    # Total seconds generated (sum durations from generation_params)
    completed_jobs = await db.execute(
        select(Job.generation_params).where(
            Job.user_id == user.id, Job.status == "completed"
        )
    )
    total_seconds = sum(
        (row[0] or {}).get("duration", 0) for row in completed_jobs.all()
    )

    # Credits used this month (sum negative transactions)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    credits_used = await db.scalar(
        select(func.sum(CreditTransaction.amount)).where(
            CreditTransaction.user_id == user.id,
            CreditTransaction.amount < 0,
            CreditTransaction.created_at >= month_start,
        )
    ) or 0

    summary = UsageSummary(
        credits_balance=user.credits,
        credits_used_this_month=abs(credits_used),
        total_videos_generated=total_videos,
        total_seconds_generated=round(total_seconds, 1),
        storage_used_mb=0,  # Would calculate from assets in full implementation
    )

    # Plan info (use default if no subscription)
    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = sub_result.scalar_one_or_none()

    if sub:
        plan = PlanInfo(
            name=sub.plan_id.title(),
            monthly_credits=sub.monthly_credits,
            max_storage_gb=sub.max_storage_gb,
            max_resolution=sub.max_resolution,
            status=sub.status,
        )
    else:
        plan = PlanInfo(
            name="Free",
            monthly_credits=100,
            max_storage_gb=5,
            max_resolution="720p",
            status="active",
        )

    # Recent transactions
    tx_result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user.id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(20)
    )
    transactions = [
        TransactionItem(
            id=t.id,
            type=t.type,
            amount=t.amount,
            status=t.status,
            note=t.note,
            created_at=t.created_at.isoformat() if t.created_at else "",
        )
        for t in tx_result.scalars().all()
    ]

    return UsageResponse(
        summary=summary,
        plan=plan,
        recent_transactions=transactions,
    )
