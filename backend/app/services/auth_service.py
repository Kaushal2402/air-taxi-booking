from __future__ import annotations

import pyotp
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import ForbiddenException, NotFoundException, UnauthorizedException, ValidationException
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.repositories.admin_user_repository import AdminUserRepository
from app.schemas.auth import AdminUserBrief, LoginResponse, TokenResponse

settings = get_settings()

PARTIAL_TOKEN_TYPE = "partial_auth"


def _user_brief(user) -> AdminUserBrief:
    return AdminUserBrief(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=user.status,
        two_factor_enabled=user.two_factor_enabled,
    )


async def login(db: AsyncSession, email: str, password: str, remember_me: bool, request_meta: dict) -> LoginResponse:
    repo = AdminUserRepository(db)
    user = await repo.get_by_email(email)

    if not user or not verify_password(password, user.password_hash):
        if user:
            await repo.log_sign_in(user.id, "failed_password", request_meta.get("ip"), request_meta.get("location"), "fail", request_meta.get("user_agent"))
        raise UnauthorizedException("Invalid email or password")

    if user.status == "suspended":
        raise ForbiddenException("Account suspended — contact your administrator")

    if user.status == "invited":
        raise ForbiddenException("Account not yet activated — check your invitation email")

    if user.two_factor_enabled:
        partial_token = create_access_token(
            subject=user.id,
            extra_claims={"type": PARTIAL_TOKEN_TYPE, "role": user.role},
        )
        return LoginResponse(requires_2fa=True, partial_token=partial_token)

    refresh_token = create_refresh_token(user.id)
    session = await repo.create_session(user.id, refresh_token, ip=request_meta.get("ip"), location=request_meta.get("location"))
    access_token = create_access_token(user.id, extra_claims={"role": user.role, "sid": session.id})
    await repo.update_last_sign_in(user.id)
    await repo.log_sign_in(user.id, "sign_in", request_meta.get("ip"), request_meta.get("location"), "ok", request_meta.get("user_agent"))

    return LoginResponse(
        requires_2fa=False,
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_brief(user),
    )


async def verify_2fa(db: AsyncSession, partial_token: str, code: str, trust_device: bool, request_meta: dict) -> TokenResponse:
    payload = decode_token(partial_token)
    if payload.get("type") != PARTIAL_TOKEN_TYPE:
        raise UnauthorizedException("Invalid or expired step-1 token")

    user_id = payload.get("sub")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user or not user.two_factor_enabled or not user.two_factor_secret:
        raise UnauthorizedException("2FA not configured")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(code, valid_window=1):
        await repo.log_sign_in(user.id, "2fa_failed", request_meta.get("ip"), request_meta.get("location"), "fail")
        raise UnauthorizedException("Invalid verification code")

    refresh_token = create_refresh_token(user.id)
    session = await repo.create_session(user.id, refresh_token, ip=request_meta.get("ip"), location=request_meta.get("location"), two_fa_method="TOTP")
    access_token = create_access_token(user.id, extra_claims={"role": user.role, "sid": session.id})
    await repo.update_last_sign_in(user.id)
    await repo.log_sign_in(user.id, "2fa_verified", request_meta.get("ip"), request_meta.get("location"), "ok")
    await repo.log_sign_in(user.id, "sign_in", request_meta.get("ip"), request_meta.get("location"), "ok", request_meta.get("user_agent"))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=_user_brief(user))


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    repo = AdminUserRepository(db)
    session = await repo.get_session_by_token(refresh_token)
    if not session:
        raise UnauthorizedException("Invalid or revoked refresh token")

    from datetime import datetime, timezone
    if session.expires_at < datetime.now(timezone.utc):
        raise UnauthorizedException("Refresh token expired")

    user = await repo.get_by_id(session.admin_user_id)
    if not user:
        raise UnauthorizedException("User not found")

    await repo.revoke_session(session.id)
    new_refresh = create_refresh_token(user.id)
    new_session = await repo.create_session(user.id, new_refresh, ip=session.ip_address, location=session.location, two_fa_method=session.two_fa_method, expires_at=session.expires_at)
    new_access = create_access_token(user.id, extra_claims={"role": user.role, "sid": new_session.id})

    return TokenResponse(access_token=new_access, refresh_token=new_refresh, user=_user_brief(user))


async def logout(db: AsyncSession, user_id: str, refresh_token: str) -> None:
    repo = AdminUserRepository(db)
    session = await repo.get_session_by_token(refresh_token)
    if session:
        await repo.revoke_session(session.id)
    await repo.log_sign_in(user_id, "sign_out", None, None, "ok")


async def send_password_reset(db: AsyncSession, email: str) -> None:
    repo = AdminUserRepository(db)
    user = await repo.get_by_email(email)
    if not user:
        return  # Don't reveal whether the email exists

    raw_token = await repo.create_password_reset_token(user.id)
    # Email sending is intentionally deferred — caller sends the email
    # using the email provider adapter
    return raw_token


async def reset_password(db: AsyncSession, raw_token: str, new_password: str) -> None:
    repo = AdminUserRepository(db)
    record = await repo.consume_reset_token(raw_token)
    if not record:
        raise ValidationException("Reset link is invalid or has expired")

    pw_hash = hash_password(new_password)
    await repo.update_password(record.admin_user_id, pw_hash)
    await repo.revoke_all_sessions(record.admin_user_id)
    await repo.log_sign_in(record.admin_user_id, "password_changed", None, None, "ok")


async def setup_totp(db: AsyncSession, user_id: str) -> tuple[str, str]:
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(user.email, issuer_name=settings.APP_NAME)

    # Persist the secret now (two_factor_enabled stays False until enroll confirms the code).
    # This is the pending secret — enroll reads it from the DB to verify the user's first code.
    await repo.update_2fa(user_id, secret, enabled=False)

    return secret, provisioning_uri


async def enroll_totp(db: AsyncSession, user_id: str, secret: str, code: str) -> None:
    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        raise ValidationException("Invalid TOTP code — scan the QR again and retry")
    repo = AdminUserRepository(db)
    await repo.update_2fa(user_id, secret, enabled=True)
