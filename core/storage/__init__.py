"""
Storage service — abstract file storage with local filesystem implementation.

Provides:
- File upload (images for I2V, reference videos)
- File serving (output videos, thumbnails)
- Storage metadata (disk usage, file listing)
- Cleanup utilities

Architecture: Abstract StorageBackend interface allows switching to S3/MinIO later.
"""

import logging
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO, Optional

from apps.api.config import get_settings

logger = logging.getLogger(__name__)


# --- Data models ---


class StorageFile:
    """Metadata about a stored file."""

    def __init__(
        self,
        path: str,
        filename: str,
        content_type: str,
        size_bytes: int,
        created_at: datetime | None = None,
    ):
        self.path = path
        self.filename = filename
        self.content_type = content_type
        self.size_bytes = size_bytes
        self.created_at = created_at or datetime.now(timezone.utc)

    @property
    def size_mb(self) -> float:
        return round(self.size_bytes / (1024 * 1024), 2)

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "filename": self.filename,
            "content_type": self.content_type,
            "size_bytes": self.size_bytes,
            "size_mb": self.size_mb,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class StorageStats:
    """Storage usage statistics."""

    def __init__(
        self,
        uploads_size_mb: float = 0.0,
        uploads_count: int = 0,
        outputs_size_mb: float = 0.0,
        outputs_count: int = 0,
        models_size_mb: float = 0.0,
        total_size_mb: float = 0.0,
    ):
        self.uploads_size_mb = uploads_size_mb
        self.uploads_count = uploads_count
        self.outputs_size_mb = outputs_size_mb
        self.outputs_count = outputs_count
        self.models_size_mb = models_size_mb
        self.total_size_mb = total_size_mb

    def to_dict(self) -> dict:
        return {
            "uploads": {"size_mb": self.uploads_size_mb, "count": self.uploads_count},
            "outputs": {"size_mb": self.outputs_size_mb, "count": self.outputs_count},
            "models": {"size_mb": self.models_size_mb},
            "total_size_mb": self.total_size_mb,
        }


# --- Storage Service ---


# Allowed upload file extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".avi", ".mov", ".mkv"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS


class StorageService:
    """
    Local filesystem storage service.

    Handles file uploads, retrieval, and storage management.
    Can be replaced with S3StorageService for cloud deployments.
    """

    def __init__(self):
        settings = get_settings()
        self.upload_dir = Path(settings.upload_dir)
        self.output_dir = Path(settings.output_dir)
        self.models_dir = Path(settings.models_dir)
        self.max_upload_size_mb = settings.max_upload_size_mb

        # Ensure directories exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def save_upload(
        self,
        file: BinaryIO,
        original_filename: str,
        content_type: str = "application/octet-stream",
    ) -> StorageFile:
        """
        Save an uploaded file to the uploads directory.

        Generates a unique filename to prevent collisions.
        Returns metadata about the saved file.
        """
        # Validate extension
        ext = Path(original_filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(
                f"File extension '{ext}' not allowed. "
                f"Allowed: {sorted(ALLOWED_EXTENSIONS)}"
            )

        # Generate unique filename: timestamp_uuid.ext
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        safe_name = f"{timestamp}_{unique_id}{ext}"

        # Full path
        file_path = self.upload_dir / safe_name

        # Write file
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file, f)

        # Get file size
        size_bytes = file_path.stat().st_size

        # Validate size
        max_bytes = self.max_upload_size_mb * 1024 * 1024
        if size_bytes > max_bytes:
            file_path.unlink()  # Delete oversized file
            raise ValueError(
                f"File size ({size_bytes / 1024 / 1024:.1f} MB) exceeds "
                f"maximum allowed ({self.max_upload_size_mb} MB)"
            )

        logger.info(f"Saved upload: {safe_name} ({size_bytes / 1024:.1f} KB)")

        return StorageFile(
            path=str(file_path),
            filename=safe_name,
            content_type=content_type,
            size_bytes=size_bytes,
        )

    def get_file_path(self, relative_path: str) -> Optional[Path]:
        """
        Resolve a relative file path to absolute, ensuring it's within allowed dirs.

        Security: prevents path traversal attacks.
        """
        path = Path(relative_path)

        # Check if path is within uploads or outputs
        for base_dir in [self.upload_dir, self.output_dir]:
            try:
                full_path = (base_dir / path.name) if not path.is_absolute() else path
                # Try resolving relative to base
                if relative_path.startswith(str(base_dir)):
                    full_path = Path(relative_path)
                else:
                    full_path = base_dir / Path(relative_path).name

                # Ensure resolved path is within base directory
                resolved = full_path.resolve()
                base_resolved = base_dir.resolve()
                if str(resolved).startswith(str(base_resolved)) and resolved.exists():
                    return resolved
            except (ValueError, OSError):
                continue

        # Try as-is (for paths like "outputs/xxx.mp4")
        direct_path = Path(relative_path)
        if direct_path.exists():
            resolved = direct_path.resolve()
            # Security: ensure it's within project dirs
            for base_dir in [self.upload_dir, self.output_dir]:
                if str(resolved).startswith(str(base_dir.resolve())):
                    return resolved

        return None

    def delete_file(self, relative_path: str) -> bool:
        """Delete a file. Returns True if deleted, False if not found."""
        file_path = self.get_file_path(relative_path)
        if file_path and file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted file: {relative_path}")
            return True
        return False

    def get_storage_stats(self) -> StorageStats:
        """Calculate storage usage statistics."""
        uploads_size, uploads_count = self._dir_stats(self.upload_dir)
        outputs_size, outputs_count = self._dir_stats(self.output_dir)
        models_size, _ = self._dir_stats(self.models_dir) if self.models_dir.exists() else (0, 0)

        total = uploads_size + outputs_size + models_size

        return StorageStats(
            uploads_size_mb=round(uploads_size / (1024 * 1024), 2),
            uploads_count=uploads_count,
            outputs_size_mb=round(outputs_size / (1024 * 1024), 2),
            outputs_count=outputs_count,
            models_size_mb=round(models_size / (1024 * 1024), 2),
            total_size_mb=round(total / (1024 * 1024), 2),
        )

    def list_outputs(self, limit: int = 50) -> list[dict]:
        """List recent output files."""
        files = []
        if not self.output_dir.exists():
            return files

        for f in sorted(self.output_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if f.is_file() and f.suffix in (".mp4", ".webm", ".jpg", ".png"):
                stat = f.stat()
                files.append({
                    "path": str(f),
                    "filename": f.name,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
            if len(files) >= limit:
                break
        return files

    def cleanup_old_files(self, max_age_hours: int = 24 * 7) -> int:
        """
        Remove files older than max_age_hours.

        Returns number of files deleted.
        """
        cutoff = datetime.now(timezone.utc).timestamp() - (max_age_hours * 3600)
        deleted = 0

        for directory in [self.upload_dir, self.output_dir]:
            if not directory.exists():
                continue
            for f in directory.iterdir():
                if f.is_file() and f.stat().st_mtime < cutoff:
                    f.unlink()
                    deleted += 1

        if deleted > 0:
            logger.info(f"Cleanup: deleted {deleted} files older than {max_age_hours}h")
        return deleted

    @staticmethod
    def _dir_stats(directory: Path) -> tuple[int, int]:
        """Calculate total size (bytes) and file count for a directory."""
        total_size = 0
        count = 0
        if not directory.exists():
            return 0, 0
        for f in directory.rglob("*"):
            if f.is_file():
                total_size += f.stat().st_size
                count += 1
        return total_size, count


# --- Singleton ---

_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Get or create the storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
