"""Operator sub-user management — operator_admin manages their own team."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.common import MessageResponse
from app.schemas.operator_auth import OperatorInviteUserRequest, OperatorInviteUserResponse
from app.services import operator_auth_service

router = APIRouter()


@router.get("", response_model=list[OperatorInviteUserResponse])
async def list_sub_users(
    search: str | None = Query(None),
    status: str | None = Query(None),
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_auth_service.list_operator_sub_users(
        db, current_user.operator_id, search, status
    )


@router.post("/invite", response_model=OperatorInviteUserResponse, status_code=201)
async def invite_sub_user(
    body: OperatorInviteUserRequest,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_auth_service.invite_operator_user(
        db,
        operator_id=current_user.operator_id,
        name=body.name,
        email=body.email,
        operator_role=body.operator_role,
        phone=body.phone,
    )


@router.post("/{user_id}/suspend", response_model=OperatorInviteUserResponse)
async def suspend_user(
    user_id: str,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_auth_service.suspend_sub_user(db, current_user.operator_id, user_id)


@router.post("/{user_id}/reactivate", response_model=OperatorInviteUserResponse)
async def reactivate_user(
    user_id: str,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_auth_service.reactivate_sub_user(db, current_user.operator_id, user_id)


@router.post("/{user_id}/force-logout", response_model=MessageResponse)
async def force_logout_user(
    user_id: str,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    await operator_auth_service.force_logout_sub_user(db, current_user.operator_id, user_id)
    return MessageResponse(message="User has been signed out of all sessions.")


@router.post("/{user_id}/reset-2fa", response_model=MessageResponse)
async def reset_user_2fa(
    user_id: str,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    await operator_auth_service.reset_sub_user_2fa(db, current_user.operator_id, user_id)
    return MessageResponse(message="2FA has been reset for this user.")


@router.post("/{user_id}/resend-invite", response_model=MessageResponse)
async def resend_user_invite(
    user_id: str,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    await operator_auth_service.resend_invite(db, user_id)
    return MessageResponse(message="Invite resent successfully.")
