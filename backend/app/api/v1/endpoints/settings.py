from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.common import MessageResponse
from app.schemas.settings import (
    FeatureFlagCreate,
    FeatureFlagResponse,
    FeatureFlagsListResponse,
    FeatureFlagUpdate,
    FlagMetrics,
    KillSwitchResponse,
    KillSwitchUpdate,
    MaintenanceWindowCreate,
    MaintenanceWindowResponse,
    MaintenanceWindowsListResponse,
    PlatformSettingsResponse,
    PlatformSettingsUpdate,
    PlatformToggleResponse,
    PlatformToggleUpdate,
)
from app.services import settings_service

settings_router = APIRouter()


# ── Platform Settings ─────────────────────────────────────────────────────────

@settings_router.get("", response_model=PlatformSettingsResponse)
async def get_platform_settings(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.get_settings(db)


@settings_router.patch("", response_model=PlatformSettingsResponse)
async def update_platform_settings(
    body: PlatformSettingsUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.update_settings(db, body.model_dump(exclude_unset=True))


# ── Platform Toggles ──────────────────────────────────────────────────────────

@settings_router.get("/toggles", response_model=List[PlatformToggleResponse])
async def list_platform_toggles(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.list_toggles(db)


@settings_router.patch("/toggles/{key}", response_model=PlatformToggleResponse)
async def update_platform_toggle(
    key: str,
    body: PlatformToggleUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.update_toggle(db, key, body.enabled)


# ── Feature Flags ─────────────────────────────────────────────────────────────

@settings_router.get("/flags", response_model=FeatureFlagsListResponse)
async def list_feature_flags(
    environment: Optional[str] = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items = await settings_service.list_flags(db, environment)
    return FeatureFlagsListResponse(items=items, total=len(items))


@settings_router.post("/flags", response_model=FeatureFlagResponse, status_code=201)
async def create_feature_flag(
    body: FeatureFlagCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.create_flag(db, body.model_dump())


@settings_router.patch("/flags/{id}", response_model=FeatureFlagResponse)
async def update_feature_flag(
    id: str,
    body: FeatureFlagUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.update_flag(db, id, body.model_dump(exclude_unset=True))


@settings_router.get("/flags/{id}/metrics", response_model=FlagMetrics)
async def get_flag_metrics(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    data = await settings_service.get_flag_metrics(db, id)
    if data is None:
        return FlagMetrics()  # all fields null → frontend shows "—"
    return FlagMetrics(**data)


# ── Kill Switches ─────────────────────────────────────────────────────────────

@settings_router.get("/kill-switches", response_model=List[KillSwitchResponse])
async def list_kill_switches(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.list_kill_switches(db)


@settings_router.patch("/kill-switches/{key}", response_model=KillSwitchResponse)
async def update_kill_switch(
    key: str,
    body: KillSwitchUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.update_kill_switch(db, key, body.enabled)


# ── Maintenance Windows ───────────────────────────────────────────────────────

@settings_router.get("/maintenance-windows", response_model=MaintenanceWindowsListResponse)
async def list_maintenance_windows(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items = await settings_service.list_maintenance_windows(db)
    return MaintenanceWindowsListResponse(items=items)


@settings_router.post("/maintenance-windows", response_model=MaintenanceWindowResponse, status_code=201)
async def create_maintenance_window(
    body: MaintenanceWindowCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await settings_service.create_maintenance_window(db, body.model_dump())


@settings_router.delete("/maintenance-windows/{id}", response_model=MessageResponse)
async def delete_maintenance_window(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await settings_service.delete_maintenance_window(db, id)
    return MessageResponse(message="Deleted")
