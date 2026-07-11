"""
GPU Resource Management & Monitoring.

Features:
- Real-time GPU metrics (VRAM, utilization, temperature) via pynvml
- Smart model load/unload decisions based on available VRAM
- LRU cache for loaded models
- Job rejection when insufficient VRAM

Falls back gracefully when no GPU or pynvml unavailable.
"""

import logging
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# Try importing pynvml for NVIDIA GPU monitoring
_nvml_available = False
try:
    import pynvml
    pynvml.nvmlInit()
    _nvml_available = True
    logger.info("pynvml initialized — GPU monitoring available")
except (ImportError, Exception) as e:
    logger.info(f"pynvml not available — GPU monitoring disabled ({e})")


# --- Data Models ---


@dataclass
class GpuInfo:
    """Real-time GPU information."""

    index: int = 0
    name: str = "Unknown"
    utilization_percent: float = 0.0
    vram_used_gb: float = 0.0
    vram_total_gb: float = 0.0
    vram_free_gb: float = 0.0
    temperature_celsius: int = 0
    power_draw_watts: float = 0.0
    power_limit_watts: float = 0.0

    @property
    def vram_used_percent(self) -> float:
        if self.vram_total_gb == 0:
            return 0
        return (self.vram_used_gb / self.vram_total_gb) * 100

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "name": self.name,
            "utilization_percent": self.utilization_percent,
            "vram_used_gb": round(self.vram_used_gb, 2),
            "vram_total_gb": round(self.vram_total_gb, 2),
            "vram_free_gb": round(self.vram_free_gb, 2),
            "vram_used_percent": round(self.vram_used_percent, 1),
            "temperature_celsius": self.temperature_celsius,
            "power_draw_watts": round(self.power_draw_watts, 1),
            "power_limit_watts": round(self.power_limit_watts, 1),
        }


@dataclass
class WorkerStatus:
    """Worker process status including GPU info."""

    worker_id: str = "worker-local"
    hostname: str = "localhost"
    status: str = "online"  # online, busy, draining, offline
    gpu: GpuInfo = field(default_factory=GpuInfo)
    current_job_id: Optional[str] = None
    loaded_model_id: Optional[str] = None
    last_heartbeat: str = ""
    uptime_seconds: float = 0.0

    def to_dict(self) -> dict:
        return {
            "id": self.worker_id,
            "hostname": self.hostname,
            "status": self.status,
            "gpu": self.gpu.to_dict(),
            "current_job_id": self.current_job_id,
            "loaded_model_id": self.loaded_model_id,
            "last_heartbeat": self.last_heartbeat,
            "uptime_seconds": self.uptime_seconds,
        }


# --- GPU Monitor ---


class GpuMonitor:
    """
    Monitors GPU state using NVIDIA Management Library (pynvml).

    Provides real-time VRAM, utilization, and temperature data.
    Falls back to zeros when no GPU or pynvml unavailable.
    """

    def __init__(self, device_index: int = 0):
        self.device_index = device_index
        self._handle = None

        if _nvml_available:
            try:
                device_count = pynvml.nvmlDeviceGetCount()
                if device_index < device_count:
                    self._handle = pynvml.nvmlDeviceGetHandleByIndex(device_index)
                    name = pynvml.nvmlDeviceGetName(self._handle)
                    if isinstance(name, bytes):
                        name = name.decode()
                    logger.info(f"GPU Monitor: tracking GPU {device_index} ({name})")
                else:
                    logger.warning(f"GPU index {device_index} not found (count={device_count})")
            except Exception as e:
                logger.warning(f"Failed to get GPU handle: {e}")

    def get_gpu_info(self) -> GpuInfo:
        """Get current GPU metrics."""
        info = GpuInfo(index=self.device_index)

        if not self._handle:
            return info

        try:
            # GPU name
            name = pynvml.nvmlDeviceGetName(self._handle)
            info.name = name.decode() if isinstance(name, bytes) else name

            # Memory
            mem = pynvml.nvmlDeviceGetMemoryInfo(self._handle)
            info.vram_total_gb = mem.total / (1024**3)
            info.vram_used_gb = mem.used / (1024**3)
            info.vram_free_gb = mem.free / (1024**3)

            # Utilization
            util = pynvml.nvmlDeviceGetUtilizationRates(self._handle)
            info.utilization_percent = util.gpu

            # Temperature
            info.temperature_celsius = pynvml.nvmlDeviceGetTemperature(
                self._handle, pynvml.NVML_TEMPERATURE_GPU
            )

            # Power
            try:
                info.power_draw_watts = pynvml.nvmlDeviceGetPowerUsage(self._handle) / 1000
                info.power_limit_watts = pynvml.nvmlDeviceGetPowerManagementLimit(self._handle) / 1000
            except pynvml.NVMLError:
                pass

        except pynvml.NVMLError as e:
            logger.debug(f"GPU metric read failed: {e}")

        return info

    def get_free_vram_gb(self) -> float:
        """Get available VRAM in GB."""
        info = self.get_gpu_info()
        return info.vram_free_gb

    def has_enough_vram(self, required_gb: float) -> bool:
        """Check if enough VRAM is available for a model."""
        free = self.get_free_vram_gb()
        return free >= required_gb

    @property
    def is_available(self) -> bool:
        """Whether GPU monitoring is active."""
        return self._handle is not None


