from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser

router = APIRouter()

# Allowed MIME types for operator documents
ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = "documents",
    _: AdminUser = Depends(get_current_admin_user),
) -> JSONResponse:
    """Upload a file and return its public URL."""

    # Validate MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, images, Word documents.",
        )

    content = await file.read()

    # Validate file size
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=422, detail="File exceeds 10 MB limit.")

    ext = Path(file.filename or "file").suffix.lower() or ".bin"
    unique_name = f"{uuid.uuid4()}{ext}"

    raw_key = f"{folder}/{unique_name}"
    in_s3 = False

    try:
        from app.providers import get_storage_provider
        await get_storage_provider().upload(content, raw_key, file.content_type or "application/octet-stream")
        in_s3 = True
    except Exception:
        dest_dir = Path(f"static/{folder}")
        dest_dir.mkdir(parents=True, exist_ok=True)
        (dest_dir / unique_name).write_bytes(content)

    from app.core.storage_utils import make_key, resolve_url
    stored_key = make_key(raw_key, in_s3)
    return JSONResponse({
        "url": resolve_url(stored_key),
        "key": stored_key,
        "original_filename": file.filename,
        "size_bytes": len(content),
    })
