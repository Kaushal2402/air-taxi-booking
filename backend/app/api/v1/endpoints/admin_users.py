from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_token

_bearer = HTTPBearer(auto_error=False)

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin_user, require_role, require_permission
from app.models.admin_user import AdminUser
from app.providers import get_email_provider
from app.providers.base.email import EmailMessage
from app.repositories.admin_user_repository import AdminUserRepository
from app.schemas.auth import AdminUserResponse, AdminSessionResponse
from app.schemas.common import MessageResponse, PaginatedResponse
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.security import hash_password
from app.services import audit_service
from pydantic import BaseModel, EmailStr
import secrets

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()


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
    page_size: int = 50,
    search: str | None = None,
    role: str | None = None,
    status: str | None = None,
    current_user: AdminUser = Depends(require_role("super_admin", "admin")),
    db=Depends(get_db),
):
    import math
    repo = AdminUserRepository(db)
    skip = (page - 1) * page_size
    # Exclude the requesting user — they manage others, not themselves
    users = await repo.list_all(
        skip=skip, limit=page_size, exclude_id=current_user.id,
        search=search, role=role, status=status,
    )
    total = await repo.count(exclude_id=current_user.id, search=search, role=role, status=status)
    return PaginatedResponse(items=users, total=total, page=page, per_page=page_size, pages=math.ceil(total / page_size) if page_size else 1)


@router.post("/invite", response_model=AdminUserResponse, status_code=201)
async def invite_admin(
    body: InviteAdminRequest,
    request: Request,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    existing = await repo.get_by_email(body.email)
    if existing:
        raise ConflictException("An account with that email already exists")

    # Enforce single super_admin constraint
    if body.role == "super_admin":
        existing_super_admins = await repo.get_super_admins()
        if existing_super_admins:
            raise ValidationException("Only one super admin account is allowed. Change the existing super admin's role first.")

    # Create the user with a random placeholder password (overwritten on acceptance)
    from app.models.admin_user import AdminUser as M
    user = M(
        name=body.name,
        email=body.email,
        password_hash=hash_password(secrets.token_urlsafe(24)),
        role=body.role,
        status="invited",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)   # load server-generated fields (created_at, updated_at, etc.)

    # Generate invite token and send email
    raw_token = await repo.create_invite_token(user.id)
    invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={raw_token}"
    role_label = body.role.replace("_", " ").title()
    try:
        email_provider = get_email_provider()
        await email_provider.send(EmailMessage(
            to=[body.email],
            subject=f"You've been invited to {settings.APP_NAME}",
            html_body=(
                f"<p>Hi {body.name},</p>"
                f"<p>You've been invited to join <strong>{settings.APP_NAME}</strong> as <strong>{role_label}</strong>.</p>"
                f"<p>Click the link below to set up your account. This link expires in <strong>72 hours</strong>.</p>"
                f"<p><a href='{invite_url}'>Accept invitation</a></p>"
                f"<p style='color:#888;font-size:12px'>{invite_url}</p>"
            ),
            text_body=(
                f"Hi {body.name},\n\n"
                f"You've been invited to join {settings.APP_NAME} as {role_label}.\n\n"
                f"Set up your account here (expires in 72 hours):\n{invite_url}\n"
            ),
        ))
    except Exception as exc:
        logger.exception("Failed to send invite email to %s: %s", body.email, exc)

    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="admin_user.invited",
            target=f"admin:{user.id} ({body.email}, role={body.role})",
            category="Admin",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"email": body.email, "role": body.role, "name": body.name},
        )
    except Exception:
        pass
    return user


