from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, Request
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
    SlaMonitorResponse,
    SurgeOverrideListItem,
    SurgeOverrideRequest,
    SurgeOverrideResponse,
    SupplyResponse,
)
from app.services import audit_service, dispatch_service

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


@router.get("/sla-monitor", response_model=SlaMonitorResponse)
async def get_sla_monitor(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all live bookings (Accepted / Arrived / InProgress) that are
    breaching or approaching the configured SLA alert timers:
      - Pickup alert  (sla_pickup_alert_min)  → Accepted / Arrived bookings
      - Overrun alert (sla_trip_overrun_alert_min) → InProgress bookings
    """
    return await dispatch_service.get_sla_monitor(db)


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
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await dispatch_service.assign_driver(db, booking_id, body.driver_id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="dispatch.driver_assigned",
            target=f"booking:{booking_id} driver:{body.driver_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"driver_id": body.driver_id, "reason": body.reason},
        )
    except Exception:
        pass
    return result


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
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await dispatch_service.resolve_exception(
        db, exception_id, body.action_taken, body.resolved_by_driver_id
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="dispatch.exception_resolved",
            target=f"dispatch_exception:{exception_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"action_taken": body.action_taken},
        )
    except Exception:
        pass
    return result


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
    request: Request,
    admin_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await dispatch_service.create_surge_override(
        db,
        zone_id=body.zone_id,
        zone_name=body.zone_name,
        multiplier=body.multiplier,
        reason=body.reason,
        expires_in_minutes=body.expires_in_minutes,
        applies_to=body.applies_to,
        admin_user_id=admin_user.id,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=admin_user.email,
            actor_role=admin_user.role if hasattr(admin_user, "role") else "Admin",
            action="dispatch.surge_override_created",
            target=f"zone:{body.zone_id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"multiplier": body.multiplier, "zone_name": body.zone_name, "reason": body.reason},
        )
    except Exception:
        pass
    return result


@router.get("/surge/overrides", response_model=List[SurgeOverrideListItem])
async def get_surge_overrides(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await dispatch_service.get_surge_overrides(db, limit, offset)
