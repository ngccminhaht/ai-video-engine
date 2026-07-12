"""Workers & Monitoring API endpoints (admin only)."""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies.auth import require_admin
from core.auth.models import User
from core.database import get_db
from core.job_queue.models import Job
from core.model_registry.models import AIModel
from core.monitoring import get_resource_manager
from core.storage import get_storage_service

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Response schemas ---


class GpuInfoResponse(BaseModel):
    index: int
    name: str
    utilization_percent: float
    vram_used_gb: float
    vram_total_gb: float
    vram_free_gb: float
    vram_used_percent: float
    temperature_celsius: int
    power_draw_watts: float
    power_limit_watts: float


class WorkerResponse(BaseModel):
    id: str
    hostname: str
    status: str
    gpu: GpuInfoResponse
    current_job_id: str | None
    loaded_model_id: str | None
    last_heartbeat: str
    uptime_seconds: float | None = None


class DashboardStatsResponse(BaseModel):
    total_jobs: int
    pending_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    total_models: int
    loaded_models: int
    total_models_available: int
    workers_online: int
    gpu_utilization: float
    vram_used_gb: float
    vram_total_gb: float
    storage_used_tb: float


# --- Endpoints ---


@router.get("/workers", response_model=list[WorkerResponse])
async def list_workers(admin: User = Depends(require_admin)):
    """
    List active workers with GPU status.

    Currently returns local worker info. Multi-worker support in Phase 2.
    """
    resource_manager = get_resource_manager()
    worker = resource_manager.get_worker_status()
    return [worker.to_dict()]


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """
    Get aggregated dashboard statistics.

    Combines job counts, model counts, GPU status, and storage info.
    """
    # Job counts by status
    job_counts = {}
    for status in ["pending", "queued", "processing", "completed", "failed", "cancelled"]:
        count = await db.scalar(
            select(func.count()).select_from(Job).where(Job.status == status)
        )
        job_counts[status] = count or 0

    total_jobs = await db.scalar(select(func.count()).select_from(Job)) or 0

    # Model counts
    total_models = await db.scalar(select(func.count()).select_from(AIModel)) or 0
    available_models = await db.scalar(
        select(func.count()).select_from(AIModel).where(AIModel.status == "available")
    ) or 0
    loaded_models = await db.scalar(
        select(func.count()).select_from(AIModel).where(AIModel.status == "loaded")
    ) or 0

    # GPU info
    resource_manager = get_resource_manager()
    gpu_info = resource_manager.monitor.get_gpu_info()

    # Storage info
    storage = get_storage_service()
    storage_stats = storage.get_storage_stats()

    return DashboardStatsResponse(
        total_jobs=total_jobs,
        pending_jobs=job_counts.get("pending", 0) + job_counts.get("queued", 0),
        running_jobs=job_counts.get("processing", 0),
        completed_jobs=job_counts.get("completed", 0),
        failed_jobs=job_counts.get("failed", 0),
        total_models=total_models,
        loaded_models=loaded_models,
        total_models_available=available_models,
        workers_online=1,  # Single worker for now
        gpu_utilization=gpu_info.utilization_percent,
        vram_used_gb=gpu_info.vram_used_gb,
        vram_total_gb=gpu_info.vram_total_gb,
        storage_used_tb=storage_stats.total_size_mb / (1024 * 1024),  # MB → TB
    )
