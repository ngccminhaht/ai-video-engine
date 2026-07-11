"""AI Video Platform - API Server entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.config import get_settings
from apps.api.routers import assets, auth, generation_events, generations, health, jobs, models, options, outputs, projects, storage, usage, users, workers
from apps.api.routers.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    import logging

    from core.job_queue import close_pool, init_pool

    logger = logging.getLogger(__name__)
    settings = get_settings()

    # Ensure storage directories exist
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)

    # Connect to Redis (arq job queue)
    try:
        await init_pool()
        logger.info("Redis job queue connected")
    except Exception as e:
        logger.warning(f"Redis unavailable — jobs will stay in 'pending' status: {e}")

    yield

    # Cleanup on shutdown
    await close_pool()

    from core.database import engine

    await engine.dispose()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Multi-model AI video generation platform",
        lifespan=lifespan,
    )

    # Security middleware (applied in reverse order — first added = outermost)
    from apps.api.middleware.security import (
        RateLimitMiddleware,
        RequestIdMiddleware,
        SecurityHeadersMiddleware,
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(RateLimitMiddleware)

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins.split(",") if hasattr(settings, "cors_origins") and settings.cors_origins else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Auth ---
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

    # --- User-facing (end-user) ---
    app.include_router(users.router, prefix="/api/v1", tags=["User"])
    app.include_router(generations.router, prefix="/api/v1/generations", tags=["Generations"])
    app.include_router(generation_events.router, prefix="/api/v1", tags=["Generation Events"])
    app.include_router(options.router, prefix="/api/v1", tags=["Generation Options"])
    app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
    app.include_router(outputs.router, prefix="/api/v1", tags=["Outputs"])
    app.include_router(assets.router, prefix="/api/v1/assets", tags=["Assets"])
    app.include_router(usage.router, prefix="/api/v1", tags=["Usage"])

    # --- Public/Shared ---
    app.include_router(health.router, tags=["Health"])

    # --- Existing endpoints (will be gated by auth in future phases) ---
    app.include_router(models.router, prefix="/api/v1/models", tags=["Models"])
    app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
    app.include_router(storage.router, prefix="/api/v1", tags=["Storage"])
    app.include_router(workers.router, prefix="/api/v1", tags=["Workers & Stats"])

    # --- Admin ---
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])

    return app


app = create_app()
