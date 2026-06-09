from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import pyotp
from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import create_access_token, decode_token
from app.models.operator import Operator
from app.models.operator_password_reset_token import OperatorPasswordResetToken
from app.models.operator_user import OperatorLoginAttempt, OperatorSession, OperatorUser
from app.schemas.operator_auth import (
    Operator2FAEnrollResponse,
    OperatorSessionOut,
    OperatorTokenResponse,
    OperatorUserOut,
)

settings = get_settings()

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_LOCKOUT_WINDOW_MINUTES = 15
_MAX_ATTEMPTS = 5
_REFRESH_EXPIRE_DAYS = 7
_RESET_TOKEN_EXPIRE_HOURS = 1
_2FA_PENDING_EXPIRE_MINUTES = 5

TOTP_ISSUER = "Acme Mobility Operator"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _count_recent_failures(db: AsyncSession, email: str) -> int:
    cutoff = _utcnow() - timedelta(minutes=_LOCKOUT_WINDOW_MINUTES)
    result = await db.execute(
        select(func.count())
        .select_from(OperatorLoginAttempt)
        .where(
            OperatorLoginAttempt.email == email,
            OperatorLoginAttempt.success.is_(False),
            OperatorLoginAttempt.attempted_at >= cutoff,
        )
    )
    return result.scalar_one()


async def _log_attempt(db: AsyncSession, email: str, ip_address: str | None, success: bool) -> None:
    attempt = OperatorLoginAttempt(
        id=str(uuid.uuid4()),
        email=email,
        ip_address=ip_address,
        success=success,
        attempted_at=_utcnow(),
    )
    db.add(attempt)
    await db.flush()


async def _get_operator_name(db: AsyncSession, operator_id: str) -> str | None:
    result = await db.execute(select(Operator.name).where(Operator.id == operator_id))
    return result.scalar_one_or_none()


def _build_user_out(user: OperatorUser, operator_name: str | None) -> OperatorUserOut:
    return OperatorUserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        operator_role=user.operator_role,
        status=user.status,
        twofa_enabled=user.twofa_enabled,
        operator_id=user.operator_id,
        operator_name=operator_name,
        avatar_url=None,
    )


async def _build_token_response(
    db: AsyncSession,
    user: OperatorUser,
    refresh_token: str,
) -> OperatorTokenResponse:
    operator_name = await _get_operator_name(db, user.operator_id)
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"kind": "operator", "operator_id": user.operator_id, "role": user.operator_role},
    )
    return OperatorTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=_build_user_out(user, operator_name),
        requires_2fa=False,
    )


async def login(
    db: AsyncSession,
    email: str,
    password: str,
    ip_address: str | None = None,
) -> OperatorTokenResponse:
    failures = await _count_recent_failures(db, email)
    if failures >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
        )

    result = await db.execute(select(OperatorUser).where(OperatorUser.email == email))
    user: OperatorUser | None = result.scalar_one_or_none()

    if not user or not _pwd_context.verify(password, user.password_hash):
        await _log_attempt(db, email, ip_address, success=False)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")

    org_result = await db.execute(select(Operator).where(Operator.id == user.operator_id))
    org: Operator | None = org_result.scalar_one_or_none()
    if org and org.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator organisation is suspended. Contact support.",
        )

    user.last_login_at = _utcnow()
    if user.status == "invited":
        user.status = "active"

    await _log_attempt(db, email, ip_address, success=True)

    # 2FA required for this user
    if user.twofa_enabled and user.twofa_secret:
        operator_name = await _get_operator_name(db, user.operator_id)
        await db.commit()
        two_fa_token = create_access_token(
            subject=user.id,
            extra_claims={"kind": "operator_2fa_pending"},
            expires_delta=timedelta(minutes=_2FA_PENDING_EXPIRE_MINUTES),
        )
        return OperatorTokenResponse(
            access_token="",
            refresh_token="",
            token_type="bearer",
            user=_build_user_out(user, operator_name),
            requires_2fa=True,
            two_fa_token=two_fa_token,
        )

    raw_refresh = secrets.token_urlsafe(48)
    session = OperatorSession(
        id=str(uuid.uuid4()),
        operator_user_id=user.id,
        refresh_token_hash=_hash_token(raw_refresh),
        ip_address=ip_address,
        created_at=_utcnow(),
        expires_at=_utcnow() + timedelta(days=_REFRESH_EXPIRE_DAYS),
    )
    db.add(session)
    await db.commit()

    return await _build_token_response(db, user, raw_refresh)


