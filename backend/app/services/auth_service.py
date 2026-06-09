from __future__ import annotations

import pyotp
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import ForbiddenException, NotFoundException, TooManyRequestsException, UnauthorizedException, ValidationException
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.repositories.admin_user_repository import AdminUserRepository
from app.schemas.auth import AdminUserBrief, LoginResponse, TokenResponse

settings = get_settings()

PARTIAL_TOKEN_TYPE = "partial_auth"
OTP_COOLDOWN_SECONDS = 60
OTP_EXPIRY_MINUTES = 10

# Session TTL based on whether the user trusts the device.
# Trusted  → 30 days  (matches REFRESH_TOKEN_EXPIRE_DAYS config)
# Untrusted → 1 day   (forces re-login the next day)
SESSION_TTL_TRUSTED   = timedelta(days=30)
SESSION_TTL_UNTRUSTED = timedelta(days=1)


def _user_brief(user) -> AdminUserBrief:
    return AdminUserBrief(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=user.status,
        two_factor_enabled=user.two_factor_enabled,
        phone=user.phone,
        avatar_url=user.avatar_url,
        locale=user.locale if user.locale else "en",
    )


async def login(db: AsyncSession, email: str, password: str, remember_me: bool, request_meta: dict) -> LoginResponse:
    repo = AdminUserRepository(db)
    user = await repo.get_by_email(email)

    # Always give the same error for unknown email to avoid user enumeration.
    if not user:
        raise UnauthorizedException("Invalid email or password")

    now = datetime.now(timezone.utc)

    # ── Lockout check ────────────────────────────────────────────────────────
    if user.locked_until:
        if user.locked_until > now:
            remaining = max(1, int((user.locked_until - now).total_seconds() / 60) + 1)
            # Log every attempt while locked so the audit trail is complete.
            await repo.log_sign_in(
                user.id, "account_locked",
                request_meta.get("ip"), request_meta.get("location"), "fail",
                request_meta.get("user_agent"),
            )
            await db.commit()
            raise ForbiddenException(
                f"Account locked after too many failed attempts. "
                f"Try again in {remaining} minute(s) or ask a super admin to unlock it."
            )
        else:
            # Lock window has expired — auto-reset so the counter starts fresh.
            await repo.reset_failed_attempts(user.id)
            user.failed_attempts = 0
            user.locked_until = None

    # ── Password check ───────────────────────────────────────────────────────
    if not verify_password(password, user.password_hash):
        new_count = await repo.increment_failed_attempts(user.id)
        await repo.log_sign_in(
            user.id, "failed_password",
            request_meta.get("ip"), request_meta.get("location"), "fail",
            request_meta.get("user_agent"),
        )

        if new_count >= settings.LOGIN_MAX_ATTEMPTS:
            until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
            await repo.lock_account(user.id, until)
            await repo.log_sign_in(
                user.id, "account_locked",
                request_meta.get("ip"), request_meta.get("location"), "fail",
            )
            # Gather super admins BEFORE the commit so we stay in one session.
            super_admins = await repo.get_super_admins()
            # Commit: lockout + audit logs must persist even though we're about to raise.
            await db.commit()
            # Send alert emails (non-critical — failure must not affect the response).
            await _send_lockout_alert(user, super_admins, until, request_meta)
            raise ForbiddenException(
                f"Account locked after {settings.LOGIN_MAX_ATTEMPTS} failed attempts. "
                f"Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes or contact a super admin."
            )

        # Commit so the failed-attempt counter + audit log are persisted
        # even though we're about to raise an exception (get_db would otherwise
        # roll back on any exception).
        await db.commit()
        raise UnauthorizedException("Invalid email or password")

    # ── Status checks (after password is verified) ───────────────────────────
    if user.status == "suspended":
        raise ForbiddenException("Account suspended — contact your administrator")

    if user.status == "invited":
        raise ForbiddenException("Account not yet activated — check your invitation email")

    # ── Successful authentication ─────────────────────────────────────────────
    # Reset any leftover failed-attempt state from previous bad attempts.
    if user.failed_attempts > 0 or user.locked_until is not None:
        await repo.reset_failed_attempts(user.id)

    if user.two_factor_enabled:
        partial_token = create_access_token(
            subject=user.id,
            extra_claims={"type": PARTIAL_TOKEN_TYPE, "role": user.role},
        )
        return LoginResponse(
            requires_2fa=True,
            partial_token=partial_token,
            has_phone=bool(user.phone),
        )

    ttl = SESSION_TTL_TRUSTED if remember_me else SESSION_TTL_UNTRUSTED
    refresh_token = create_refresh_token(user.id)
    session = await repo.create_session(
        user.id, refresh_token,
        ip=request_meta.get("ip"), location=request_meta.get("location"),
        expires_at=now + ttl,
    )
    access_token = create_access_token(user.id, extra_claims={"role": user.role, "sid": session.id})
    await repo.update_last_sign_in(user.id)
    await repo.log_sign_in(
        user.id, "sign_in",
        request_meta.get("ip"), request_meta.get("location"), "ok",
        request_meta.get("user_agent"),
    )

    return LoginResponse(
        requires_2fa=False,
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_brief(user),
    )


