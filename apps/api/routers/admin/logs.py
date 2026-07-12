"""Admin audit logs endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies.auth import require_admin
from core.audit.models import AuditLog
from core.auth.models import User
from core.database import get_db

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    created_at: str


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    action: Optional[str] = Query(default=None),
    resource_type: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """Query audit logs with filters."""
    query = select(AuditLog)

    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    )
    logs = result.scalars().all()

    items = [
        AuditLogResponse(
            id=log_entry.id,
            user_id=log_entry.user_id,
            action=log_entry.action,
            resource_type=log_entry.resource_type,
            resource_id=log_entry.resource_id,
            details=log_entry.details,
            ip_address=log_entry.ip_address,
            created_at=log_entry.created_at.isoformat() if log_entry.created_at else "",
        )
        for log_entry in logs
    ]

    return AuditLogListResponse(items=items, total=total, page=page, page_size=page_size)
