"""AI Video Platform - API Server entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.config import get_settings
from apps.api.routers import health, jobs, models, storage, workers


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

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Restrict in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(models.router, prefix="/api/v1/models", tags=["Models"])
    app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
    app.include_router(storage.router, prefix="/api/v1", tags=["Storage"])
    app.include_router(workers.router, prefix="/api/v1", tags=["Workers & Stats"])

    return app


app = create_app()
