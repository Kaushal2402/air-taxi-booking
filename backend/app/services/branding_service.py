from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.branding import BrandAsset, BrandProfile, BrandStatus, BrandTouchpoint


# ── Brand Profiles ─────────────────────────────────────────────────────────────

async def list_profiles(db: AsyncSession, include_archived: bool = False) -> Dict[str, Any]:
    q = select(BrandProfile)
    if not include_archived:
        q = q.where(BrandProfile.status != BrandStatus.archived)
    q = q.order_by(BrandProfile.created_at.asc())
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    result = await db.execute(q)
    return {"items": result.scalars().all(), "total": total}


async def get_profile(db: AsyncSession, profile_id: str) -> BrandProfile:
    result = await db.execute(
        select(BrandProfile).where(BrandProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Brand profile not found")
    return profile


async def create_profile(db: AsyncSession, data: Dict[str, Any], admin_id: str) -> BrandProfile:
    # Check for duplicate brand_ref
    existing = await db.execute(
        select(BrandProfile).where(BrandProfile.brand_ref == data["brand_ref"])
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Brand ref already exists")
    profile = BrandProfile(**data, created_by=admin_id)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def update_profile(db: AsyncSession, profile_id: str, data: Dict[str, Any]) -> BrandProfile:
    profile = await get_profile(db, profile_id)
    for k, v in data.items():
        setattr(profile, k, v)
    await db.commit()
    await db.refresh(profile)
    return profile


async def publish_profile(db: AsyncSession, profile_id: str, target: str, admin_id: str) -> BrandProfile:
    profile = await get_profile(db, profile_id)
    if target == "live":
        profile.status = BrandStatus.live
        profile.published_at = datetime.utcnow()
        profile.published_by = admin_id
    else:
        profile.status = BrandStatus.review
    await db.commit()
    await db.refresh(profile)
    return profile


async def delete_profile(db: AsyncSession, profile_id: str) -> None:
    profile = await get_profile(db, profile_id)
    if profile.status == BrandStatus.live:
        raise HTTPException(status_code=400, detail="Cannot delete a live brand profile")
    await db.delete(profile)
    await db.commit()


# ── Assets ────────────────────────────────────────────────────────────────────

async def list_assets(db: AsyncSession, profile_id: str) -> list:
    await get_profile(db, profile_id)
    result = await db.execute(
        select(BrandAsset).where(BrandAsset.profile_id == profile_id).order_by(BrandAsset.created_at.asc())
    )
    return result.scalars().all()


async def get_asset(db: AsyncSession, asset_id: str) -> BrandAsset:
    result = await db.execute(select(BrandAsset).where(BrandAsset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


async def create_asset(db: AsyncSession, profile_id: str, data: Dict[str, Any], admin_id: str) -> BrandAsset:
    await get_profile(db, profile_id)
    asset = BrandAsset(profile_id=profile_id, uploaded_by=admin_id, **data)
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


async def update_asset(db: AsyncSession, asset_id: str, data: Dict[str, Any]) -> BrandAsset:
    asset = await get_asset(db, asset_id)
    for k, v in data.items():
        setattr(asset, k, v)
    await db.commit()
    await db.refresh(asset)
    return asset


async def delete_asset(db: AsyncSession, asset_id: str) -> None:
    asset = await get_asset(db, asset_id)
    await db.delete(asset)
    await db.commit()


# ── Touchpoints ────────────────────────────────────────────────────────────────

async def list_touchpoints(db: AsyncSession, profile_id: str) -> list:
    await get_profile(db, profile_id)
    result = await db.execute(
        select(BrandTouchpoint).where(BrandTouchpoint.profile_id == profile_id).order_by(BrandTouchpoint.name.asc())
    )
    return result.scalars().all()


async def get_touchpoint(db: AsyncSession, tp_id: str) -> BrandTouchpoint:
    result = await db.execute(select(BrandTouchpoint).where(BrandTouchpoint.id == tp_id))
    tp = result.scalar_one_or_none()
    if not tp:
        raise HTTPException(status_code=404, detail="Touchpoint not found")
    return tp


async def create_touchpoint(db: AsyncSession, profile_id: str, data: Dict[str, Any]) -> BrandTouchpoint:
    await get_profile(db, profile_id)
    tp = BrandTouchpoint(profile_id=profile_id, **data)
    db.add(tp)
    await db.commit()
    await db.refresh(tp)
    return tp


async def update_touchpoint(db: AsyncSession, tp_id: str, data: Dict[str, Any]) -> BrandTouchpoint:
    tp = await get_touchpoint(db, tp_id)
    for k, v in data.items():
        setattr(tp, k, v)
    await db.commit()
    await db.refresh(tp)
    return tp
