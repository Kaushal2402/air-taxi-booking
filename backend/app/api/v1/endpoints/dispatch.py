from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.dispatch import (
    AssignDriverRequest,
    AssignDriverResponse,
    EligibleDriversResponse,
    ExceptionsListResponse,
    ExpandRadiusResponse,
    QueueItemResponse,
    QueueStatsResponse,
    ResolveExceptionRequest,
    ResolveExceptionResponse,
    SurgeOverrideListItem,
    SurgeOverrideRequest,
    SurgeOverrideResponse,
    SupplyResponse,
)
from app.services import dispatch_service

router = APIRouter()


# ── Queue ─────────────────────────────────────────────────────────────────────

@router.get("/queue", response_model=List[QueueItemResponse])
async def get_dispatch_queue(
    zone_id: str | None = Query(None),
    sla_filter: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.get_queue(db, zone_id, sla_filter, limit)


@router.get("/queue/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.get_queue_stats(db)


# ── Eligible Drivers ──────────────────────────────────────────────────────────

@router.get("/requests/{booking_id}/eligible-drivers", response_model=EligibleDriversResponse)
async def get_eligible_drivers(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.get_eligible_drivers(db, booking_id)


# ── Assign Driver ─────────────────────────────────────────────────────────────

@router.post("/requests/{booking_id}/assign", response_model=AssignDriverResponse)
async def assign_driver(
    booking_id: str,
    body: AssignDriverRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.assign_driver(db, booking_id, body.driver_id, body.reason)


# ── Expand Radius ─────────────────────────────────────────────────────────────

@router.post("/requests/{booking_id}/expand-radius", response_model=ExpandRadiusResponse)
async def expand_radius(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await dispatch_service.expand_radius(db, booking_id)
    return ExpandRadiusResponse(**result)


# ── Exceptions ────────────────────────────────────────────────────────────────

@router.get("/exceptions", response_model=ExceptionsListResponse)
async def get_exceptions(
    zone_id: str | None = Query(None),
    severity: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.get_exceptions(db, zone_id, severity, limit)


@router.post("/exceptions/{exception_id}/resolve", response_model=ResolveExceptionResponse)
async def resolve_exception(
    exception_id: str,
    body: ResolveExceptionRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.resolve_exception(
        db, exception_id, body.action_taken, body.resolved_by_driver_id
    )


# ── Supply ────────────────────────────────────────────────────────────────────

@router.get("/supply", response_model=SupplyResponse)
async def get_supply(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.get_supply(db)


# ── Surge Override ────────────────────────────────────────────────────────────

@router.post("/surge/override", response_model=SurgeOverrideResponse, status_code=201)
async def create_surge_override(
    body: SurgeOverrideRequest,
    admin_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.create_surge_override(
        db,
        zone_id=body.zone_id,
        zone_name=body.zone_name,
        multiplier=body.multiplier,
        reason=body.reason,
        expires_in_minutes=body.expires_in_minutes,
        applies_to=body.applies_to,
        admin_user_id=admin_user.id,
    )


@router.get("/surge/overrides", response_model=List[SurgeOverrideListItem])
async def get_surge_overrides(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.get_surge_overrides(db, limit, offset)