async def verify_2fa_login(
    db: AsyncSession,
    two_fa_token: str,
    code: str,
    ip_address: str | None = None,
) -> OperatorTokenResponse:
    payload = decode_token(two_fa_token)
    if not payload or payload.get("kind") != "operator_2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA token")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(OperatorUser).where(OperatorUser.id == user_id))
    user: OperatorUser | None = result.scalar_one_or_none()

    if not user or not user.twofa_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="2FA not configured")

    totp = pyotp.TOTP(user.twofa_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    raw_refresh = secrets.token_urlsafe(48)
    session = OperatorSession(
        id=str(uuid.uuid4()),
        operator_user_id=user.id,
        refresh_token_hash=_hash_token(raw_refresh),
        ip_address=ip_address,
        created_at=_utcnow(),
        expires_at=_utcnow() + timedelta(days=_REFRESH_EXPIRE_DAYS),
    )
    db.add(session)
    user.last_login_at = _utcnow()
    await db.commit()

    return await _build_token_response(db, user, raw_refresh)


async def refresh_token(db: AsyncSession, raw_refresh: str) -> OperatorTokenResponse:
    token_hash = _hash_token(raw_refresh)
    result = await db.execute(
        select(OperatorSession).where(
            OperatorSession.refresh_token_hash == token_hash,
            OperatorSession.revoked_at.is_(None),
        )
    )
    session: OperatorSession | None = result.scalar_one_or_none()

    if not session or session.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user_result = await db.execute(select(OperatorUser).where(OperatorUser.id == session.operator_user_id))
    user: OperatorUser | None = user_result.scalar_one_or_none()

    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not active")

    session.revoked_at = _utcnow()

    raw_new = secrets.token_urlsafe(48)
    new_session = OperatorSession(
        id=str(uuid.uuid4()),
        operator_user_id=user.id,
        refresh_token_hash=_hash_token(raw_new),
        ip_address=session.ip_address,
        created_at=_utcnow(),
        expires_at=_utcnow() + timedelta(days=_REFRESH_EXPIRE_DAYS),
    )
    db.add(new_session)
    await db.commit()

    return await _build_token_response(db, user, raw_new)


async def logout(db: AsyncSession, operator_user_id: str, raw_refresh: str | None = None) -> None:
    if raw_refresh:
        token_hash = _hash_token(raw_refresh)
        result = await db.execute(
            select(OperatorSession).where(
                OperatorSession.operator_user_id == operator_user_id,
                OperatorSession.refresh_token_hash == token_hash,
                OperatorSession.revoked_at.is_(None),
            )
        )
        session = result.scalar_one_or_none()
        if session:
            session.revoked_at = _utcnow()
    else:
        result = await db.execute(
            select(OperatorSession).where(
                OperatorSession.operator_user_id == operator_user_id,
                OperatorSession.revoked_at.is_(None),
            )
        )
        for s in result.scalars().all():
            s.revoked_at = _utcnow()

    await db.commit()


async def forgot_password(db: AsyncSession, email: str) -> None:
    result = await db.execute(select(OperatorUser).where(OperatorUser.email == email))
    user: OperatorUser | None = result.scalar_one_or_none()
    if not user:
        return

    existing = await db.execute(
        select(OperatorPasswordResetToken).where(
            OperatorPasswordResetToken.operator_user_id == user.id,
            OperatorPasswordResetToken.used_at.is_(None),
        )
    )
    for tok in existing.scalars().all():
        tok.used_at = _utcnow()

    raw_token = secrets.token_urlsafe(32)
    reset_token = OperatorPasswordResetToken(
        id=str(uuid.uuid4()),
        operator_user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=_utcnow() + timedelta(hours=_RESET_TOKEN_EXPIRE_HOURS),
        created_at=_utcnow(),
    )
    db.add(reset_token)
    await db.commit()
    # TODO: email the reset link containing raw_token to user.email


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    token_hash = _hash_token(token)
    result = await db.execute(
        select(OperatorPasswordResetToken).where(
            OperatorPasswordResetToken.token_hash == token_hash,
            OperatorPasswordResetToken.used_at.is_(None),
        )
    )
    reset_tok: OperatorPasswordResetToken | None = result.scalar_one_or_none()

    if not reset_tok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    if reset_tok.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")

    user_result = await db.execute(select(OperatorUser).where(OperatorUser.id == reset_tok.operator_user_id))
    user: OperatorUser | None = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = _pwd_context.hash(new_password)
    reset_tok.used_at = _utcnow()

    session_result = await db.execute(
        select(OperatorSession).where(
            OperatorSession.operator_user_id == user.id,
            OperatorSession.revoked_at.is_(None),
        )
    )
    for s in session_result.scalars().all():
        s.revoked_at = _utcnow()

    await db.commit()


async def change_password(
    db: AsyncSession,
    user: OperatorUser,
    current_password: str,
    new_password: str,
) -> None:
    if not _pwd_context.verify(current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    user.password_hash = _pwd_context.hash(new_password)

    session_result = await db.execute(
        select(OperatorSession).where(
            OperatorSession.operator_user_id == user.id,
            OperatorSession.revoked_at.is_(None),
        )
    )
    for s in session_result.scalars().all():
        s.revoked_at = _utcnow()

    await db.commit()


async def enroll_2fa(db: AsyncSession, user: OperatorUser) -> Operator2FAEnrollResponse:
    if user.twofa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="2FA is already enabled")

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name=TOTP_ISSUER)

    user.twofa_secret = secret
    await db.commit()

    return Operator2FAEnrollResponse(secret=secret, otpauth_uri=uri)


