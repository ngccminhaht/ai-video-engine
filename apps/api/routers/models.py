"""Model registry CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.schemas.model_schemas import (
    ModelCreate,
    ModelListResponse,
    ModelResponse,
    ModelUpdate,
)
from core.database import get_db
from core.model_registry.models import AIModel

router = APIRouter()


@router.post("", response_model=ModelResponse, status_code=201)
async def register_model(data: ModelCreate, db: AsyncSession = Depends(get_db)):
    """Register a new AI model."""
    # Check if model ID already exists
    existing = await db.get(AIModel, data.id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Model '{data.id}' already exists")

    model = AIModel(**data.model_dump())
    db.add(model)
    await db.flush()
    await db.refresh(model)
    return model


@router.get("", response_model=ModelListResponse)
async def list_models(
    status: str | None = Query(default=None, description="Filter by status"),
    capability: str | None = Query(default=None, description="Filter by capability"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all registered models with optional filters."""
    query = select(AIModel)

    if status:
        query = query.where(AIModel.status == status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    query = query.offset(skip).limit(limit).order_by(AIModel.created_at.desc())
    result = await db.execute(query)
    models = result.scalars().all()

    return ModelListResponse(models=models, total=total or 0)


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific model by ID."""
    model = await db.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")
    return model


@router.patch("/{model_id}", response_model=ModelResponse)
async def update_model(model_id: str, data: ModelUpdate, db: AsyncSession = Depends(get_db)):
    """Update a model (partial update)."""
    model = await db.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(model, field, value)

    await db.flush()
    await db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=204)
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a model from registry."""
    model = await db.get(AIModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    await db.delete(model)
