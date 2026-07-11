"""Health check endpoints."""

from fastapi import APIRouter

from apps.api.config import get_settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Revid.IO API",
        "docs": "/docs",
        "health": "/health",
    }