async def _send_lockout_alert(user, super_admins: list, until: datetime, meta: dict) -> None:
    """Email all active super admins when an account is locked out."""
    import logging
    logger = logging.getLogger(__name__)
    if not super_admins:
        return
    try:
        from app.providers import get_email_provider
        from app.providers.base.email import EmailMessage
        email_provider = get_email_provider()
        ip = meta.get("ip") or "unknown"
        lock_until_str = until.strftime("%Y-%m-%d %H:%M UTC")
        for sa_user in super_admins:
            if sa_user.id == user.id:
                continue  # Don't alert the locked user about their own lock
            await email_provider.send(EmailMessage(
                to=[sa_user.email],
                subject=f"[{settings.APP_NAME}] Account locked: {user.name}",
                html_body=(
                    f"<p>Hi {sa_user.name},</p>"
                    f"<p>The account for <strong>{user.name}</strong> ({user.email}) "
                    f"has been <strong>automatically locked</strong> after "
                    f"{settings.LOGIN_MAX_ATTEMPTS} consecutive failed login attempts.</p>"
                    f"<p><strong>IP address:</strong> {ip}<br>"
                    f"<strong>Locked until:</strong> {lock_until_str}</p>"
                    f"<p>If this was a legitimate user, you can unlock their account "
                    f"from the <a href='{settings.FRONTEND_URL}/admin-users'>Admin Directory</a>.</p>"
                    f"<p>If this looks suspicious, consider reviewing the sign-in history "
                    f"and rotating the account's credentials.</p>"
                ),
                text_body=(
                    f"Hi {sa_user.name},\n\n"
                    f"The account for {user.name} ({user.email}) has been locked after "
                    f"{settings.LOGIN_MAX_ATTEMPTS} failed login attempts.\n"
                    f"IP: {ip}\nLocked until: {lock_until_str}\n\n"
                    f"Unlock from: {settings.FRONTEND_URL}/admin-users\n"
                ),
            ))
    except Exception as exc:
        logger.exception("Failed to send lockout alert for %s: %s", user.email, exc)


