"""Admin model management endpoints — load, unload, test, enable/disable."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.dependencies.auth import require_admin
from core.audit.models import AuditLog
from core.auth.models import User
from core.database import get_db
from core.model_registry.models import AIModel

router = APIRouter()


@router.post("/{model_id}/load")
async def load_model(
    model_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Load a model into GPU memory."""
    model = await db.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.status = "loading"
    await db.flush()

    # In production, this would trigger the worker to load the model
    # For now, we just update status
    log = AuditLog(id=str(ULID()), user_id=admin.id, action="load_model",
                   resource_type="model", resource_id=model_id)
    db.add(log)
    await db.flush()

    return {"message": f"Model {model_id} load initiated", "status": "loading"}


@router.post("/{model_id}/unload")
async def unload_model(
    model_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Unload a model from GPU memory."""
    model = await db.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.status = "available"
    await db.flush()

    log = AuditLog(id=str(ULID()), user_id=admin.id, action="unload_model",
                   resource_type="model", resource_id=model_id)
    db.add(log)
    await db.flush()

    return {"message": f"Model {model_id} unloaded", "status": "available"}


@router.post("/{model_id}/enable")
async def enable_model(
    model_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Enable a disabled model."""
    model = await db.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.status = "available"
    await db.flush()

    log = AuditLog(id=str(ULID()), user_id=admin.id, action="enable_model",
                   resource_type="model", resource_id=model_id)
    db.add(log)
    await db.flush()

    return {"message": f"Model {model_id} enabled"}


@router.post("/{model_id}/disable")
async def disable_model(
    model_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Disable a model (prevents new generations)."""
    model = await db.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.status = "disabled"
    await db.flush()

    log = AuditLog(id=str(ULID()), user_id=admin.id, action="disable_model",
                   resource_type="model", resource_id=model_id)
    db.add(log)
    await db.flush()

    return {"message": f"Model {model_id} disabled"}
