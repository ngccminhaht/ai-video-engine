"""Admin user management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.dependencies.auth import require_admin
from core.audit.models import AuditLog
from core.auth.models import User
from core.database import get_db
from core.job_queue.models import Job

router = APIRouter()


class AdminUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    credits: int
    email_verified: bool
    last_login_at: Optional[str]
    created_at: str
    jobs_count: int = 0

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=AdminUserListResponse)
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(default=None, max_length=200),
    role: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List all users (admin only)."""
    query = select(User)
    if search:
        query = query.where(
            (User.email.contains(search)) | (User.name.contains(search))
        )
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
    )
    users = result.scalars().all()

    items = []
    for u in users:
        jobs_count = await db.scalar(
            select(func.count()).select_from(Job).where(Job.user_id == u.id)
        ) or 0
        items.append(AdminUserResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role,
            status=u.status,
            credits=u.credits,
            email_verified=u.email_verified,
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
            created_at=u.created_at.isoformat() if u.created_at else "",
            jobs_count=jobs_count,
        ))

    return AdminUserListResponse(items=items, total=total, page=page, page_size=page_size)


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    data: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update user (role change requires SUPER_ADMIN)."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "role" in data and admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can change roles")

    if "role" in data:
        user.role = data["role"]
    if "status" in data:
        user.status = data["status"]

    await db.flush()

    # Audit log
    log = AuditLog(id=str(ULID()), user_id=admin.id, action="update_user",
                   resource_type="user", resource_id=user_id, details=data)
    db.add(log)
    await db.flush()

    return {"message": "User updated", "id": user_id}


@router.post("/{user_id}/credits")
async def adjust_credits(
    user_id: str,
    data: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add or remove credits from a user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    amount = data.get("amount", 0)
    if not isinstance(amount, int):
        raise HTTPException(status_code=400, detail="amount must be integer")

    user.credits += amount
    if user.credits < 0:
        user.credits = 0

    await db.flush()

    # Audit
    log = AuditLog(id=str(ULID()), user_id=admin.id, action="adjust_credits",
                   resource_type="user", resource_id=user_id,
                   details={"amount": amount, "new_balance": user.credits})
    db.add(log)
    await db.flush()

    return {"message": f"Credits adjusted by {amount}", "new_balance": user.credits}


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Suspend a user account."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")

    user.status = "suspended"
    await db.flush()

    log = AuditLog(id=str(ULID()), user_id=admin.id, action="suspend_user",
                   resource_type="user", resource_id=user_id)
    db.add(log)
    await db.flush()

    return {"message": "User suspended"}
