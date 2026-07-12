"""AI Video Platform - API Server entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from apps.api.config import get_settings
from apps.api.routers import (
    assets,
    auth,
    generation_events,
    generations,
    health,
    jobs,
    models,
    options,
    outputs,
    projects,
    storage,
    usage,
    users,
    workers,
)
from apps.api.routers.admin import router as admin_router

logger = logging.getLogger(__name__)


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
        allow_origins=(
            settings.cors_origins.split(",")
            if hasattr(settings, "cors_origins") and settings.cors_origins
            else ["*"]
        ),
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

    # --- Exception handlers for consistent error responses ---

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Standardize HTTP error responses."""
        trace_id = request.headers.get("X-Request-ID", "unknown")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": _status_to_code(exc.status_code),
                    "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                    "trace_id": trace_id,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Standardize validation error responses."""
        trace_id = request.headers.get("X-Request-ID", "unknown")
        errors = exc.errors()
        message = "; ".join(
            f"{'.'.join(str(loc) for loc in e.get('loc', []))}: {e.get('msg', '')}"
            for e in errors[:5]
        )
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": message,
                    "trace_id": trace_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Catch-all for unhandled exceptions — never leak stack traces."""
        trace_id = request.headers.get("X-Request-ID", "unknown")
        logger.error(f"Unhandled exception [trace={trace_id}]: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                    "trace_id": trace_id,
                }
            },
        )

    return app


def _status_to_code(status: int) -> str:
    """Map HTTP status codes to error code strings."""
    codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
        501: "NOT_IMPLEMENTED",
        503: "SERVICE_UNAVAILABLE",
    }
    return codes.get(status, f"HTTP_{status}")


app = create_app()
