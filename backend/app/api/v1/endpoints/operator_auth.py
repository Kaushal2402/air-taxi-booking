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
    Operator2FAEnrollResponse,
    Operator2FAVerifyRequest,
    OperatorChangePasswordRequest,
    OperatorForgotPasswordRequest,
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


@router.post("/login", response_model=OperatorTokenResponse)
async def login(body: OperatorLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await operator_auth_service.login(db, body.email, body.password, _get_ip(request))


@router.post("/2fa/verify", response_model=OperatorTokenResponse)
async def verify_2fa_login(body: Operator2FAVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await operator_auth_service.verify_2fa_login(db, body.two_fa_token, body.code, _get_ip(request))


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
    if body.name is not None:
        current_user.name = body.name
    if body.phone is not None:
        current_user.phone = body.phone
    await db.commit()
    await db.refresh(current_user)
    from app.services.operator_auth_service import _get_operator_name, _build_user_out
    operator_name = await _get_operator_name(db, current_user.operator_id)
    return _build_user_out(current_user, operator_name)


@router.get("/me/sessions", response_model=list[OperatorSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.list_sessions(db, current_user)


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    await operator_auth_service.revoke_session(db, current_user, session_id)
    return MessageResponse(message="Session revoked")


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
