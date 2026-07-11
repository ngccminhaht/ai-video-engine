"""Job management endpoints - placeholder for Step 1.3."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_jobs():
    """List all jobs."""
    # TODO: Implement in Step 1.3
    return {"jobs": [], "total": 0}