# --- Model LRU Cache ---


class ModelLRUCache:
    """
    LRU (Least Recently Used) cache for loaded model adapters.

    When a new model needs to be loaded and VRAM is insufficient,
    evicts the least recently used model to free memory.
    """

    def __init__(self, max_loaded_models: int = 3):
        self.max_loaded = max_loaded_models
        self._order: OrderedDict[str, float] = OrderedDict()  # model_id → last_used_time

    def touch(self, model_id: str) -> None:
        """Mark a model as recently used."""
        if model_id in self._order:
            self._order.move_to_end(model_id)
        self._order[model_id] = time.time()

    def remove(self, model_id: str) -> None:
        """Remove a model from cache tracking."""
        self._order.pop(model_id, None)

    def get_eviction_candidate(self) -> Optional[str]:
        """Get the least recently used model (first in order)."""
        if not self._order:
            return None
        return next(iter(self._order))

    def should_evict(self) -> bool:
        """Whether we should evict a model to make room."""
        return len(self._order) >= self.max_loaded

    @property
    def loaded_count(self) -> int:
        return len(self._order)

    @property
    def loaded_models(self) -> list[str]:
        return list(self._order.keys())


# --- Resource Manager ---


class GpuResourceManager:
    """
    Central resource manager for GPU allocation decisions.

    Responsibilities:
    - Track GPU state
    - Decide whether to accept/reject new jobs based on VRAM
    - Manage model loading/unloading via LRU
    - Provide worker status for the monitoring API
    """

    def __init__(self, device_index: int = 0, max_loaded_models: int = 3):
        self.monitor = GpuMonitor(device_index)
        self.lru_cache = ModelLRUCache(max_loaded_models)
        self._current_job_id: Optional[str] = None
        self._loaded_model_id: Optional[str] = None
        self._start_time = time.time()

    def can_load_model(self, required_vram_gb: float) -> bool:
        """Check if we can load a model with the given VRAM requirement."""
        if not self.monitor.is_available:
            return True  # No GPU monitoring → always allow (will fail at inference)
        return self.monitor.has_enough_vram(required_vram_gb)

    def should_reject_job(self, required_vram_gb: float) -> tuple[bool, str]:
        """
        Decide if a job should be rejected based on resource availability.

        Returns (should_reject, reason).
        """
        if not self.monitor.is_available:
            return False, ""

        info = self.monitor.get_gpu_info()

        # Reject if GPU temperature is too high
        if info.temperature_celsius > 90:
            return True, f"GPU temperature too high ({info.temperature_celsius}°C > 90°C)"

        # Don't reject based on VRAM alone — let the model loading/eviction handle it
        return False, ""

    def on_model_loaded(self, model_id: str) -> None:
        """Called when a model is successfully loaded."""
        self.lru_cache.touch(model_id)
        self._loaded_model_id = model_id

    def on_model_unloaded(self, model_id: str) -> None:
        """Called when a model is unloaded."""
        self.lru_cache.remove(model_id)
        if self._loaded_model_id == model_id:
            self._loaded_model_id = None

    def on_job_started(self, job_id: str, model_id: str) -> None:
        """Called when a job starts processing."""
        self._current_job_id = job_id
        self._loaded_model_id = model_id
        self.lru_cache.touch(model_id)

    def on_job_completed(self, job_id: str) -> None:
        """Called when a job finishes."""
        self._current_job_id = None

    def get_worker_status(self) -> WorkerStatus:
        """Get full worker status for the monitoring API."""
        import socket
        from datetime import datetime, timezone

        gpu_info = self.monitor.get_gpu_info()
        uptime = time.time() - self._start_time

        status = "online"
        if self._current_job_id:
            status = "busy"

        return WorkerStatus(
            worker_id="worker-local",
            hostname=socket.gethostname(),
            status=status,
            gpu=gpu_info,
            current_job_id=self._current_job_id,
            loaded_model_id=self._loaded_model_id,
            last_heartbeat=datetime.now(timezone.utc).isoformat(),
            uptime_seconds=uptime,
        )

    def get_eviction_candidate(self) -> Optional[str]:
        """Get model to unload if we need to free VRAM."""
        candidate = self.lru_cache.get_eviction_candidate()
        # Don't evict the model currently in use
        if candidate == self._loaded_model_id and self._current_job_id:
            models = self.lru_cache.loaded_models
            for m in models:
                if m != self._loaded_model_id:
                    return m
            return None  # Can't evict any model
        return candidate


# --- Singleton ---

_resource_manager: Optional[GpuResourceManager] = None


def get_resource_manager() -> GpuResourceManager:
    """Get or create the global GPU resource manager."""
    global _resource_manager
    if _resource_manager is None:
        _resource_manager = GpuResourceManager()
    return _resource_manager
