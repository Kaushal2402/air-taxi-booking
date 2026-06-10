from __future__ import annotations
import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_backup_code import AdminBackupCode
from app.models.admin_invite_token import AdminInviteToken
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

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 50,
        exclude_id: str | None = None,
        search: str | None = None,
        role: str | None = None,
        status: str | None = None,
    ) -> list[AdminUser]:
        from sqlalchemy import or_
        q = select(AdminUser).where(AdminUser.deleted_at.is_(None))
        if exclude_id:
            q = q.where(AdminUser.id != exclude_id)
        if search:
            like = f"%{search}%"
            q = q.where(or_(AdminUser.name.ilike(like), AdminUser.email.ilike(like)))
        if role:
            q = q.where(AdminUser.role == role)
        if status:
            q = q.where(AdminUser.status == status)
        result = await self.db.execute(q.offset(skip).limit(limit).order_by(AdminUser.created_at.desc()))
        return list(result.scalars().all())

    async def count(
        self,
        exclude_id: str | None = None,
        search: str | None = None,
        role: str | None = None,
        status: str | None = None,
    ) -> int:
        from sqlalchemy import func, or_
        q = select(func.count()).select_from(AdminUser).where(AdminUser.deleted_at.is_(None))
        if exclude_id:
            q = q.where(AdminUser.id != exclude_id)
        if search:
            like = f"%{search}%"
            q = q.where(or_(AdminUser.name.ilike(like), AdminUser.email.ilike(like)))
        if role:
            q = q.where(AdminUser.role == role)
        if status:
            q = q.where(AdminUser.status == status)
        result = await self.db.execute(q)
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
            .order_by(AdminSession.created_at.desc())
            .limit(1)
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

    async def get_sign_in_history(self, user_id: str, page: int = 1, limit: int = 20) -> tuple[list[SignInHistory], int]:
        from sqlalchemy import func
        offset = (page - 1) * limit
        count_result = await self.db.execute(
            select(func.count()).select_from(SignInHistory)
            .where(SignInHistory.admin_user_id == user_id)
        )
        total = count_result.scalar_one()
        items_result = await self.db.execute(
            select(SignInHistory)
            .where(SignInHistory.admin_user_id == user_id)
            .order_by(SignInHistory.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(items_result.scalars().all()), total

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

    async def get_recent_password_reset_token(self, user_id: str, cooldown_minutes: int = 5):
        """Return a non-consumed token that was created within the last `cooldown_minutes`.
        Uses expires_at to infer recency: tokens have a 40-minute TTL, so a token
        with more than (40 - cooldown_minutes) minutes remaining was created recently."""
        from datetime import timedelta
        threshold = datetime.now(timezone.utc) + timedelta(minutes=40 - cooldown_minutes)
        result = await self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.admin_user_id == user_id,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > threshold,
            ).limit(1)
        )
        return result.scalar_one_or_none()

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

    # ── Backup codes ─────────────────────────────────────────────────────────

    async def replace_backup_codes(self, user_id: str, code_hashes: list[str]) -> None:
        """Delete all existing backup codes for the user and insert fresh ones."""
        from sqlalchemy import delete as sa_delete
        await self.db.execute(
            sa_delete(AdminBackupCode).where(AdminBackupCode.admin_user_id == user_id)
        )
        for code_hash in code_hashes:
            self.db.add(AdminBackupCode(admin_user_id=user_id, code_hash=code_hash))
        await self.db.flush()

    async def get_backup_codes(self, user_id: str) -> list[AdminBackupCode]:
        result = await self.db.execute(
            select(AdminBackupCode)
            .where(AdminBackupCode.admin_user_id == user_id)
            .order_by(AdminBackupCode.created_at.asc())
        )
        return list(result.scalars().all())

    async def consume_backup_code(self, user_id: str, plain_code: str) -> bool:
        """Verify plain_code against stored hashes; mark the first matching unused code as used.
        Returns True on success, False if no valid code found."""
        from app.core.security import verify_password
        rows = await self.get_backup_codes(user_id)
        for row in rows:
            if row.used_at is not None:
                continue  # already consumed
            if verify_password(plain_code.upper().replace("-", ""), row.code_hash):
                row.used_at = datetime.now(timezone.utc)
                await self.db.flush()
                return True
        return False

    # ── Invite tokens ─────────────────────────────────────────────────────────

    async def create_invite_token(self, user_id: str) -> str:
        """Generate a fresh invite token, invalidate old ones, return plaintext."""
        from datetime import timedelta
        from sqlalchemy import delete

        # Remove any existing (unused or expired) tokens for this user
        await self.db.execute(
            delete(AdminInviteToken).where(AdminInviteToken.admin_user_id == user_id)
        )

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        record = AdminInviteToken(
            admin_user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
        )
        self.db.add(record)
        await self.db.flush()
        return raw_token

    async def consume_invite_token(self, raw_token: str) -> AdminInviteToken | None:
        """Validate and consume an invite token. Returns the record or None."""
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        result = await self.db.execute(
            select(AdminInviteToken).where(
                AdminInviteToken.token_hash == token_hash,
                AdminInviteToken.used_at.is_(None),
                AdminInviteToken.expires_at > datetime.now(timezone.utc),
            )
        )
        record = result.scalar_one_or_none()
        if record:
            record.used_at = datetime.now(timezone.utc)
            await self.db.flush()
        return record

    async def activate_user(self, user_id: str, password_hash: str) -> None:
        """Set a user's password and mark their status as active."""
        await self.db.execute(
            update(AdminUser)
            .where(AdminUser.id == user_id)
            .values(password_hash=password_hash, status="active")
        )

    # ── Login lockout ──────────────────────────────────────────────────────────

    async def increment_failed_attempts(self, user_id: str) -> int:
        """Increment the failed-login counter and return the new count."""
        from sqlalchemy import func as sa_func
        await self.db.execute(
            update(AdminUser)
            .where(AdminUser.id == user_id)
            .values(failed_attempts=AdminUser.failed_attempts + 1)
        )
        result = await self.db.execute(
            select(AdminUser.failed_attempts).where(AdminUser.id == user_id)
        )
        return result.scalar_one()

    async def lock_account(self, user_id: str, until: datetime) -> None:
        """Set locked_until; keep failed_attempts so admins can see the count."""
        await self.db.execute(
            update(AdminUser)
            .where(AdminUser.id == user_id)
            .values(locked_until=until)
        )

    async def reset_failed_attempts(self, user_id: str) -> None:
        """Clear the failed-attempt counter and any lockout after successful auth."""
        await self.db.execute(
            update(AdminUser)
            .where(AdminUser.id == user_id)
            .values(failed_attempts=0, locked_until=None)
        )

    async def get_super_admins(self) -> list[AdminUser]:
        """Return all active super admins — used for lockout alert emails."""
        result = await self.db.execute(
            select(AdminUser).where(
                AdminUser.role == "super_admin",
                AdminUser.status == "active",
                AdminUser.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    # ── Email OTP (2FA fallback) ───────────────────────────────────────────────

    async def get_latest_email_otp(self, user_id: str, partial_token_hash: str, channel: str = "email"):
        """Return the most-recent OTP for this user+login-attempt+channel (any state) — cooldown check."""
        from app.models.admin_email_otp import AdminEmailOTP
        result = await self.db.execute(
            select(AdminEmailOTP)
            .where(
                AdminEmailOTP.admin_user_id == user_id,
                AdminEmailOTP.partial_token_hash == partial_token_hash,
                AdminEmailOTP.channel == channel,
            )
            .order_by(AdminEmailOTP.sent_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_valid_email_otp(self, user_id: str, partial_token_hash: str, channel: str = "email"):
        """Return the most-recent unused, unexpired OTP for the given channel — used for verification."""
        from app.models.admin_email_otp import AdminEmailOTP
        result = await self.db.execute(
            select(AdminEmailOTP)
            .where(
                AdminEmailOTP.admin_user_id == user_id,
                AdminEmailOTP.partial_token_hash == partial_token_hash,
                AdminEmailOTP.channel == channel,
                AdminEmailOTP.used_at.is_(None),
                AdminEmailOTP.expires_at > datetime.now(timezone.utc),
            )
            .order_by(AdminEmailOTP.sent_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_valid_email_otp_by_hash(self, partial_token_hash: str, channel: str = "email"):
        """Return the most-recent unused, unexpired OTP matching only partial_hash + channel.
        Used by the dedicated /sms-otp/verify (and /email-otp/verify) endpoints where
        only the partial_hash — not the full token — is available."""
        from app.models.admin_email_otp import AdminEmailOTP
        result = await self.db.execute(
            select(AdminEmailOTP)
            .where(
                AdminEmailOTP.partial_token_hash == partial_token_hash,
                AdminEmailOTP.channel == channel,
                AdminEmailOTP.used_at.is_(None),
                AdminEmailOTP.expires_at > datetime.now(timezone.utc),
            )
            .order_by(AdminEmailOTP.sent_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_email_otp(self, user_id: str, partial_token_hash: str, code_hash: str, expires_at: datetime, sent_at: datetime, channel: str = "email") -> None:
        """Replace previous OTPs for this login-attempt+channel and insert a fresh one."""
        from sqlalchemy import delete as sa_delete
        from app.models.admin_email_otp import AdminEmailOTP
        await self.db.execute(
            sa_delete(AdminEmailOTP).where(
                AdminEmailOTP.admin_user_id == user_id,
                AdminEmailOTP.partial_token_hash == partial_token_hash,
                AdminEmailOTP.channel == channel,
            )
        )
        self.db.add(AdminEmailOTP(
            admin_user_id=user_id,
            partial_token_hash=partial_token_hash,
            channel=channel,
            code_hash=code_hash,
            expires_at=expires_at,
            sent_at=sent_at,
        ))
        await self.db.flush()

    async def consume_email_otp(self, otp_id: str) -> None:
        """Mark an OTP as used."""
        from app.models.admin_email_otp import AdminEmailOTP
        await self.db.execute(
            update(AdminEmailOTP)
            .where(AdminEmailOTP.id == otp_id)
            .values(used_at=datetime.now(timezone.utc))
        )