async def verify_2fa(db: AsyncSession, partial_token: str, code: str, trust_device: bool, request_meta: dict) -> TokenResponse:
    import hashlib
    payload = decode_token(partial_token)
    if payload.get("type") != PARTIAL_TOKEN_TYPE:
        raise UnauthorizedException("Invalid or expired step-1 token")

    user_id = payload.get("sub")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user or not user.two_factor_enabled or not user.two_factor_secret:
        raise UnauthorizedException("2FA not configured")

    # ── Lockout check (brute-force at 2FA step) ───────────────────────────────
    now = datetime.now(timezone.utc)
    if user.locked_until:
        if user.locked_until > now:
            remaining = max(1, int((user.locked_until - now).total_seconds() / 60) + 1)
            await repo.log_sign_in(
                user.id, "account_locked",
                request_meta.get("ip"), request_meta.get("location"), "fail",
                request_meta.get("user_agent"),
            )
            await db.commit()
            raise ForbiddenException(
                f"Account locked. Try again in {remaining} minute(s) or ask a super admin to unlock it."
            )
        else:
            # Lock window expired — auto-clear so attempts start fresh.
            await repo.reset_failed_attempts(user.id)

    # Try TOTP first, then email/SMS OTP as fallback
    totp_valid = pyotp.TOTP(user.two_factor_secret).verify(code, valid_window=1)
    email_otp_record = None
    two_fa_method = "TOTP"

    if not totp_valid:
        partial_hash = hashlib.sha256(partial_token.encode()).hexdigest()
        for _channel in ("email", "sms"):
            _rec = await repo.get_valid_email_otp(user_id, partial_hash, _channel)
            if _rec and verify_password(code, _rec.code_hash):
                email_otp_record = _rec
                two_fa_method = f"{_channel.upper()}_OTP"
                break

    if not totp_valid and not email_otp_record:
        new_count = await repo.increment_failed_attempts(user.id)
        await repo.log_sign_in(
            user.id, "2fa_failed",
            request_meta.get("ip"), request_meta.get("location"), "fail",
            request_meta.get("user_agent"),
        )
        if new_count >= settings.LOGIN_MAX_ATTEMPTS:
            until = datetime.now(timezone.utc) + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
            await repo.lock_account(user.id, until)
            await repo.log_sign_in(
                user.id, "account_locked",
                request_meta.get("ip"), request_meta.get("location"), "fail",
            )
            super_admins = await repo.get_super_admins()
            await db.commit()
            await _send_lockout_alert(user, super_admins, until, request_meta)
            raise ForbiddenException(
                f"Account locked after {settings.LOGIN_MAX_ATTEMPTS} failed attempts. "
                f"Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes or contact a super admin."
            )
        await db.commit()
        raise UnauthorizedException("Invalid verification code")

    # Consume the email OTP so it cannot be reused
    if email_otp_record:
        await repo.consume_email_otp(email_otp_record.id)

    # Reset any failed-attempt state accumulated during this 2FA attempt
    if user.failed_attempts > 0 or user.locked_until is not None:
        await repo.reset_failed_attempts(user.id)

    ttl = SESSION_TTL_TRUSTED if trust_device else SESSION_TTL_UNTRUSTED
    refresh_token = create_refresh_token(user.id)
    session = await repo.create_session(
        user.id, refresh_token,
        ip=request_meta.get("ip"), location=request_meta.get("location"),
        two_fa_method=two_fa_method,
        expires_at=datetime.now(timezone.utc) + ttl,
    )
    access_token = create_access_token(user.id, extra_claims={"role": user.role, "sid": session.id})
    await repo.update_last_sign_in(user.id)
    await repo.log_sign_in(user.id, "2fa_verified", request_meta.get("ip"), request_meta.get("location"), "ok")
    await repo.log_sign_in(user.id, "sign_in", request_meta.get("ip"), request_meta.get("location"), "ok", request_meta.get("user_agent"))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=_user_brief(user))


async def send_email_otp(db: AsyncSession, partial_token: str) -> dict:
    """Generate a 6-digit OTP and email it as a TOTP fallback. Enforces a 60-second resend cooldown."""
    import hashlib
    import logging
    import secrets as _sec
    logger = logging.getLogger(__name__)

    payload = decode_token(partial_token)
    if payload.get("type") != PARTIAL_TOKEN_TYPE:
        raise UnauthorizedException("Invalid or expired step-1 token")

    user_id = payload.get("sub")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user or not user.two_factor_enabled:
        raise UnauthorizedException("2FA not configured for this account")

    now = datetime.now(timezone.utc)
    partial_hash = hashlib.sha256(partial_token.encode()).hexdigest()

    # Cooldown: check the most recent OTP regardless of whether it was used
    existing = await repo.get_latest_email_otp(user_id, partial_hash)
    if existing:
        elapsed = (now - existing.sent_at).total_seconds()
        remaining = int(OTP_COOLDOWN_SECONDS - elapsed)
        if remaining > 0:
            raise TooManyRequestsException(
                f"Please wait {remaining} more second(s) before requesting a new code.",
                retry_after=remaining,
            )

    # Generate a 6-digit code and store its bcrypt hash
    raw_code = f"{_sec.randbelow(1_000_000):06d}"
    code_hash = hash_password(raw_code)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    await repo.create_email_otp(user_id, partial_hash, code_hash, expires_at, now)

    # Send the code (non-critical — a delivery failure must not block the response)
    try:
        from app.providers import get_email_provider
        from app.providers.base.email import EmailMessage
        email_provider = get_email_provider()
        await email_provider.send(EmailMessage(
            to=[user.email],
            subject=f"Your {settings.APP_NAME} sign-in code: {raw_code}",
            html_body=(
                f"<p>Hi {user.name},</p>"
                f"<p>Your sign-in verification code is:</p>"
                f"<p style='font-size:36px;letter-spacing:10px;font-weight:700;"
                f"font-family:monospace;color:#1a1814'>{raw_code}</p>"
                f"<p>This code expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>.</p>"
                f"<p style='color:#888;font-size:12px'>"
                f"Do not share this code with anyone. "
                f"If you did not attempt to sign in, please change your password immediately."
                f"</p>"
            ),
            text_body=(
                f"Hi {user.name},\n\n"
                f"Your {settings.APP_NAME} sign-in code: {raw_code}\n\n"
                f"Expires in {OTP_EXPIRY_MINUTES} minutes. Do not share this code.\n"
            ),
        ))
    except Exception as exc:
        logger.exception("Failed to send email OTP to %s: %s", user.email, exc)

    return {"sent_at": now.isoformat() + "Z", "cooldown_seconds": OTP_COOLDOWN_SECONDS}


