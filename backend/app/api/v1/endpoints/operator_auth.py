from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.common import MessageResponse
from app.schemas.operator_auth import (
    OperatorForgotPasswordRequest,
    OperatorLoginRequest,
    OperatorPasswordResetRequest,
    OperatorRefreshRequest,
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


@router.get("/me", response_model=OperatorUserOut)
async def get_me(current_user: OperatorUser = Depends(get_current_operator_user)):
    return OperatorUserOut.model_validate(current_user)


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
    return OperatorUserOut.model_validate(current_user)
