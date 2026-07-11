"""Admin API routers."""

from fastapi import APIRouter

from apps.api.routers.admin import users as admin_users
from apps.api.routers.admin import logs as admin_logs
from apps.api.routers.admin import admin_models
from apps.api.routers.admin import admin_workers

router = APIRouter()
router.include_router(admin_users.router, prefix="/users", tags=["Admin Users"])
router.include_router(admin_logs.router, prefix="/logs", tags=["Admin Logs"])
router.include_router(admin_models.router, prefix="/models", tags=["Admin Models"])
router.include_router(admin_workers.router, prefix="/workers", tags=["Admin Workers"])
