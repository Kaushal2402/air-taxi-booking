from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel

from app.models.branding import AssetStatus, BrandStatus, TouchpointStatus


# ── Brand Profile ─────────────────────────────────────────────────────────────

class BrandProfileCreate(BaseModel):
    brand_ref: str
    name: str
    scope: str | None = None
    primary_color: str | None = "#0F8A5F"
    ink_color: str | None = "#1A1814"
    surface_color: str | None = "#FBF9F4"
    bg_color: str | None = "#F4F1EA"
    success_color: str | None = "#0F8A5F"
    display_font: str | None = "Newsreader"
    text_font: str | None = "IBM Plex Sans"
    corner_radius: str | None = "Medium · 8px"
    button_style: str | None = "Solid · pill"
    is_white_label: bool = False
    partner_name: str | None = None
    notes: str | None = None
    extra_config: Dict[str, Any] | None = None


class BrandProfileUpdate(BaseModel):
    name: str | None = None
    scope: str | None = None
    status: BrandStatus | None = None
    primary_color: str | None = None
    ink_color: str | None = None
    surface_color: str | None = None
    bg_color: str | None = None
    success_color: str | None = None
    display_font: str | None = None
    text_font: str | None = None
    corner_radius: str | None = None
    button_style: str | None = None
    partner_name: str | None = None
    notes: str | None = None
    extra_config: Dict[str, Any] | None = None


class BrandProfileResponse(BaseModel):
    id: str
    brand_ref: str
    name: str
    scope: str | None
    status: BrandStatus
    primary_color: str | None
    ink_color: str | None
    surface_color: str | None
    bg_color: str | None
    success_color: str | None
    display_font: str | None
    text_font: str | None
    corner_radius: str | None
    button_style: str | None
    is_white_label: bool
    partner_name: str | None
    published_at: datetime | None
    notes: str | None
    extra_config: Dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BrandProfileListResponse(BaseModel):
    items: List[BrandProfileResponse]
    total: int


# ── Brand Asset ───────────────────────────────────────────────────────────────

class BrandAssetCreate(BaseModel):
    asset_type: str
    name: str
    format: str | None = None
    used_in: str | None = None
    version: str | None = "v1"
    file_url: str | None = None
    file_size_kb: str | None = None
    status: AssetStatus = AssetStatus.draft


class BrandAssetUpdate(BaseModel):
    name: str | None = None
    version: str | None = None
    file_url: str | None = None
    file_size_kb: str | None = None
    status: AssetStatus | None = None


class BrandAssetResponse(BaseModel):
    id: str
    profile_id: str
    asset_type: str
    name: str
    format: str | None
    used_in: str | None
    version: str | None
    file_url: str | None
    file_size_kb: str | None
    status: AssetStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Touchpoint ────────────────────────────────────────────────────────────────

class TouchpointCreate(BaseModel):
    name: str
    description: str | None = None
    coverage: str | None = None
    icon: str | None = None
    status: TouchpointStatus = TouchpointStatus.disabled


class TouchpointUpdate(BaseModel):
    coverage: str | None = None
    status: TouchpointStatus | None = None


class TouchpointResponse(BaseModel):
    id: str
    profile_id: str
    name: str
    description: str | None
    coverage: str | None
    icon: str | None
    status: TouchpointStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Publish ───────────────────────────────────────────────────────────────────

class PublishRequest(BaseModel):
    target: str = "staging"  # staging | live
    notes: str | None = None