async def confirm_2fa_enrollment(db: AsyncSession, user: OperatorUser, code: str) -> None:
    if user.twofa_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="2FA is already enabled")

    if not user.twofa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA enrollment not started. Call /2fa/enroll first.",
        )

    totp = pyotp.TOTP(user.twofa_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    user.twofa_enabled = True
    await db.commit()


async def disable_2fa(db: AsyncSession, user: OperatorUser, code: str) -> None:
    if not user.twofa_enabled or not user.twofa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")

    totp = pyotp.TOTP(user.twofa_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    user.twofa_enabled = False
    user.twofa_secret = None
    await db.commit()


async def list_sessions(
    db: AsyncSession,
    user: OperatorUser,
) -> list[OperatorSessionOut]:
    result = await db.execute(
        select(OperatorSession)
        .where(
            OperatorSession.operator_user_id == user.id,
            OperatorSession.revoked_at.is_(None),
            OperatorSession.expires_at > _utcnow(),
        )
        .order_by(OperatorSession.created_at.desc())
    )
    sessions = result.scalars().all()

    return [
        OperatorSessionOut(
            id=s.id,
            ip_address=s.ip_address,
            device_info=s.device_info,
            created_at=s.created_at,
            expires_at=s.expires_at,
        )
        for s in sessions
    ]


async def revoke_session(db: AsyncSession, user: OperatorUser, session_id: str) -> None:
    result = await db.execute(
        select(OperatorSession).where(
            OperatorSession.id == session_id,
            OperatorSession.operator_user_id == user.id,
            OperatorSession.revoked_at.is_(None),
        )
    )
    session: OperatorSession | None = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.revoked_at = _utcnow()
    await db.commit()
