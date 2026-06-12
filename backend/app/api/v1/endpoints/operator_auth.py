from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.common import MessageResponse
from app.schemas.operator_auth import (
    Operator2FAConfirmRequest,
    Operator2FADisableRequest,
    Operator2FAEmailCodeRequest,
    Operator2FAEmailCodeVerifyRequest,
    Operator2FAEnrollResponse,
    Operator2FAVerifyRequest,
    OperatorAcceptInviteRequest,
    OperatorAcceptInviteResponse,
    OperatorChangePasswordRequest,
    OperatorForgotPasswordRequest,
    OperatorLoginHistoryOut,
    OperatorLoginRequest,
    OperatorPasswordResetRequest,
    OperatorRefreshRequest,
    OperatorSessionOut,
    OperatorTokenResponse,
    OperatorUpdateProfileRequest,
    OperatorUserOut,
)
from app.services import operator_auth_service

router = APIRouter()


def _get_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _get_device_info(request: Request) -> str | None:
    ua = request.headers.get("User-Agent", "")
    if not ua:
        return None
    # Compact UA: extract browser + OS tokens
    import re
    mobile = bool(re.search(r'Mobile|Android|iPhone|iPad', ua, re.I))
    browser = "Unknown"
    for b in [("Chrome", r'Chrome/(\d+)'), ("Firefox", r'Firefox/(\d+)'),
              ("Safari", r'Version/(\d+).*Safari'), ("Edge", r'Edg/(\d+)')]:
        m = re.search(b[1], ua)
        if m:
            browser = f"{b[0]} {m.group(1)}"
            break
    os_name = "Unknown OS"
    for o in [("Windows", r'Windows NT'), ("macOS", r'Mac OS X'),
              ("iOS", r'iPhone OS|iPad'), ("Android", r'Android'), ("Linux", r'Linux')]:
        if re.search(o[1], ua, re.I):
            os_name = o[0]
            break
    kind = "Mobile" if mobile else "Desktop"
    return f"{kind} · {os_name} · {browser}"


@router.post("/invite/accept", response_model=OperatorAcceptInviteResponse)
async def accept_invite(body: OperatorAcceptInviteRequest, db: AsyncSession = Depends(get_db)):
    needs_2fa = await operator_auth_service.accept_invite(db, body.token, body.password)
    return OperatorAcceptInviteResponse(
        message="Account activated. You can now log in.",
        needs_2fa_setup=needs_2fa,
    )


