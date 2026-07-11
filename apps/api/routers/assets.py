"""User assets CRUD endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.dependencies.auth import get_current_user
from core.assets.models import Asset
from core.auth.models import User
from core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Schemas ---


class AssetResponse(BaseModel):
    id: str
    type: str
    filename: str
    storage_path: str
    content_type: str
    size_bytes: int
    size_mb: float
    status: str
    preview_url: str
    created_at: str


class AssetListResponse(BaseModel):
    items: list[AssetResponse]
    total: int
    page: int
    page_size: int


class AssetCreateRequest(BaseModel):
    """Confirm an upload as an asset."""
    filename: str = Field(..., min_length=1, max_length=255)
    storage_path: str = Field(..., min_length=1)
    content_type: str = Field(..., min_length=1)
    size_bytes: int = Field(..., ge=0)
    type: str = Field(default="image", pattern="^(image|video|thumbnail)$")


# --- Helpers ---


def _to_response(asset: Asset) -> AssetResponse:
    clean_path = asset.storage_path.replace("\\", "/")
    preview_url = f"/api/v1/files/{clean_path}" if not clean_path.startswith("/") else f"/api/v1/files{clean_path}"
    return AssetResponse(
        id=asset.id,
        type=asset.type,
        filename=asset.filename,
        storage_path=asset.storage_path,
        content_type=asset.content_type,
        size_bytes=asset.size_bytes,
        size_mb=round(asset.size_bytes / (1024 * 1024), 2),
        status=asset.status,
        preview_url=preview_url,
        created_at=asset.created_at.isoformat() if asset.created_at else "",
    )


# --- Endpoints ---


@router.get("", response_model=AssetListResponse)
async def list_assets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    type: Optional[str] = Query(default=None, description="Filter by type: image, video"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List user's assets with optional type filter."""
    query = select(Asset).where(Asset.user_id == user.id, Asset.status == "active")

    if type and type != "all":
        query = query.where(Asset.type == type)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Asset.created_at.desc()).offset(offset).limit(page_size)
    )
    assets = result.scalars().all()

    return AssetListResponse(
        items=[_to_response(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=AssetResponse, status_code=201)
async def create_asset(
    data: AssetCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register an uploaded file as a user asset."""
    asset = Asset(
        id=str(ULID()),
        user_id=user.id,
        type=data.type,
        filename=data.filename,
        storage_path=data.storage_path,
        content_type=data.content_type,
        size_bytes=data.size_bytes,
    )
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return _to_response(asset)


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get asset detail."""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.status == "deleted":
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Asset not found")
    return _to_response(asset)


@router.patch("/{asset_id}", response_model=AssetResponse)
async def rename_asset(
    asset_id: str,
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename an asset."""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.status == "deleted":
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Asset not found")

    if "filename" in data:
        asset.filename = data["filename"][:255]

    await db.flush()
    await db.refresh(asset)
    return _to_response(asset)


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete an asset."""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.status == "deleted":
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.status = "deleted"
    await db.flush()
    return {"message": "Asset deleted"}
