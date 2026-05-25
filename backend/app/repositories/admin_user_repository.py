from __future__ import annotations
import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_session import AdminSession
from app.models.admin_user import AdminUser
from app.models.password_reset_token import PasswordResetToken
from app.models.sign_in_history import SignInHistory


class AdminUserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> AdminUser | None:
        result = await self.db.execute(select(AdminUser).where(AdminUser.email == email, AdminUser.deleted_at.is_(None)))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> AdminUser | None:
        result = await self.db.execute(select(AdminUser).where(AdminUser.id == user_id, AdminUser.deleted_at.is_(None)))
        return result.scalar_one_or_none()

    async def list_all(self, skip: int = 0, limit: int = 50) -> list[AdminUser]:
        result = await self.db.execute(
            select(AdminUser)
            .where(AdminUser.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
            .order_by(AdminUser.created_at.desc())
        )
        return list(result.scalars().all())

    async def count(self) -> int:
        from sqlalchemy import func
        result = await self.db.execute(select(func.count()).select_from(AdminUser).where(AdminUser.deleted_at.is_(None)))
        return result.scalar_one()

    async def update_last_sign_in(self, user_id: str) -> None:
        await self.db.execute(
            update(AdminUser)
            .where(AdminUser.id == user_id)
            .values(last_sign_in_at=datetime.now(timezone.utc))
        )

    async def create_session(self, user_id: str, refresh_token: str, device_name: str | None = None, device_os: str | None = None, ip: str | None = None, location: str | None = None, two_fa_method: str | None = None, expires_at: datetime | None = None) -> AdminSession:
        from datetime import timedelta
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        session = AdminSession(
            admin_user_id=user_id,
            refresh_token_hash=token_hash,
            device_name=device_name,
            device_os=device_os,
            ip_address=ip,
            location=location,
            two_fa_method=two_fa_method,
            last_activity_at=datetime.now(timezone.utc),
            expires_at=expires_at or datetime.now(timezone.utc) + timedelta(days=30),
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_session_by_id(self, session_id: str) -> AdminSession | None:
        result = await self.db.execute(
            select(AdminSession)
            .where(AdminSession.id == session_id, AdminSession.revoked_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_session_by_token(self, refresh_token: str) -> AdminSession | None:
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        result = await self.db.execute(
            select(AdminSession)
            .where(AdminSession.refresh_token_hash == token_hash, AdminSession.revoked_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def revoke_session(self, session_id: str) -> None:
        await self.db.execute(
            update(AdminSession)
            .where(AdminSession.id == session_id)
            .values(revoked_at=datetime.now(timezone.utc))
        )

    async def revoke_all_sessions(self, user_id: str, except_session_id: str | None = None) -> None:
        stmt = update(AdminSession).where(AdminSession.admin_user_id == user_id, AdminSession.revoked_at.is_(None))
        if except_session_id:
            stmt = stmt.where(AdminSession.id != except_session_id)
        await self.db.execute(stmt.values(revoked_at=datetime.now(timezone.utc)))

    async def get_sessions_for_user(self, user_id: str) -> list[AdminSession]:
        result = await self.db.execute(
            select(AdminSession)
            .where(AdminSession.admin_user_id == user_id, AdminSession.revoked_at.is_(None))
            .order_by(AdminSession.last_activity_at.desc())
        )
        return list(result.scalars().all())

    async def log_sign_in(self, user_id: str, event_type: str, ip: str | None, location: str | None, result: str, user_agent: str | None = None) -> None:
        entry = SignInHistory(
            admin_user_id=user_id,
            event_type=event_type,
            ip_address=ip,
            location=location,
            result=result,
            user_agent=user_agent,
        )
        self.db.add(entry)
        await self.db.flush()

    async def get_sign_in_history(self, user_id: str, limit: int = 20) -> list[SignInHistory]:
        result = await self.db.execute(
            select(SignInHistory)
            .where(SignInHistory.admin_user_id == user_id)
            .order_by(SignInHistory.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create_password_reset_token(self, user_id: str) -> str:
        from datetime import timedelta
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        record = PasswordResetToken(
            admin_user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=40),
        )
        self.db.add(record)
        await self.db.flush()
        return raw_token

    async def consume_reset_token(self, raw_token: str) -> PasswordResetToken | None:
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        result = await self.db.execute(
            select(PasswordResetToken)
            .where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
        )
        record = result.scalar_one_or_none()
        if record:
            record.used_at = datetime.now(timezone.utc)
            await self.db.flush()
        return record

    async def update_password(self, user_id: str, password_hash: str) -> None:
        await self.db.execute(
            update(AdminUser)
            .where(AdminUser.id == user_id)
            .values(password_hash=password_hash)
        )

    async def update_2fa(self, user_id: str, secret: str | None, enabled: bool) -> None:
        await self.db.execute(
            update(AdminUser)
            .where(AdminUser.id == user_id)
            .values(two_factor_secret=secret, two_factor_enabled=enabled)
        )