async def send_sms_otp(db: AsyncSession, partial_token: str) -> dict:
    """Generate a 6-digit OTP and send it via SMS as a TOTP fallback. Enforces a 60-second resend cooldown."""
    import hashlib
    import logging
    import secrets as _sec
    logger = logging.getLogger(__name__)

    payload = decode_token(partial_token)
    if payload.get("type") != PARTIAL_TOKEN_TYPE:
        raise UnauthorizedException("Invalid or expired step-1 token")

    user_id = payload.get("sub")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user or not user.two_factor_enabled:
        raise UnauthorizedException("2FA not configured for this account")
    if not user.phone:
        raise ValidationException("No phone number is associated with this account. Add one in your profile settings.")

    now = datetime.now(timezone.utc)
    partial_hash = hashlib.sha256(partial_token.encode()).hexdigest()

    # Cooldown: per-channel — SMS and email have independent 60 s windows
    existing = await repo.get_latest_email_otp(user_id, partial_hash, channel="sms")
    if existing:
        elapsed = (now - existing.sent_at).total_seconds()
        remaining = int(OTP_COOLDOWN_SECONDS - elapsed)
        if remaining > 0:
            raise TooManyRequestsException(
                f"Please wait {remaining} more second(s) before requesting a new SMS code.",
                retry_after=remaining,
            )

    raw_code = f"{_sec.randbelow(1_000_000):06d}"
    code_hash = hash_password(raw_code)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    await repo.create_email_otp(user_id, partial_hash, code_hash, expires_at, now, channel="sms")

    try:
        from app.providers import get_sms_provider
        sms_provider = get_sms_provider()
        await sms_provider.send(
            to=user.phone,
            message=(
                f"Your {settings.APP_NAME} sign-in code: {raw_code}\n"
                f"Expires in {OTP_EXPIRY_MINUTES} min. Do not share this code."
            ),
        )
    except Exception as exc:
        logger.exception("Failed to send SMS OTP to %s: %s", user.phone, exc)

    # Mask phone for the frontend display
    masked_phone = user.phone[:3] + "****" + user.phone[-2:] if len(user.phone) > 5 else "****"
    return {"sent_at": now.isoformat() + "Z", "cooldown_seconds": OTP_COOLDOWN_SECONDS, "masked_phone": masked_phone}


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    repo = AdminUserRepository(db)
    session = await repo.get_session_by_token(refresh_token)
    if not session:
        raise UnauthorizedException("Invalid or revoked refresh token")

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

    # Rate limit: one reset email per 5 minutes per account.
    # Raises 429 if a token was already issued in the last 5 minutes.
    recent = await repo.get_recent_password_reset_token(user.id)
    if recent:
        raise TooManyRequestsException(
            "A reset link was recently sent. Please wait a few minutes before requesting another.",
            retry_after=300,
        )

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


# ── Backup codes ──────────────────────────────────────────────────────────────

import secrets as _secrets
import string as _string

_CODE_CHARS = _string.ascii_uppercase + _string.digits
_CODE_COUNT = 10   # codes per generation
_CODE_LEN   = 8    # chars per code (shown as XXXX-XXXX)


