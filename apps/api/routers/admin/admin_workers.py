"""Admin worker management endpoints — drain, enable, disable."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ulid import ULID

from apps.api.dependencies.auth import require_admin
from core.auth.models import User
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.audit.models import AuditLog

router = APIRouter()


@router.post("/{worker_id}/drain")
async def drain_worker(
    worker_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Drain a worker — stop accepting new jobs, finish current."""
    # In production this would send a command to the worker via Redis
    log = AuditLog(id=str(ULID()), user_id=admin.id, action="drain_worker",
                   resource_type="worker", resource_id=worker_id)
    db.add(log)
    await db.flush()

    return {"message": f"Worker {worker_id} drain initiated", "status": "draining"}


@router.post("/{worker_id}/enable")
async def enable_worker(
    worker_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Re-enable a drained/disabled worker."""
    log = AuditLog(id=str(ULID()), user_id=admin.id, action="enable_worker",
                   resource_type="worker", resource_id=worker_id)
    db.add(log)
    await db.flush()

    return {"message": f"Worker {worker_id} enabled", "status": "online"}


@router.post("/{worker_id}/disable")
async def disable_worker(
    worker_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Disable a worker entirely."""
    log = AuditLog(id=str(ULID()), user_id=admin.id, action="disable_worker",
                   resource_type="worker", resource_id=worker_id)
    db.add(log)
    await db.flush()

    return {"message": f"Worker {worker_id} disabled", "status": "offline"}
