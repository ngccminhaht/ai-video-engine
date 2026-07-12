"""Storage API endpoints — file upload, download, and storage stats."""

import logging
import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from apps.api.dependencies.auth import get_current_user, require_admin
from core.auth.models import User
from core.storage import (
    ALLOWED_EXTENSIONS,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_VIDEO_EXTENSIONS,
    get_storage_service,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Response schemas ---


class UploadResponse(BaseModel):
    """Response after successful file upload."""

    path: str
    filename: str
    content_type: str
    size_bytes: int
    size_mb: float


class StorageStatsResponse(BaseModel):
    """Storage usage statistics."""

    uploads: dict
    outputs: dict
    models: dict
    total_size_mb: float


class FileListResponse(BaseModel):
    """List of output files."""

    files: list[dict]
    total: int


# --- Endpoints ---


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """
    Upload a file (image or video) for use as input in generation jobs.

    Accepts: images (jpg, png, webp, bmp, gif) and videos (mp4, webm, avi, mov, mkv).
    Max file size is configured via MAX_UPLOAD_SIZE_MB (default: 100MB).

    Returns the stored file path to use in job inputs.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    # Check extension before reading
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    # Validate MIME content type matches extension
    allowed_mime_prefixes = ("image/", "video/")
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    if not content_type.startswith(allowed_mime_prefixes) and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=400,
            detail=f"Content type '{content_type}' not allowed. Must be image/* or video/*.",
        )

    # Cross-check: image extension should have image MIME, video ext → video MIME
    if ext in ALLOWED_IMAGE_EXTENSIONS and content_type.startswith("video/"):
        raise HTTPException(
            status_code=400,
            detail=f"Extension '{ext}' is an image type but content is '{content_type}'.",
        )
    if ext in ALLOWED_VIDEO_EXTENSIONS and content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Extension '{ext}' is a video type but content is '{content_type}'.",
        )

    storage = get_storage_service()

    try:
        result = storage.save_upload(
            file=file.file,
            original_filename=file.filename,
            content_type=content_type,
        )

        return UploadResponse(
            path=result.path,
            filename=result.filename,
            content_type=result.content_type,
            size_bytes=result.size_bytes,
            size_mb=result.size_mb,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")


@router.get("/files/{file_path:path}")
async def serve_file(file_path: str, user: User = Depends(get_current_user)):
    """
    Serve a file from storage (uploads or outputs).

    Used to:
    - Download generated videos
    - View thumbnails
    - Access uploaded input files

    Path can be relative (e.g. 'outputs/abc123.mp4') or just filename.
    """
    storage = get_storage_service()
    resolved = storage.get_file_path(file_path)

    if not resolved or not resolved.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    # Determine media type
    media_type = mimetypes.guess_type(str(resolved))[0] or "application/octet-stream"

    return FileResponse(
        path=str(resolved),
        media_type=media_type,
        filename=resolved.name,
    )


@router.get("/storage/stats", response_model=StorageStatsResponse)
async def get_storage_stats(admin: User = Depends(require_admin)):
    """Get storage usage statistics (uploads, outputs, models)."""
    storage = get_storage_service()
    stats = storage.get_storage_stats()
    return stats.to_dict()


@router.get("/storage/outputs", response_model=FileListResponse)
async def list_output_files(limit: int = 50, admin: User = Depends(require_admin)):
    """List recent output files (generated videos and thumbnails)."""
    storage = get_storage_service()
    files = storage.list_outputs(limit=limit)
    return FileListResponse(files=files, total=len(files))


@router.delete("/files/{file_path:path}")
async def delete_file(file_path: str, admin: User = Depends(require_admin)):
    """Delete a file from storage."""
    storage = get_storage_service()
    deleted = storage.delete_file(file_path)

    if not deleted:
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    return {"message": f"File deleted: {file_path}"}


@router.post("/storage/cleanup")
async def cleanup_storage(max_age_hours: int = 168, admin: User = Depends(require_admin)):
    """
    Remove files older than specified hours (default: 7 days).

    Useful for freeing disk space from old outputs and uploads.
    """
    storage = get_storage_service()
    deleted_count = storage.cleanup_old_files(max_age_hours=max_age_hours)
    return {"deleted_count": deleted_count, "max_age_hours": max_age_hours}
