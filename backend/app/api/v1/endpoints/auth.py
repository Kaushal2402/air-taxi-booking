from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, Request, UploadFile
from fastapi.responses import ORJSONResponse

logger = logging.getLogger(__name__)

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin_user, get_request_meta
from app.models.admin_user import AdminUser
from app.providers import get_email_provider
from app.providers.base.email import EmailMessage
from app.repositories.admin_user_repository import AdminUserRepository

settings = get_settings()
from app.schemas.auth import (
    ChangePasswordRequest,
    Disable2FARequest,
    EmailOTPRequest,
    EmailOTPResponse,
    OtpVerifyRequest,
    SmsOTPRequest,
    SmsOTPResponse,
    ForgotPasswordRequest,
    InviteAcceptRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TOTPEnrollRequest,
    TOTPSetupResponse,
    TokenResponse,
    TwoFAVerifyRequest,
    UpdateProfileRequest,
    AdminUserResponse,
    AdminSessionResponse,
    SignInHistoryEntry,
    PaginatedHistoryResponse,
    BackupCodesResponse,
    BackupCodeStatusResponse,
    BackupVerifyRequest,
)
from app.services import auth_service, audit_service
from app.schemas.common import MessageResponse

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request, db=Depends(get_db)):
    meta = get_request_meta(request)
    return await auth_service.login(db, body.email, body.password, body.remember_me, meta)


