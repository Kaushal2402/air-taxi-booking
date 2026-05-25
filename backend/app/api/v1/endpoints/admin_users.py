from __future__ import annotations

from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import get_current_admin_user, require_role
from app.models.admin_user import AdminUser
from app.repositories.admin_user_repository import AdminUserRepository
from app.schemas.auth import AdminUserResponse, AdminSessionResponse
from app.schemas.common import MessageResponse, PaginatedResponse
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import hash_password
from pydantic import BaseModel, EmailStr
import secrets

router = APIRouter()


class InviteAdminRequest(BaseModel):
    name: str
    email: EmailStr
    role: str


class UpdateAdminRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    status: str | None = None


@router.get("", response_model=PaginatedResponse[AdminUserResponse])
async def list_admins(
    page: int = 1,
    per_page: int = 50,
    current_user: AdminUser = Depends(require_role("super_admin", "admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    skip = (page - 1) * per_page
    users = await repo.list_all(skip=skip, limit=per_page)
    total = await repo.count()
    import math
    return PaginatedResponse(items=users, total=total, page=page, per_page=per_page, pages=math.ceil(total / per_page) if per_page else 1)


@router.post("/invite", response_model=AdminUserResponse, status_code=201)
async def invite_admin(
    body: InviteAdminRequest,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    existing = await repo.get_by_email(body.email)
    if existing:
        raise ConflictException("An account with that email already exists")

    temp_password = secrets.token_urlsafe(16)
    from app.models.admin_user import AdminUser as M
    user = M(
        name=body.name,
        email=body.email,
        password_hash=hash_password(temp_password),
        role=body.role,
        status="invited",
    )
    db.add(user)
    await db.flush()
    return user


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_admin(
    user_id: str,
    current_user: AdminUser = Depends(require_role("super_admin", "admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    return user


@router.patch("/{user_id}", response_model=AdminUserResponse)
async def update_admin(
    user_id: str,
    body: UpdateAdminRequest,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")

    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M

    values = {k: v for k, v in body.model_dump().items() if v is not None}
    if values:
        await db.execute(sa_update(M).where(M.id == user_id).values(**values))
        for k, v in values.items():
            setattr(user, k, v)
    return user


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_admin(
    user_id: str,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    if user_id == current_user.id:
        from app.core.exceptions import ValidationException
        raise ValidationException("You cannot delete your own account")

    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")

    from datetime import datetime, timezone
    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M
    await db.execute(sa_update(M).where(M.id == user_id).values(deleted_at=datetime.now(timezone.utc)))
    return MessageResponse(message="Admin user deleted")


@router.get("/{user_id}/sessions", response_model=list[AdminSessionResponse])
async def get_admin_sessions(
    user_id: str,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    sessions = await repo.get_sessions_for_user(user_id)
    return [
        AdminSessionResponse(
            id=s.id,
            device_name=s.device_name,
            device_os=s.device_os,
            ip_address=s.ip_address,
            location=s.location,
            two_fa_method=s.two_fa_method,
            last_activity_at=s.last_activity_at,
        )
        for s in sessions
    ]


@router.delete("/{user_id}/sessions", response_model=MessageResponse)
async def revoke_all_admin_sessions(
    user_id: str,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    await repo.revoke_all_sessions(user_id)
    return MessageResponse(message="All sessions revoked")
