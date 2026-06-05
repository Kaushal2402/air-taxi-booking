from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.services import audit_service
from app.schemas.rbac import (
    PermissionCatalogResponse,
    RbacStatsResponse,
    RoleCreate,
    RoleDetailResponse,
    RoleListResponse,
    RolePermissionsPayload,
    RoleResponse,
    RoleUpdate,
)
from app.services import rbac_service

rbac_router = APIRouter()


@rbac_router.get("/stats", response_model=RbacStatsResponse)
async def get_stats(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await rbac_service.get_rbac_stats(db)


@rbac_router.get("/permissions", response_model=PermissionCatalogResponse)
async def list_permissions(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    domains = await rbac_service.list_permission_catalog(db)
    total = sum(len(d.items) for d in domains)
    return PermissionCatalogResponse(domains=domains, total=total)


@rbac_router.get("/roles", response_model=RoleListResponse)
async def list_roles(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items = await rbac_service.list_roles(db)
    return RoleListResponse(items=items, total=len(items))


@rbac_router.post("/roles", response_model=RoleResponse, status_code=201)
async def create_role(
    body: RoleCreate,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    role = await rbac_service.create_role(db, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="rbac.role_created",
            target=f"role:{role.id} ({body.name})",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"name": body.name, "description": getattr(body, "description", None)},
        )
    except Exception:
        pass
    return role


@rbac_router.get("/roles/{role_id}/permissions")
async def get_role_permissions(
    role_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    role = await rbac_service.get_role(db, role_id)
    perms = await rbac_service.get_role_permissions(db, role_id)
    return {"role_id": role_id, "permissions": [p.model_dump() for p in perms]}


@rbac_router.put("/roles/{role_id}/permissions")
async def set_role_permissions(
    role_id: str,
    body: RolePermissionsPayload,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    perms = await rbac_service.set_role_permissions(db, role_id, body.permissions)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="rbac.permissions_set",
            target=f"role:{role_id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"permissions": body.permissions},
        )
    except Exception:
        pass
    return {"role_id": role_id, "permissions": [p.model_dump() for p in perms]}


@rbac_router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await rbac_service.get_role(db, role_id)


@rbac_router.patch("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    body: RoleUpdate,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    role = await rbac_service.update_role(db, role_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="rbac.role_updated",
            target=f"role:{role_id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(exclude_unset=True),
        )
    except Exception:
        pass
    return role


@rbac_router.delete("/roles/{role_id}", status_code=204)
async def delete_role(
    role_id: str,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await rbac_service.delete_role(db, role_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="rbac.role_deleted",
            target=f"role:{role_id}",
            category="Security",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
