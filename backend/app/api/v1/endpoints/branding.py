from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.branding import (
    BrandAssetCreate,
    BrandAssetResponse,
    BrandAssetUpdate,
    BrandProfileCreate,
    BrandProfileListResponse,
    BrandProfileResponse,
    BrandProfileUpdate,
    PublishRequest,
    TouchpointCreate,
    TouchpointResponse,
    TouchpointUpdate,
)
from app.schemas.common import MessageResponse
from app.services import branding_service

router = APIRouter()


# ── Brand Profiles ─────────────────────────────────────────────────────────────

@router.get("/profiles", response_model=BrandProfileListResponse)
async def list_profiles(
    include_archived: bool = Query(False),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.list_profiles(db, include_archived)


@router.post("/profiles", response_model=BrandProfileResponse, status_code=201)
async def create_profile(
    body: BrandProfileCreate,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.create_profile(db, body.model_dump(), current_user.id)


@router.get("/profiles/{profile_id}", response_model=BrandProfileResponse)
async def get_profile(
    profile_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.get_profile(db, profile_id)


@router.patch("/profiles/{profile_id}", response_model=BrandProfileResponse)
async def update_profile(
    profile_id: str,
    body: BrandProfileUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.update_profile(db, profile_id, body.model_dump(exclude_unset=True))


@router.post("/profiles/{profile_id}/publish", response_model=BrandProfileResponse)
async def publish_profile(
    profile_id: str,
    body: PublishRequest,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.publish_profile(db, profile_id, body.target, current_user.id)


@router.delete("/profiles/{profile_id}", response_model=MessageResponse)
async def delete_profile(
    profile_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await branding_service.delete_profile(db, profile_id)
    return MessageResponse(message="Brand profile deleted")


# ── Assets ─────────────────────────────────────────────────────────────────────

@router.get("/profiles/{profile_id}/assets", response_model=List[BrandAssetResponse])
async def list_assets(
    profile_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.list_assets(db, profile_id)


@router.post("/profiles/{profile_id}/assets", response_model=BrandAssetResponse, status_code=201)
async def create_asset(
    profile_id: str,
    body: BrandAssetCreate,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.create_asset(db, profile_id, body.model_dump(), current_user.id)


@router.patch("/assets/{asset_id}", response_model=BrandAssetResponse)
async def update_asset(
    asset_id: str,
    body: BrandAssetUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.update_asset(db, asset_id, body.model_dump(exclude_unset=True))


@router.delete("/assets/{asset_id}", response_model=MessageResponse)
async def delete_asset(
    asset_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await branding_service.delete_asset(db, asset_id)
    return MessageResponse(message="Asset deleted")


# ── Touchpoints ────────────────────────────────────────────────────────────────

@router.get("/profiles/{profile_id}/touchpoints", response_model=List[TouchpointResponse])
async def list_touchpoints(
    profile_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.list_touchpoints(db, profile_id)


@router.post("/profiles/{profile_id}/touchpoints", response_model=TouchpointResponse, status_code=201)
async def create_touchpoint(
    profile_id: str,
    body: TouchpointCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.create_touchpoint(db, profile_id, body.model_dump())


@router.patch("/touchpoints/{tp_id}", response_model=TouchpointResponse)
async def update_touchpoint(
    tp_id: str,
    body: TouchpointUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await branding_service.update_touchpoint(db, tp_id, body.model_dump(exclude_unset=True))