def _make_plain_code() -> str:
    raw = "".join(_secrets.choice(_CODE_CHARS) for _ in range(_CODE_LEN))
    return f"{raw[:4]}-{raw[4:]}"   # e.g.  A3B2-C7D9


async def generate_backup_codes(db: AsyncSession, user_id: str) -> list[str]:
    """Generate 10 fresh backup codes, store bcrypt hashes, return plaintexts (shown once)."""
    from app.core.security import hash_password
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundException("AdminUser")
    if not user.two_factor_enabled:
        raise ValidationException("Enable two-factor authentication before generating backup codes")

    plain_codes = [_make_plain_code() for _ in range(_CODE_COUNT)]
    # Store without the dash so verify can normalise input too
    hashes = [hash_password(c.replace("-", "")) for c in plain_codes]
    await repo.replace_backup_codes(user_id, hashes)
    return plain_codes


async def get_backup_code_status(db: AsyncSession, user_id: str) -> dict:
    """Return how many backup codes exist and how many are still unused."""
    repo = AdminUserRepository(db)
    codes = await repo.get_backup_codes(user_id)
    total = len(codes)
    used  = sum(1 for c in codes if c.used_at is not None)
    return {"total": total, "used": used, "remaining": total - used}


PRIVILEGED_ROLES = {"super_admin", "finance_manager", "finance"}


async def disable_totp(db: AsyncSession, user_id: str, code: str) -> None:
    """Verify the user's current TOTP code, then permanently disable 2FA and delete all backup codes."""
    from fastapi import HTTPException
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if user and user.role in PRIVILEGED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Users with privileged roles cannot disable Two-Factor Authentication. Contact your system administrator.",
        )
    if not user or not user.two_factor_enabled or not user.two_factor_secret:
        raise ValidationException("Two-factor authentication is not enabled on this account")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(code, valid_window=1):
        raise ValidationException("Invalid TOTP code — check your authenticator app and try again")

    # Disable flag + clear secret
    await repo.update_2fa(user_id, secret=None, enabled=False)

    # Remove all backup codes
    from sqlalchemy import delete as sa_delete
    from app.models.admin_backup_code import AdminBackupCode
    await db.execute(sa_delete(AdminBackupCode).where(AdminBackupCode.admin_user_id == user_id))

    await repo.log_sign_in(user_id, "2fa_disabled", None, None, "ok")


async def verify_otp(
    db: AsyncSession,
    partial_hash: str,
    code: str,
    remember_me: bool,
    channel: str,
    request_meta: dict,
) -> TokenResponse:
    """Verify an email or SMS OTP using the partial_hash and return full tokens."""
    from app.core.security import verify_password as _verify_pw

    repo = AdminUserRepository(db)

    # Locate a valid (unexpired, unconsumed) OTP record for this partial_hash + channel
    otp_record = await repo.get_valid_email_otp_by_hash(partial_hash, channel)
    if not otp_record:
        raise UnauthorizedException("Invalid or expired verification code")

    user_id = otp_record.admin_user_id
    user = await repo.get_by_id(user_id)
    if not user or not user.two_factor_enabled:
        raise UnauthorizedException("2FA not configured for this account")

    # Verify the raw code against the stored hash
    if not _verify_pw(code, otp_record.code_hash):
        new_count = await repo.increment_failed_attempts(user.id)
        await repo.log_sign_in(
            user.id, f"{channel}_otp_failed",
            request_meta.get("ip"), request_meta.get("location"), "fail",
            request_meta.get("user_agent"),
        )
        if new_count >= settings.LOGIN_MAX_ATTEMPTS:
            now = datetime.now(timezone.utc)
            until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
            await repo.lock_account(user.id, until)
            super_admins = await repo.get_super_admins()
            await db.commit()
            await _send_lockout_alert(user, super_admins, until, request_meta)
            raise ForbiddenException(
                f"Account locked after {settings.LOGIN_MAX_ATTEMPTS} failed attempts. "
                f"Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes or contact a super admin."
            )
        await db.commit()
        raise UnauthorizedException("Invalid verification code")

    # Consume the OTP so it cannot be reused
    await repo.consume_email_otp(otp_record.id)

    # Reset any accumulated failed-attempt state
    if user.failed_attempts > 0 or user.locked_until is not None:
        await repo.reset_failed_attempts(user.id)

    ttl = SESSION_TTL_TRUSTED if remember_me else SESSION_TTL_UNTRUSTED
    now = datetime.now(timezone.utc)
    refresh_token = create_refresh_token(user.id)
    session = await repo.create_session(
        user.id, refresh_token,
        ip=request_meta.get("ip"), location=request_meta.get("location"),
        two_fa_method=f"{channel.upper()}_OTP",
        expires_at=now + ttl,
    )
    access_token = create_access_token(user.id, extra_claims={"role": user.role, "sid": session.id})
    await repo.update_last_sign_in(user.id)
    await repo.log_sign_in(
        user.id, f"{channel}_otp_verified",
        request_meta.get("ip"), request_meta.get("location"), "ok",
    )
    await repo.log_sign_in(
        user.id, "sign_in",
        request_meta.get("ip"), request_meta.get("location"), "ok",
        request_meta.get("user_agent"),
    )

    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=_user_brief(user))


