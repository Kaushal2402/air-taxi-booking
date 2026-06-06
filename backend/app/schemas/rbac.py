from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator

_VALID_SCOPES = ("Global", "Zone", "Operator")


def _validate_scope(v: str) -> str:
    """Accept 'Global', 'Zone', 'Operator', or 'Zone:detail' / 'Operator:detail'."""
    prefix = v.split(":")[0]
    if prefix not in _VALID_SCOPES:
        raise ValueError(f"scope must start with one of {_VALID_SCOPES}, got '{prefix}'")
    return v


# ── Role schemas ──────────────────────────────────────────────────────────────

class RoleBase(BaseModel):
    name: str
    description: str = ""
    is_system: bool = False
    scope: str = "Global"

    @field_validator("scope")
    @classmethod
    def check_scope(cls, v: str) -> str:
        return _validate_scope(v)


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    scope: str | None = None

    @field_validator("scope")
    @classmethod
    def check_scope(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_scope(v)
        return v


class RoleResponse(BaseModel):
    id: str
    name: str
    description: str
    is_system: bool
    scope: str
    version: int
    is_active: bool
    member_count: int = 0
    permission_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RoleListResponse(BaseModel):
    items: list[RoleResponse]
    total: int


# ── Permission schemas ────────────────────────────────────────────────────────

class PermissionCatalogItem(BaseModel):
    key: str
    description: str
    domain: str
    is_scopeable: bool
    held_by: int = 0

    model_config = {"from_attributes": True}


class PermissionDomainGroup(BaseModel):
    domain: str
    items: list[PermissionCatalogItem]


class PermissionCatalogResponse(BaseModel):
    domains: list[PermissionDomainGroup]
    total: int


# ── Role-permission schemas ───────────────────────────────────────────────────

class RolePermissionItem(BaseModel):
    permission_key: str
    state: str  # none | scoped | granted
    scope_data: str | None = None


class RolePermissionsPayload(BaseModel):
    permissions: list[RolePermissionItem]


class RolePermissionResponse(BaseModel):
    permission_key: str
    description: str
    domain: str
    is_scopeable: bool
    state: str
    scope_data: str | None = None


class RoleDetailResponse(BaseModel):
    role: RoleResponse
    permissions: list[RolePermissionResponse]


# ── Stats schema ──────────────────────────────────────────────────────────────

class RbacStatsResponse(BaseModel):
    total_roles: int
    system_roles: int
    custom_roles: int
    total_permissions: int
    admins_assigned: int
    pending_review: int
