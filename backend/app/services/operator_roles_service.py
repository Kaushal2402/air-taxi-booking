from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operator_role import OperatorRole, OperatorRolePermission
from app.models.operator_user import OperatorUser
from app.schemas.operator_roles import (
    ROLE_DEFAULT_PERMISSIONS,
    SYSTEM_ROLES,
    OperatorRoleCreate,
    OperatorRoleResponse,
    OperatorRoleUpdate,
)


async def _build_role_response(db: AsyncSession, role: OperatorRole) -> OperatorRoleResponse:
    perms_result = await db.execute(
        select(OperatorRolePermission.permission)
        .where(OperatorRolePermission.operator_role_id == role.id)
    )
    permissions = [r[0] for r in perms_result.all()]

    count_result = await db.execute(
        select(func.count())
        .select_from(OperatorUser)
        .where(
            OperatorUser.operator_id == role.operator_id,
            OperatorUser.operator_role_id == role.id,
        )
    )
    user_count = count_result.scalar_one() or 0

    return OperatorRoleResponse(
        id=role.id,
        name=role.name,
        display_name=role.display_name,
        is_system=role.is_system,
        permissions=permissions,
        user_count=user_count,
    )


async def _ensure_system_roles(db: AsyncSession, operator_id: str) -> None:
    """Seed system roles for an operator if they don't exist."""
    for role_name in SYSTEM_ROLES:
        existing = await db.execute(
            select(OperatorRole).where(
                OperatorRole.operator_id == operator_id,
                OperatorRole.name == role_name,
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        role = OperatorRole(
            id=str(uuid.uuid4()),
            operator_id=operator_id,
            name=role_name,
            display_name=role_name.replace("_", " ").title(),
            is_system=True,
        )
        db.add(role)
        await db.flush()

        for perm in ROLE_DEFAULT_PERMISSIONS.get(role_name, []):
            db.add(OperatorRolePermission(
                id=str(uuid.uuid4()),
                operator_role_id=role.id,
                permission=perm,
            ))

    await db.commit()


async def list_roles(db: AsyncSession, operator_id: str) -> list[OperatorRoleResponse]:
    await _ensure_system_roles(db, operator_id)
    result = await db.execute(
        select(OperatorRole).where(OperatorRole.operator_id == operator_id)
    )
    roles = result.scalars().all()
    return [await _build_role_response(db, r) for r in roles]


async def create_role(db: AsyncSession, operator_id: str, data: OperatorRoleCreate) -> OperatorRoleResponse:
    existing = await db.execute(
        select(OperatorRole).where(
            OperatorRole.operator_id == operator_id,
            OperatorRole.name == data.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role '{data.name}' already exists",
        )

    role = OperatorRole(
        id=str(uuid.uuid4()),
        operator_id=operator_id,
        name=data.name,
        display_name=data.display_name,
        is_system=False,
    )
    db.add(role)
    await db.flush()

    for perm in data.permissions:
        db.add(OperatorRolePermission(
            id=str(uuid.uuid4()),
            operator_role_id=role.id,
            permission=perm,
        ))

    await db.commit()
    await db.refresh(role)
    return await _build_role_response(db, role)


async def update_role(
    db: AsyncSession, operator_id: str, role_id: str, data: OperatorRoleUpdate
) -> OperatorRoleResponse:
    result = await db.execute(
        select(OperatorRole).where(
            OperatorRole.id == role_id,
            OperatorRole.operator_id == operator_id,
        )
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be modified",
        )

    if data.display_name is not None:
        role.display_name = data.display_name

    if data.permissions is not None:
        await db.execute(
            OperatorRolePermission.__table__.delete().where(
                OperatorRolePermission.operator_role_id == role.id
            )
        )
        for perm in data.permissions:
            db.add(OperatorRolePermission(
                id=str(uuid.uuid4()),
                operator_role_id=role.id,
                permission=perm,
            ))

    await db.commit()
    await db.refresh(role)
    return await _build_role_response(db, role)


async def assign_role(db: AsyncSession, operator_id: str, user_id: str, role_id: str) -> OperatorUser:
    user_result = await db.execute(
        select(OperatorUser).where(
            OperatorUser.id == user_id,
            OperatorUser.operator_id == operator_id,
        )
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role_result = await db.execute(
        select(OperatorRole).where(
            OperatorRole.id == role_id,
            OperatorRole.operator_id == operator_id,
        )
    )
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Block removing last admin — check if user is currently admin and no other admins exist
    if user.operator_role == "operator_admin" and role.name != "operator_admin":
        admin_count_result = await db.execute(
            select(func.count())
            .select_from(OperatorUser)
            .where(
                OperatorUser.operator_id == operator_id,
                OperatorUser.operator_role == "operator_admin",
                OperatorUser.status == "active",
            )
        )
        if (admin_count_result.scalar_one() or 0) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last active Operator Admin",
            )

    user.operator_role = role.name
    user.operator_role_id = role.id
    await db.commit()
    await db.refresh(user)
    return user