@router.post("/{user_id}/resend-invite", response_model=MessageResponse)
async def resend_invite(
    user_id: str,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    if user.status != "invited":
        raise ValidationException("This user has already accepted their invitation")

    raw_token = await repo.create_invite_token(user.id)
    invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={raw_token}"
    role_label = user.role.replace("_", " ").title()
    try:
        email_provider = get_email_provider()
        await email_provider.send(EmailMessage(
            to=[user.email],
            subject=f"Your invitation to {settings.APP_NAME} (resent)",
            html_body=(
                f"<p>Hi {user.name},</p>"
                f"<p>Here is a fresh invitation link for <strong>{settings.APP_NAME}</strong> ({role_label}).</p>"
                f"<p><a href='{invite_url}'>Accept invitation</a></p>"
                f"<p style='color:#888;font-size:12px'>Expires in 72 hours. Previous links are now invalid.</p>"
            ),
            text_body=(
                f"Hi {user.name},\n\n"
                f"Fresh invite link for {settings.APP_NAME} ({role_label}):\n{invite_url}\n\n"
                f"Expires in 72 hours. Previous links are now invalid.\n"
            ),
        ))
    except Exception as exc:
        logger.exception("Failed to resend invite email to %s: %s", user.email, exc)

    return MessageResponse(message="Invitation resent")


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
    request: Request,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")

    # Super admin account is immutable — role cannot be changed
    if user.role == "super_admin":
        raise ValidationException("The super admin account's role cannot be changed.")

    # Prevent promoting another account to super_admin if one already exists
    if body.role == "super_admin":
        existing_super_admins = await repo.get_super_admins()
        if any(sa.id != user_id for sa in existing_super_admins):
            raise ValidationException("Only one super admin account is allowed.")

    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M

    before_data = {"name": user.name, "role": user.role, "status": user.status}
    values = {k: v for k, v in body.model_dump().items() if v is not None}
    if values:
        await db.execute(sa_update(M).where(M.id == user_id).values(**values))
        for k, v in values.items():
            setattr(user, k, v)
        try:
            await audit_service.log_event(
                db,
                actor_name=current_user.email,
                actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
                action="admin_user.updated",
                target=f"admin:{user_id}",
                category="Admin",
                severity="high",
                source_ip=request.client.host if request.client else None,
                before_data=before_data,
                after_data=values,
            )
        except Exception:
            pass
    return user


@router.post("/{user_id}/suspend", response_model=AdminUserResponse)
async def suspend_admin(
    user_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    if user_id == current_user.id:
        raise ValidationException("You cannot suspend your own account")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    if user.status == "suspended":
        raise ValidationException("Account is already suspended")

    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M
    await db.execute(sa_update(M).where(M.id == user_id).values(status="suspended"))
    await repo.revoke_all_sessions(user_id)
    await db.refresh(user)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="admin_user.suspended",
            target=f"admin:{user_id}",
            category="Admin",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return user


@router.post("/{user_id}/reactivate", response_model=AdminUserResponse)
async def reactivate_admin(
    user_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    if user_id == current_user.id:
        raise ValidationException("You cannot reactivate your own account")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    if user.status != "suspended":
        raise ValidationException("Account is not suspended")

    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M
    await db.execute(sa_update(M).where(M.id == user_id).values(status="active"))
    await db.refresh(user)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="admin_user.reactivated",
            target=f"admin:{user_id}",
            category="Admin",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return user


@router.post("/{user_id}/force-logout", response_model=MessageResponse)
async def force_logout_admin(
    user_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    if user_id == current_user.id:
        raise ValidationException("Use the sign-out button to end your own session")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    await repo.revoke_all_sessions(user_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="admin_user.force_logout",
            target=f"admin:{user_id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="All sessions revoked — user will be signed out on next request")


@router.post("/{user_id}/reset-2fa", response_model=MessageResponse)
async def reset_2fa(
    user_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    if user_id == current_user.id:
        raise ValidationException("Manage your own 2FA from the Security settings page")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    if not user.two_factor_enabled:
        raise ValidationException("This account does not have 2FA enabled")

    # Clear 2FA secret + disable flag + delete backup codes
    await repo.update_2fa(user_id, secret=None, enabled=False)
    from sqlalchemy import delete as sa_delete
    from app.models.admin_backup_code import AdminBackupCode
    await db.execute(sa_delete(AdminBackupCode).where(AdminBackupCode.admin_user_id == user_id))
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="admin_user.2fa_reset",
            target=f"admin:{user_id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="2FA has been reset — the user must re-enroll on next login")


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_admin(
    user_id: str,
    request: Request,
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
    deleted_name = user.name
    deleted_email = user.email
    await db.execute(sa_update(M).where(M.id == user_id).values(deleted_at=datetime.now(timezone.utc)))
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="admin_user.deleted",
            target=f"admin:{user_id} ({deleted_email})",
            category="Admin",
            severity="high",
            source_ip=request.client.host if request.client else None,
            before_data={"name": deleted_name, "email": deleted_email},
        )
    except Exception:
        pass
    return MessageResponse(message="Admin user deleted")


@router.get("/{user_id}/sessions", response_model=list[AdminSessionResponse])
async def get_admin_sessions(
    user_id: str,
    current_user: AdminUser = Depends(require_role("super_admin")),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db=Depends(get_db),
):
    # Determine the caller's active session ID so we can mark is_current correctly.
    caller_sid: str | None = None
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload:
            caller_sid = payload.get("sid")

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
            is_current=(s.id == caller_sid),
        )
        for s in sessions
    ]


@router.delete("/{user_id}/sessions", response_model=MessageResponse)
async def revoke_all_admin_sessions(
    user_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_role("super_admin")),
    db=Depends(get_db),
):
    repo = AdminUserRepository(db)
    await repo.revoke_all_sessions(user_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="admin_user.sessions_revoked",
            target=f"admin:{user_id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="All sessions revoked")


@router.get("/{user_id}/activity")
async def get_admin_activity(
    user_id: str,
    limit: int = 10,
    current_user: AdminUser = Depends(require_role("super_admin", "admin")),
    db=Depends(get_db),
):
    """Return the most recent audit-log entries where this admin was the actor."""
    from app.services import audit_service
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    result = await audit_service.list_events(
        db,
        actor_name=user.email,
        time_window="90d",
        per_page=limit,
        page=1,
    )
    return result.items


@router.post("/{user_id}/unlock", response_model=AdminUserResponse)
async def unlock_admin(
    user_id: str,
    current_user: AdminUser = Depends(require_role("super_admin", "admin")),
    db=Depends(get_db),
):
    """Clear the login lockout for a user — resets failed_attempts and locked_until."""
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")

    await repo.reset_failed_attempts(user_id)
    await db.refresh(user)
    return user
