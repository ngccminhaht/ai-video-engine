"""Projects CRUD endpoints for end-users."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from apps.api.dependencies.auth import get_current_user
from core.auth.models import User
from core.database import get_db
from core.job_queue.models import Job
from core.projects.models import Project

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Schemas ---


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    generation_count: int
    status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int


class ProjectDetailResponse(ProjectResponse):
    recent_jobs: list[dict]


# --- Endpoints ---


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project."""
    project = Project(
        id=str(ULID()),
        user_id=user.id,
        name=data.name,
        description=data.description,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    return _to_response(project)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List user's projects."""
    query = select(Project).where(
        Project.user_id == user.id,
        Project.status != "deleted",
    )
    if status and status != "all":
        query = query.where(Project.status == status)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Project.updated_at.desc()).offset(offset).limit(page_size)
    )
    projects = result.scalars().all()

    return ProjectListResponse(
        items=[_to_response(p) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get project detail with recent jobs."""
    project = await db.get(Project, project_id)
    if not project or project.status == "deleted":
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Project not found")

    # Get recent jobs
    jobs_result = await db.execute(
        select(Job)
        .where(Job.project_id == project_id, Job.is_deleted == False)
        .order_by(Job.created_at.desc())
        .limit(20)
    )
    jobs = jobs_result.scalars().all()

    recent_jobs = [
        {
            "id": j.id,
            "task_type": j.task_type,
            "status": j.status,
            "prompt": j.inputs.get("prompt") if j.inputs else None,
            "output_path": j.output_path,
            "thumbnail_path": j.thumbnail_path,
            "created_at": j.created_at.isoformat() if j.created_at else "",
        }
        for j in jobs
    ]

    resp = _to_response(project)
    return ProjectDetailResponse(**resp.model_dump(), recent_jobs=recent_jobs)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a project (rename, description)."""
    project = await db.get(Project, project_id)
    if not project or project.status == "deleted":
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description

    await db.flush()
    await db.refresh(project)
    return _to_response(project)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a project."""
    project = await db.get(Project, project_id)
    if not project or project.status == "deleted":
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != user.id and user.role == "USER":
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = "deleted"
    await db.flush()
    return {"message": "Project deleted"}


# --- Helpers ---


def _to_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        thumbnail_url=project.thumbnail_url,
        generation_count=project.generation_count,
        status=project.status,
        created_at=project.created_at.isoformat() if project.created_at else "",
        updated_at=project.updated_at.isoformat() if project.updated_at else "",
    )
