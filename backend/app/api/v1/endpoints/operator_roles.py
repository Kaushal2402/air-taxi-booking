"""Operator intra-org roles and role assignment."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_auth import OperatorInviteUserResponse
from app.schemas.operator_roles import (
    ALL_OPERATOR_PERMISSIONS,
    AssignRoleRequest,
    AvailablePermissionsResponse,
    OperatorRoleCreate,
    OperatorRoleResponse,
    OperatorRoleUpdate,
)
from app.services import operator_roles_service

router = APIRouter()


@router.get("/roles/permissions", response_model=AvailablePermissionsResponse)
async def list_permissions(
    _: OperatorUser = Depends(get_current_operator_user),
):
    return AvailablePermissionsResponse(permissions=ALL_OPERATOR_PERMISSIONS)


@router.get("/roles", response_model=list[OperatorRoleResponse])
async def list_roles(
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_roles_service.list_roles(db, current_user.operator_id)


@router.post("/roles", response_model=OperatorRoleResponse, status_code=201)
async def create_role(
    body: OperatorRoleCreate,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_roles_service.create_role(db, current_user.operator_id, body)


@router.patch("/roles/{role_id}", response_model=OperatorRoleResponse)
async def update_role(
    role_id: str,
    body: OperatorRoleUpdate,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_roles_service.update_role(db, current_user.operator_id, role_id, body)


@router.post("/users/{user_id}/assign-role", response_model=OperatorInviteUserResponse)
async def assign_role(
    user_id: str,
    body: AssignRoleRequest,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    user = await operator_roles_service.assign_role(
        db, current_user.operator_id, user_id, body.role_id
    )
    return user