@router.post("/login", response_model=OperatorTokenResponse)
async def login(body: OperatorLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await operator_auth_service.login(
        db, body.email, body.password, _get_ip(request), _get_device_info(request)
    )


@router.post("/2fa/verify", response_model=OperatorTokenResponse)
async def verify_2fa_login(body: Operator2FAVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await operator_auth_service.verify_2fa_login(
        db, body.two_fa_token, body.code, _get_ip(request), _get_device_info(request)
    )


@router.post("/2fa/email-code", response_model=MessageResponse)
async def send_2fa_email_code(body: Operator2FAEmailCodeRequest, db: AsyncSession = Depends(get_db)):
    await operator_auth_service.send_2fa_email_code(db, body.two_fa_token)
    return MessageResponse(message="Verification code sent to your email.")


@router.post("/2fa/email-code/verify", response_model=OperatorTokenResponse)
async def verify_2fa_email_code(body: Operator2FAEmailCodeVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await operator_auth_service.verify_2fa_email_code(db, body.two_fa_token, body.code, _get_ip(request))


@router.post("/refresh", response_model=OperatorTokenResponse)
async def refresh(body: OperatorRefreshRequest, db: AsyncSession = Depends(get_db)):
    return await operator_auth_service.refresh_token(db, body.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    body: OperatorRefreshRequest,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    await operator_auth_service.logout(db, current_user.id, body.refresh_token)
    if body.push_token:
        try:
            from app.services.push_token_service import deregister
            await deregister(db, body.push_token)
        except Exception:
            pass
    return MessageResponse(message="Logged out successfully")


@router.post("/password/forgot", response_model=MessageResponse)
async def forgot_password(body: OperatorForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await operator_auth_service.forgot_password(db, body.email)
    return MessageResponse(message="If that email exists, a reset link has been sent.")


@router.post("/password/reset", response_model=MessageResponse)
async def reset_password(body: OperatorPasswordResetRequest, db: AsyncSession = Depends(get_db)):
    await operator_auth_service.reset_password(db, body.token, body.new_password)
    return MessageResponse(message="Password reset successfully")


@router.post("/me/change-password", response_model=MessageResponse)
async def change_password(
    body: OperatorChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    await operator_auth_service.change_password(db, current_user, body.current_password, body.new_password)
    return MessageResponse(message="Password changed. All sessions have been revoked. Please log in again.")


@router.get("/me", response_model=OperatorUserOut)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    from app.services.operator_auth_service import _get_operator_name, _build_user_out
    operator_name = await _get_operator_name(db, current_user.operator_id)
    return _build_user_out(current_user, operator_name)


@router.patch("/me", response_model=OperatorUserOut)
async def update_me(
    body: OperatorUpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    updated = await operator_auth_service.update_me(db, current_user, body.model_dump(exclude_unset=True))
    from app.services.operator_auth_service import _get_operator_name, _build_user_out
    operator_name = await _get_operator_name(db, updated.operator_id)
    return _build_user_out(updated, operator_name)


@router.get("/me/sessions", response_model=list[OperatorSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.list_sessions(db, current_user)


@router.delete("/me/sessions", response_model=MessageResponse)
async def revoke_all_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    await operator_auth_service.logout(db, current_user.id)
    return MessageResponse(message="All sessions signed out.")


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    await operator_auth_service.revoke_session(db, current_user, session_id)
    return MessageResponse(message="Session revoked")


@router.get("/me/history", response_model=list[OperatorLoginHistoryOut])
async def sign_in_history(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.get_sign_in_history(db, current_user.id)


@router.post("/2fa/enroll", response_model=Operator2FAEnrollResponse)
async def enroll_2fa(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.enroll_2fa(db, current_user)


@router.post("/2fa/confirm", response_model=MessageResponse)
async def confirm_2fa(
    body: Operator2FAConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    await operator_auth_service.confirm_2fa_enrollment(db, current_user, body.code)
    return MessageResponse(message="2FA enabled successfully")


@router.post("/2fa/disable", response_model=MessageResponse)
async def disable_2fa(
    body: Operator2FADisableRequest,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    await operator_auth_service.disable_2fa(db, current_user, body.code)
    return MessageResponse(message="2FA disabled")


# ──────────────────────────────────────────────────────────────
# Recovery / backup codes
# ──────────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class BackupCodeStatusOut(_BaseModel):
    total: int
    used: int
    remaining: int

class BackupCodesOut(_BaseModel):
    codes: list[str]

class VerifyBackupCodeRequest(_BaseModel):
    two_fa_token: str
    code: str


@router.post("/backup-codes/generate", response_model=BackupCodesOut)
async def generate_backup_codes(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    codes = await operator_auth_service.generate_backup_codes(db, current_user.id)
    return BackupCodesOut(codes=codes)


@router.get("/backup-codes/status", response_model=BackupCodeStatusOut)
async def backup_code_status(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.get_backup_code_status(db, current_user.id)


@router.post("/2fa/verify-backup", response_model=OperatorTokenResponse)
async def verify_backup_code(
    body: VerifyBackupCodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
    return await operator_auth_service.verify_backup_code_login(db, body.two_fa_token, body.code, ip)


# ──────────────────────────────────────────────────────────────
# Notification preferences
# ──────────────────────────────────────────────────────────────
from app.schemas.operator_auth import (
    OperatorNotificationPrefOut,
    OperatorNotificationPrefUpdate,
    OperatorPermissionSummaryOut,
)
from typing import List as _List


@router.get("/me/notification-prefs", response_model=_List[OperatorNotificationPrefOut])
async def get_notification_prefs(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.get_notification_prefs(db, current_user.id)


@router.put("/me/notification-prefs", response_model=_List[OperatorNotificationPrefOut])
async def update_notification_prefs(
    body: _List[OperatorNotificationPrefUpdate],
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.update_notification_prefs(
        db, current_user.id, [u.model_dump() for u in body]
    )


# ──────────────────────────────────────────────────────────────
# Permission summary
# ──────────────────────────────────────────────────────────────

@router.get("/me/permissions", response_model=OperatorPermissionSummaryOut)
async def get_permissions(
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return operator_auth_service.get_permission_summary(current_user.operator_role)


@router.post("/me/notification-prefs/reset", response_model=_List[OperatorNotificationPrefOut])
async def reset_notification_prefs(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.reset_notification_prefs(db, current_user.id)
