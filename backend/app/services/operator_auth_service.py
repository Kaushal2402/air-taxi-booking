from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import create_access_token
from app.models.operator import Operator
from app.models.operator_user import OperatorLoginAttempt, OperatorSession, OperatorUser
from app.schemas.operator_auth import OperatorTokenResponse, OperatorUserOut

settings = get_settings()

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_LOCKOUT_WINDOW_MINUTES = 15
_MAX_ATTEMPTS = 5
_REFRESH_EXPIRE_DAYS = 7


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


def _build_token_response(user: OperatorUser, refresh_token: str) -> OperatorTokenResponse:
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"kind": "operator", "operator_id": user.operator_id, "role": user.operator_role},
    )
    return OperatorTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=OperatorUserOut.model_validate(user),
    )


async def login(
    db: AsyncSession,
    email: str,
    password: str,
    ip_address: str | None = None,
) -> OperatorTokenResponse:
    # Lockout check
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

    # Check operator org suspension
    org_result = await db.execute(select(Operator).where(Operator.id == user.operator_id))
    org: Operator | None = org_result.scalar_one_or_none()
    if org and org.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator organisation is suspended. Contact support.",
        )

    # Create refresh token
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

    # Update last_login_at
    user.last_login_at = _utcnow()
    if user.status == "invited":
        user.status = "active"

    await _log_attempt(db, email, ip_address, success=True)
    await db.commit()

    return _build_token_response(user, raw_refresh)


async def refresh_token(db: AsyncSession, raw_refresh: str) -> OperatorTokenResponse:
    token_hash = _hash_token(raw_refresh)
    result = await db.execute(
        select(OperatorSession).where(
            OperatorSession.refresh_token_hash == token_hash,
            OperatorSession.revoked_at.is_(None),
        )
    )
    session: OperatorSession | None = result.scalar_one_or_none()

    if not session or session.expires_at < _utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user_result = await db.execute(select(OperatorUser).where(OperatorUser.id == session.operator_user_id))
    user: OperatorUser | None = user_result.scalar_one_or_none()

    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not active")

    # Rotate refresh token
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

    return _build_token_response(user, raw_new)


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
        # Revoke all sessions for the user
        result = await db.execute(
            select(OperatorSession).where(
                OperatorSession.operator_user_id == operator_user_id,
                OperatorSession.revoked_at.is_(None),
            )
        )
        for s in result.scalars().all():
            s.revoked_at = _utcnow()

    await db.commit()


# Password reset tokens are stored in a simple dict in memory for this stub.
# In production replace with a DB table or signed JWT.
_reset_tokens: dict[str, tuple[str, datetime]] = {}


async def forgot_password(db: AsyncSession, email: str) -> None:
    """Generate a password reset token. In production, email it to the user."""
    result = await db.execute(select(OperatorUser).where(OperatorUser.email == email))
    user: OperatorUser | None = result.scalar_one_or_none()
    if not user:
        # Don't reveal whether the email exists
        return

    token = secrets.token_urlsafe(32)
    _reset_tokens[token] = (user.id, _utcnow() + timedelta(hours=1))
    # TODO: send email with reset link containing `token`


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    entry = _reset_tokens.get(token)
    if not entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user_id, expires_at = entry
    if _utcnow() > expires_at:
        _reset_tokens.pop(token, None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")

    result = await db.execute(select(OperatorUser).where(OperatorUser.id == user_id))
    user: OperatorUser | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = _pwd_context.hash(new_password)
    _reset_tokens.pop(token, None)

    # Revoke all existing sessions on password change
    session_result = await db.execute(
        select(OperatorSession).where(
            OperatorSession.operator_user_id == user.id,
            OperatorSession.revoked_at.is_(None),
        )
    )
    for s in session_result.scalars().all():
        s.revoked_at = _utcnow()

    await db.commit()
