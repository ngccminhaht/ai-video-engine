"""
Model Adapter Registry.

Central registry that maps adapter_name → adapter class.
The worker uses this to resolve which adapter to instantiate for a given model.
"""

import logging
from typing import Any

from model_adapters.base import BaseModelAdapter

logger = logging.getLogger(__name__)

# --- Adapter Registry ---

_ADAPTER_REGISTRY: dict[str, type[BaseModelAdapter]] = {}

# Cache of loaded adapter instances (keyed by model_id)
_ADAPTER_INSTANCES: dict[str, BaseModelAdapter] = {}


def register_adapter(name: str, adapter_class: type[BaseModelAdapter]) -> None:
    """
    Register an adapter class by name.

    Args:
        name: The adapter name (matches AIModel.adapter_name in DB).
        adapter_class: The adapter class implementing BaseModelAdapter.
    """
    if not issubclass(adapter_class, BaseModelAdapter):
        raise TypeError(f"{adapter_class} must be a subclass of BaseModelAdapter")
    _ADAPTER_REGISTRY[name] = adapter_class
    logger.debug(f"Registered adapter: '{name}' → {adapter_class.__name__}")


def get_adapter_class(adapter_name: str) -> type[BaseModelAdapter]:
    """
    Get the adapter class for a given adapter name.

    Args:
        adapter_name: The adapter name (e.g. "mock", "cogvideo", "wan").

    Returns:
        The adapter class.

    Raises:
        KeyError: If no adapter is registered with that name.
    """
    if adapter_name not in _ADAPTER_REGISTRY:
        available = list(_ADAPTER_REGISTRY.keys())
        raise KeyError(
            f"No adapter registered with name '{adapter_name}'. "
            f"Available adapters: {available}"
        )
    return _ADAPTER_REGISTRY[adapter_name]


def get_adapter_instance(
    model_id: str,
    adapter_name: str,
    config: dict[str, Any] | None = None,
) -> BaseModelAdapter:
    """
    Get or create an adapter instance for a specific model.

    Reuses existing instances (singleton per model_id) to avoid
    re-loading models unnecessarily.

    Args:
        model_id: The model ID (e.g. "cogvideox-5b").
        adapter_name: The adapter type (e.g. "mock").
        config: Optional model-specific config dict.

    Returns:
        A BaseModelAdapter instance (may or may not be loaded).
    """
    if model_id in _ADAPTER_INSTANCES:
        return _ADAPTER_INSTANCES[model_id]

    adapter_class = get_adapter_class(adapter_name)
    instance = adapter_class(model_id=model_id, config=config)
    _ADAPTER_INSTANCES[model_id] = instance
    logger.info(f"Created adapter instance: {adapter_name} for model '{model_id}'")
    return instance


def remove_adapter_instance(model_id: str) -> None:
    """Remove a cached adapter instance (after unloading)."""
    if model_id in _ADAPTER_INSTANCES:
        del _ADAPTER_INSTANCES[model_id]
        logger.debug(f"Removed adapter instance for model '{model_id}'")


def list_registered_adapters() -> list[str]:
    """Return all registered adapter names."""
    return list(_ADAPTER_REGISTRY.keys())


def list_loaded_instances() -> dict[str, str]:
    """Return mapping of model_id → adapter status for loaded instances."""
    return {
        model_id: adapter.status.value
        for model_id, adapter in _ADAPTER_INSTANCES.items()
    }


# --- Auto-register built-in adapters ---

def _register_builtin_adapters() -> None:
    """Register all built-in adapters on module import."""
    from model_adapters.mock import MockAdapter

    register_adapter("mock", MockAdapter)

    # CogVideoX adapter (requires diffusers + torch)
    try:
        from model_adapters.cogvideo import CogVideoXAdapter
        register_adapter("cogvideo", CogVideoXAdapter)
    except ImportError:
        logger.debug("CogVideoX adapter not available (missing torch/diffusers)")

    # Future adapters:
    # from model_adapters.wan import WanAdapter
    # register_adapter("wan", WanAdapter)
    #
    # from model_adapters.ltx_video import LTXVideoAdapter
    # register_adapter("ltx_video", LTXVideoAdapter)


_register_builtin_adapters()