@router.post("/2fa/verify", response_model=TokenResponse)
async def verify_2fa(body: TwoFAVerifyRequest, request: Request, db=Depends(get_db)):
    meta = get_request_meta(request)
    return await auth_service.verify_2fa(db, body.partial_token, body.code, body.trust_device, meta)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db=Depends(get_db)):
    return await auth_service.refresh_tokens(db, body.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(body: RefreshRequest, request: Request, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    await auth_service.logout(db, current_user.id, body.refresh_token)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="auth.logout",
            target=f"admin:{current_user.id}",
            category="Authentication",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Signed out")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, request: Request, db=Depends(get_db)):
    raw_token = await auth_service.send_password_reset(db, body.email)
    if raw_token:
        try:
            email_provider = get_email_provider()
            repo = AdminUserRepository(db)
            user = await repo.get_by_email(body.email)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
            await email_provider.send(EmailMessage(
                to=[body.email],
                subject="Reset your password",
                html_body=f"<p>Hello {user.name},</p><p>Click <a href='{reset_url}'>here</a> to reset your password. The link expires in 40 minutes.</p>",
                text_body=f"Reset link: {reset_url}",
            ))
        except Exception as exc:
            # Never leak errors to the caller — the response is always the same.
            # Log here so developers can diagnose email delivery failures.
            logger.exception("Failed to send password-reset email to %s: %s", body.email, exc)
    try:
        await audit_service.log_event(
            db,
            actor_name=body.email,
            actor_role="Unknown",
            action="auth.password_reset_requested",
            target=f"email:{body.email}",
            category="Authentication",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="If that email is registered, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, request: Request, db=Depends(get_db)):
    await auth_service.reset_password(db, body.token, body.password)
    try:
        await audit_service.log_event(
            db,
            actor_name="System",
            actor_role="System",
            action="auth.password_reset",
            target="admin:via_reset_token",
            category="Authentication",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Password changed — please sign in with your new password")


@router.post("/invite/accept", response_model=MessageResponse)
async def accept_invite(body: InviteAcceptRequest, request: Request, db=Depends(get_db)):
    """Invitee sets their password and activates their account."""
    from app.core.security import hash_password
    from app.core.exceptions import ValidationException
    repo = AdminUserRepository(db)

    record = await repo.consume_invite_token(body.token)
    if not record:
        raise ValidationException("Invitation link is invalid or has expired")

    pw_hash = hash_password(body.password)
    await repo.activate_user(record.admin_user_id, pw_hash)
    try:
        await audit_service.log_event(
            db,
            actor_name="System",
            actor_role="System",
            action="auth.invite_accepted",
            target=f"admin:{record.admin_user_id}",
            category="Authentication",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Account activated — you can now sign in")


# ── Authenticated endpoints ───────────────────────────────────

@router.get("/me", response_model=AdminUserResponse)
async def get_me(current_user: AdminUser = Depends(get_current_admin_user)):
    return current_user


@router.patch("/me", response_model=AdminUserResponse)
async def update_me(
    body: UpdateProfileRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M

    values = body.model_dump(exclude_unset=True)
    if values:
        await db.execute(sa_update(M).where(M.id == current_user.id).values(**values))
        for k, v in values.items():
            setattr(current_user, k, v)
        try:
            await audit_service.log_event(
                db,
                actor_name=current_user.email,
                actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
                action="auth.profile_updated",
                target=f"admin:{current_user.id}",
                category="Authentication",
                severity="med",
                source_ip=request.client.host if request.client else None,
                after_data=values,
            )
        except Exception:
            pass
    return current_user


@router.post("/me/avatar", response_model=AdminUserResponse)
async def upload_avatar(
    avatar: UploadFile,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """Upload / replace the profile avatar. Accepts JPEG, PNG, WebP up to 2 MB."""
    import os, time
    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M
    from app.core.exceptions import ValidationException as VE
    from app.repositories.admin_user_repository import AdminUserRepository

    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if avatar.content_type not in allowed_types:
        raise VE("Only JPEG, PNG, and WebP images are accepted")

    content = await avatar.read()
    if len(content) > 2 * 1024 * 1024:
        raise VE("Avatar must be smaller than 2 MB")

    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map[avatar.content_type]

    # Remove any previous avatar files for this user (different extension)
    avatars_dir = os.path.join("static", "avatars")
    for old_ext in ("jpg", "png", "webp"):
        old_path = os.path.join(avatars_dir, f"{current_user.id}.{old_ext}")
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"{current_user.id}.{ext}"
    save_path = os.path.join(avatars_dir, filename)
    with open(save_path, "wb") as f:
        f.write(content)

    # Cache-bust so the browser fetches the new image after re-upload
    avatar_url = f"{settings.BACKEND_URL}/static/avatars/{filename}?v={int(time.time())}"
    await db.execute(sa_update(M).where(M.id == current_user.id).values(avatar_url=avatar_url))
    await db.flush()
    repo = AdminUserRepository(db)
    return await repo.get_by_id(current_user.id)


@router.delete("/me/avatar", response_model=AdminUserResponse)
async def remove_avatar(
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """Delete the profile avatar and clear the stored URL."""
    import os, re
    from sqlalchemy import update as sa_update
    from app.models.admin_user import AdminUser as M
    from app.repositories.admin_user_repository import AdminUserRepository

    if current_user.avatar_url:
        match = re.search(r"/static/avatars/([^?]+)", current_user.avatar_url)
        if match:
            file_path = os.path.join("static", "avatars", match.group(1))
            if os.path.exists(file_path):
                os.remove(file_path)

    await db.execute(sa_update(M).where(M.id == current_user.id).values(avatar_url=None))
    await db.flush()
    repo = AdminUserRepository(db)
    return await repo.get_by_id(current_user.id)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(body: ChangePasswordRequest, request: Request, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    from app.core.security import verify_password, hash_password
    from app.core.exceptions import ValidationException
    if not verify_password(body.current_password, current_user.password_hash):
        raise ValidationException("Current password is incorrect")
    repo = AdminUserRepository(db)
    await repo.update_password(current_user.id, hash_password(body.new_password))
    await repo.revoke_all_sessions(current_user.id)
    await repo.log_sign_in(current_user.id, "password_changed", None, None, "ok")
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="auth.password_changed",
            target=f"admin:{current_user.id}",
            category="Authentication",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Password changed — all sessions signed out")


@router.get("/me/sessions", response_model=list[AdminSessionResponse])
async def get_my_sessions(
    x_refresh_token: str | None = Header(default=None, alias="X-Refresh-Token"),
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    import hashlib
    repo = AdminUserRepository(db)
    sessions = await repo.get_sessions_for_user(current_user.id)
    current_hash = hashlib.sha256(x_refresh_token.encode()).hexdigest() if x_refresh_token else None
    result = []
    for s in sessions:
        entry = AdminSessionResponse(
            id=s.id,
            device_name=s.device_name,
            device_os=s.device_os,
            ip_address=s.ip_address,
            location=s.location,
            two_fa_method=s.two_fa_method,
            last_activity_at=s.last_activity_at,
            is_current=bool(current_hash and s.refresh_token_hash == current_hash),
        )
        result.append(entry)
    return result


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(session_id: str, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    repo = AdminUserRepository(db)
    await repo.revoke_session(session_id)
    return MessageResponse(message="Session revoked")


@router.get("/me/sign-in-history", response_model=PaginatedHistoryResponse)
async def sign_in_history(
    page: int = 1,
    limit: int = 15,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    page = max(1, page)
    limit = max(1, min(limit, 100))
    repo = AdminUserRepository(db)
    items, total = await repo.get_sign_in_history(current_user.id, page=page, limit=limit)
    import math
    pages = math.ceil(total / limit) if total > 0 else 1
    return PaginatedHistoryResponse(items=items, total=total, page=page, limit=limit, pages=pages)


@router.post("/2fa/setup", response_model=TOTPSetupResponse)
async def setup_totp(current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    secret, uri = await auth_service.setup_totp(db, current_user.id)
    return TOTPSetupResponse(secret=secret, provisioning_uri=uri)


@router.post("/2fa/enroll", response_model=MessageResponse)
async def enroll_totp(body: TOTPEnrollRequest, request: Request, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(current_user.id)
    await auth_service.enroll_totp(db, current_user.id, user.two_factor_secret or "", body.code)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="auth.2fa_enabled",
            target=f"admin:{current_user.id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Two-factor authentication enabled")


@router.post("/2fa/backup-codes", response_model=BackupCodesResponse)
async def generate_backup_codes(request: Request, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    """Generate 10 new backup codes. Replaces any existing codes. Codes shown only once."""
    codes = await auth_service.generate_backup_codes(db, current_user.id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="auth.backup_codes_generated",
            target=f"admin:{current_user.id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return BackupCodesResponse(codes=codes, total=len(codes), remaining=len(codes))


@router.get("/2fa/backup-codes/status", response_model=BackupCodeStatusResponse)
async def backup_code_status(current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    """Return how many backup codes have been generated and how many are still unused."""
    status = await auth_service.get_backup_code_status(db, current_user.id)
    return BackupCodeStatusResponse(
        total=status["total"],
        used=status["used"],
        remaining=status["remaining"],
        generated=status["total"] > 0,
    )


@router.post("/2fa/disable", response_model=MessageResponse)
async def disable_2fa(
    body: Disable2FARequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """Disable TOTP 2FA for the currently logged-in user after verifying their current code."""
    await auth_service.disable_totp(db, current_user.id, body.code)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="auth.2fa_disabled",
            target=f"admin:{current_user.id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Two-factor authentication has been disabled")


@router.post("/2fa/backup-verify", response_model=TokenResponse)
async def backup_verify(body: BackupVerifyRequest, request: Request, db=Depends(get_db)):
    """Complete login using a backup code instead of TOTP."""
    request_meta = get_request_meta(request)
    return await auth_service.verify_backup_code(db, body.partial_token, body.code, request_meta)


@router.post("/2fa/email-otp", response_model=EmailOTPResponse)
async def send_email_otp(body: EmailOTPRequest, db=Depends(get_db)):
    """Send a one-time sign-in code to the user's registered email address.
    Rate-limited: a new code cannot be requested within 60 seconds of the last send."""
    result = await auth_service.send_email_otp(db, body.partial_token)
    return EmailOTPResponse(**result)


@router.post("/2fa/sms-otp", response_model=SmsOTPResponse)
async def send_sms_otp(body: SmsOTPRequest, db=Depends(get_db)):
    """Send a one-time sign-in code via SMS to the user's registered phone number.
    Requires the account to have a phone number set. Rate-limited to one send per 60 seconds."""
    result = await auth_service.send_sms_otp(db, body.partial_token)
    return SmsOTPResponse(**result)


@router.post("/2fa/sms-otp/verify", response_model=TokenResponse)
async def verify_sms_otp(body: OtpVerifyRequest, request: Request, db=Depends(get_db)):
    """Complete login by verifying an SMS OTP. Supply the partial_hash (SHA-256 of the
    partial_token issued at step-1) plus the 6-digit code sent to the user's phone."""
    meta = get_request_meta(request)
    return await auth_service.verify_otp(
        db,
        partial_hash=body.partial_hash,
        code=body.code,
        remember_me=body.remember_me,
        channel="sms",
        request_meta=meta,
    )
