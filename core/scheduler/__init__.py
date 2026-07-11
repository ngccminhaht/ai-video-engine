"""
Model Router — smart model selection when model_id="auto".

Routes jobs to the best available model based on:
1. Task type compatibility (T2V vs I2V)
2. VRAM availability
3. Model status (available/loaded preferred)
4. Historical performance (faster models preferred)
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.model_registry.models import AIModel
from core.monitoring import get_resource_manager

logger = logging.getLogger(__name__)


class ModelRouter:
    """
    Routes jobs to the best model based on task requirements and resources.

    Selection criteria (in priority order):
    1. Model must support the requested task_type
    2. Model must not be disabled
    3. Prefer currently loaded models (no load time)
    4. Prefer models that fit in available VRAM
    5. Prefer models with better performance history
    """

    async def select_model(
        self,
        session: AsyncSession,
        task_type: str,
        preferred_model_id: Optional[str] = None,
    ) -> Optional[AIModel]:
        """
        Select the best model for a job.

        Args:
            session: DB session
            task_type: "text_to_video" or "image_to_video"
            preferred_model_id: If set and not "auto", try this model first.

        Returns:
            AIModel instance or None if no suitable model found.
        """
        # If a specific model is requested, use it
        if preferred_model_id and preferred_model_id != "auto":
            model = await session.get(AIModel, preferred_model_id)
            if model and model.status != "disabled":
                return model
            logger.warning(
                f"[Router] Preferred model '{preferred_model_id}' not available, "
                f"falling back to auto-selection"
            )

        # Query all eligible models
        query = (
            select(AIModel)
            .where(AIModel.status.in_(["available", "loaded", "loading"]))
        )
        result = await session.execute(query)
        all_models = result.scalars().all()

        if not all_models:
            logger.error("[Router] No models available in registry")
            return None

        # Filter by task type capability
        capable_models = [
            m for m in all_models
            if task_type in (m.capabilities or [])
        ]

        if not capable_models:
            logger.warning(
                f"[Router] No models support task_type '{task_type}'. "
                f"Available tasks: {set(cap for m in all_models for cap in (m.capabilities or []))}"
            )
            # Fallback: return any model (mock adapter handles all types)
            capable_models = all_models

        # Score and rank models
        scored_models = []
        resource_manager = get_resource_manager()
        free_vram = resource_manager.monitor.get_free_vram_gb()

        for model in capable_models:
            score = self._score_model(model, free_vram, resource_manager)
            scored_models.append((score, model))

        # Sort by score descending (higher = better)
        scored_models.sort(key=lambda x: x[0], reverse=True)

        selected = scored_models[0][1]
        logger.info(
            f"[Router] Auto-selected model: '{selected.id}' "
            f"(score={scored_models[0][0]:.1f}, adapter={selected.adapter_name})"
        )
        return selected

    def _score_model(
        self,
        model: AIModel,
        free_vram_gb: float,
        resource_manager,
    ) -> float:
        """
        Score a model for selection (higher = better).

        Scoring factors:
        - Already loaded: +50 (no load time needed)
        - Fits in VRAM: +30
        - Performance: up to +20 (based on avg inference time)
        - Available status: +10
        """
        score = 0.0

        # Already loaded → big bonus (skip load time)
        loaded_models = resource_manager.lru_cache.loaded_models
        if model.id in loaded_models:
            score += 50

        # Fits in available VRAM
        required_vram = model.minimum_vram_gb or 0
        if free_vram_gb >= required_vram or not resource_manager.monitor.is_available:
            score += 30
        elif free_vram_gb >= required_vram * 0.7:
            # Might fit with quantization
            score += 15

        # Performance history (faster = higher score)
        if model.avg_inference_time_seconds:
            # Normalize: 10s → 20 points, 60s → 3 points
            perf_score = max(0, 20 - (model.avg_inference_time_seconds / 3))
            score += perf_score

        # Availability status
        if model.status == "available":
            score += 10
        elif model.status == "loaded":
            score += 15

        # Job count reliability (more jobs = more reliable)
        if model.total_jobs_completed and model.total_jobs_completed > 10:
            score += 5

        return score


# --- Singleton ---

_router: Optional[ModelRouter] = None


def get_model_router() -> ModelRouter:
    """Get the model router singleton."""
    global _router
    if _router is None:
        _router = ModelRouter()
    return _router
