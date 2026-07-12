"""Generation options endpoint — dynamic form configuration for end-users."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies.auth import get_current_user
from core.auth.models import User
from core.database import get_db
from core.model_registry.models import AIModel

router = APIRouter()


class ModelOption(BaseModel):
    id: str
    display_name: str
    description: str | None
    capabilities: list[str]
    max_duration_seconds: int
    max_resolution: str
    max_fps: int
    supports_negative_prompt: bool
    supports_seed: bool
    supports_lora: bool
    estimated_time_seconds: int | None
    credit_cost_per_second: int
    style_preset: str | None


class StylePreset(BaseModel):
    id: str
    name: str
    description: str
    model_id: str


class GenerationOptionsResponse(BaseModel):
    models: list[ModelOption]
    style_presets: list[StylePreset]
    resolutions: list[str]
    aspect_ratios: list[str]
    fps_options: list[int]
    duration_range: dict[str, float]
    credit_costs: dict[str, dict[str, int]]


@router.get("/generation-options", response_model=GenerationOptionsResponse)
async def get_generation_options(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dynamic generation options for the video creation form.

    Returns available models (filtered by is_public + status), presets,
    supported resolutions, and credit cost info.
    """
    # Fetch public, available models
    result = await db.execute(
        select(AIModel).where(
            AIModel.is_public,
            AIModel.status.in_(["available", "loaded"]),
        )
    )
    models = result.scalars().all()

    model_options = []
    style_presets = []

    for m in models:
        # Resolution string from max dimensions
        if m.max_resolution_width >= 1920:
            max_res = "1080p"
        elif m.max_resolution_width >= 1280:
            max_res = "720p"
        else:
            max_res = "480p"

        model_options.append(
            ModelOption(
                id=m.id,
                display_name=m.display_name or m.name,
                description=m.description,
                capabilities=m.capabilities if isinstance(m.capabilities, list) else [],
                max_duration_seconds=m.max_duration_seconds,
                max_resolution=max_res,
                max_fps=m.max_fps,
                supports_negative_prompt=True,
                supports_seed=True,
                supports_lora=m.supports_lora,
                estimated_time_seconds=m.estimated_time_seconds,
                credit_cost_per_second=m.credit_cost_per_second if m.credit_cost_per_second else 2,
                style_preset=m.style_preset,
            )
        )

        # Create style preset entry if model has one
        if m.style_preset:
            style_presets.append(
                StylePreset(
                    id=m.style_preset,
                    name=m.style_preset.replace("_", " ").title(),
                    description=m.description or f"Generate with {m.display_name or m.name}",
                    model_id=m.id,
                )
            )

    # Add a default "Auto" style if there are models
    if model_options:
        style_presets.insert(
            0,
            StylePreset(
                id="auto",
                name="Auto",
                description="Automatically select the best model",
                model_id="auto",
            ),
        )

    return GenerationOptionsResponse(
        models=model_options,
        style_presets=style_presets,
        resolutions=["480p", "720p", "1080p"],
        aspect_ratios=["16:9", "9:16", "1:1"],
        fps_options=[16, 24, 30],
        duration_range={"min": 1.0, "max": 30.0},
        credit_costs={
            "480p": {"per_second": 1},
            "720p": {"per_second": 2},
            "1080p": {"per_second": 4},
        },
    )