async def verify_backup_code(
    db: AsyncSession,
    partial_token: str,
    plain_code: str,
    request_meta: dict,
) -> TokenResponse:
    payload = decode_token(partial_token)
    if payload.get("type") != PARTIAL_TOKEN_TYPE:
        raise UnauthorizedException("Invalid or expired step-1 token")

    user_id = payload.get("sub")
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user or not user.two_factor_enabled:
        raise UnauthorizedException("2FA not configured")

    # ── Lockout check ─────────────────────────────────────────────────────────
    _now = datetime.now(timezone.utc)
    if user.locked_until:
        if user.locked_until > _now:
            remaining = max(1, int((user.locked_until - _now).total_seconds() / 60) + 1)
            await repo.log_sign_in(
                user.id, "account_locked",
                request_meta.get("ip"), request_meta.get("location"), "fail",
                request_meta.get("user_agent"),
            )
            await db.commit()
            raise ForbiddenException(
                f"Account locked. Try again in {remaining} minute(s) or ask a super admin to unlock it."
            )
        else:
            await repo.reset_failed_attempts(user.id)

    ok = await repo.consume_backup_code(user_id, plain_code)
    if not ok:
        new_count = await repo.increment_failed_attempts(user.id)
        await repo.log_sign_in(
            user_id, "backup_code_failed",
            request_meta.get("ip"), request_meta.get("location"), "fail",
            request_meta.get("user_agent"),
        )
        if new_count >= settings.LOGIN_MAX_ATTEMPTS:
            until = datetime.now(timezone.utc) + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
            await repo.lock_account(user.id, until)
            await repo.log_sign_in(
                user.id, "account_locked",
                request_meta.get("ip"), request_meta.get("location"), "fail",
            )
            super_admins = await repo.get_super_admins()
            await db.commit()
            await _send_lockout_alert(user, super_admins, until, request_meta)
            raise ForbiddenException(
                f"Account locked after {settings.LOGIN_MAX_ATTEMPTS} failed attempts. "
                f"Try again in {settings.LOGIN_LOCKOUT_MINUTES} minutes or contact a super admin."
            )
        await db.commit()
        raise UnauthorizedException("Invalid or already-used backup code")

    # Reset any accumulated failed-attempt state
    if user.failed_attempts > 0 or user.locked_until is not None:
        await repo.reset_failed_attempts(user.id)

    # Backup code login → always untrusted (1-day session)
    refresh_token = create_refresh_token(user.id)
    session = await repo.create_session(
        user.id, refresh_token,
        ip=request_meta.get("ip"), location=request_meta.get("location"),
        two_fa_method="backup_code",
        expires_at=datetime.now(timezone.utc) + SESSION_TTL_UNTRUSTED,
    )
    access_token = create_access_token(user.id, extra_claims={"role": user.role, "sid": session.id})
    await repo.update_last_sign_in(user.id)
    await repo.log_sign_in(user_id, "backup_code_used", request_meta.get("ip"), request_meta.get("location"), "ok", request_meta.get("user_agent"))
    await repo.log_sign_in(user_id, "sign_in", request_meta.get("ip"), request_meta.get("location"), "ok", request_meta.get("user_agent"))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=_user_brief(user))
