from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import ORJSONResponse

from app.database import get_db
from app.dependencies import get_current_admin_user, get_request_meta
from app.models.admin_user import AdminUser
from app.providers import get_email_provider
from app.providers.base.email import EmailMessage
from app.repositories.admin_user_repository import AdminUserRepository
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
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
)
from app.services import auth_service
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
async def logout(body: RefreshRequest, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    await auth_service.logout(db, current_user.id, body.refresh_token)
    return MessageResponse(message="Signed out")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, db=Depends(get_db)):
    raw_token = await auth_service.send_password_reset(db, body.email)
    if raw_token:
        try:
            email_provider = get_email_provider()
            repo = AdminUserRepository(db)
            user = await repo.get_by_email(body.email)
            reset_url = f"http://localhost:5173/reset-password?token={raw_token}"
            await email_provider.send(EmailMessage(
                to=[body.email],
                subject="Reset your password",
                html_body=f"<p>Hello {user.name},</p><p>Click <a href='{reset_url}'>here</a> to reset your password. The link expires in 40 minutes.</p>",
                text_body=f"Reset link: {reset_url}",
            ))
        except Exception:
            pass  # Never leak errors; the user gets the same message either way
    return MessageResponse(message="If that email is registered, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, db=Depends(get_db)):
    await auth_service.reset_password(db, body.token, body.password)
    return MessageResponse(message="Password changed — please sign in with your new password")


# ── Authenticated endpoints ───────────────────────────────────

@router.get("/me", response_model=AdminUserResponse)
async def get_me(current_user: AdminUser = Depends(get_current_admin_user)):
    return current_user


@router.patch("/me", response_model=AdminUserResponse)
async def update_me(body: UpdateProfileRequest, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    if body.name:
        from sqlalchemy import update as sa_update
        from app.models.admin_user import AdminUser as M
        await db.execute(sa_update(M).where(M.id == current_user.id).values(name=body.name))
        current_user.name = body.name
    return current_user


@router.post("/change-password", response_model=MessageResponse)
async def change_password(body: ChangePasswordRequest, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    from app.core.security import verify_password, hash_password
    from app.core.exceptions import ValidationException
    if not verify_password(body.current_password, current_user.password_hash):
        raise ValidationException("Current password is incorrect")
    repo = AdminUserRepository(db)
    await repo.update_password(current_user.id, hash_password(body.new_password))
    await repo.revoke_all_sessions(current_user.id)
    await repo.log_sign_in(current_user.id, "password_changed", None, None, "ok")
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


@router.get("/me/sign-in-history", response_model=list[SignInHistoryEntry])
async def sign_in_history(current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    repo = AdminUserRepository(db)
    return await repo.get_sign_in_history(current_user.id)


@router.post("/2fa/setup", response_model=TOTPSetupResponse)
async def setup_totp(current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    secret, uri = await auth_service.setup_totp(db, current_user.id)
    return TOTPSetupResponse(secret=secret, provisioning_uri=uri)


@router.post("/2fa/enroll", response_model=MessageResponse)
async def enroll_totp(body: TOTPEnrollRequest, current_user: AdminUser = Depends(get_current_admin_user), db=Depends(get_db)):
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(current_user.id)
    await auth_service.enroll_totp(db, current_user.id, user.two_factor_secret or "", body.code)
    return MessageResponse(message="Two-factor authentication enabled")
