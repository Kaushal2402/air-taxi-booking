from __future__ import annotations

import math
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.bookings import (
    AddNoteBody,
    AdminNoteResponse,
    AdvanceStatusBody,
    AdjustFareBody,
    AssistedBookingCreate,
    BookingListResponse,
    BookingStats,
    CancelBookingBody,
    DisputeListResponse,
    DisputeResponse,
    FlagBookingBody,
    OpenDisputeBody,
    ReassignBody,
    RefundBody,
    ResolveDisputeBody,
    RoadBookingDetail,
    RoadBookingListItem,
)
from app.services import audit_service, bookings_service

road_bookings_router = APIRouter()


# ── Static routes BEFORE /{booking_id} ───────────────────────────────────────

@road_bookings_router.get("/disputes", response_model=DisputeListResponse)
async def list_disputes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items, total = await bookings_service.list_disputes(
        db, page=page, page_size=page_size, search=search, stage=stage, priority=priority
    )
    pages = math.ceil(total / page_size) if total > 0 else 1
    return DisputeListResponse(items=items, total=total, page=page, pages=pages)


# ── Cancel preview (static, must be before /{booking_id}) ────────────────────

@road_bookings_router.get("/{booking_id}/cancel-preview")
async def cancel_preview(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """Return computed cancellation fee preview based on platform settings."""
    return await bookings_service.get_cancel_preview(db, booking_id)


# ── Collection ────────────────────────────────────────────────────────────────

@road_bookings_router.get("", response_model=BookingListResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    service_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    flagged: Optional[bool] = Query(None),
    payment_method: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items, total, stats_dict = await bookings_service.list_bookings(
        db,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        service_type=service_type,
        date_from=date_from,
        date_to=date_to,
        flagged=flagged,
        payment_method=payment_method,
        customer_id=customer_id,
    )
    pages = math.ceil(total / page_size) if total > 0 else 1
    return BookingListResponse(
        items=items,
        total=total,
        page=page,
        pages=pages,
        stats=BookingStats(**stats_dict),
    )


@road_bookings_router.post("", response_model=RoadBookingDetail, status_code=201)
async def create_booking(
    body: AssistedBookingCreate,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.create_assisted_booking(db, body, current_user.id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.created",
            target=f"booking:{result.id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── Single booking ────────────────────────────────────────────────────────────

@road_bookings_router.get("/{booking_id}", response_model=RoadBookingDetail)
async def get_booking(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.get_booking(db, booking_id)


@road_bookings_router.post("/{booking_id}/cancel", response_model=RoadBookingDetail)
async def cancel_booking(
    booking_id: str,
    body: CancelBookingBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.cancel_booking(db, booking_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.cancelled",
            target=f"booking:{booking_id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"reason": getattr(body, "reason", None)},
        )
    except Exception:
        pass
    return result


@road_bookings_router.post("/{booking_id}/reassign", response_model=RoadBookingDetail)
async def reassign_driver(
    booking_id: str,
    body: ReassignBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.reassign_driver(db, booking_id, body.driver_id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.driver_reassigned",
            target=f"booking:{booking_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"driver_id": body.driver_id, "reason": body.reason},
        )
    except Exception:
        pass
    return result


@road_bookings_router.post("/{booking_id}/adjust-fare", response_model=RoadBookingDetail)
async def adjust_fare(
    booking_id: str,
    body: AdjustFareBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.adjust_fare(db, booking_id, body.new_fare_minor, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.fare_adjusted",
            target=f"booking:{booking_id}",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"new_fare_minor": body.new_fare_minor, "reason": body.reason},
        )
    except Exception:
        pass
    return result


@road_bookings_router.post("/{booking_id}/refund", response_model=RoadBookingDetail)
async def process_refund(
    booking_id: str,
    body: RefundBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.process_refund(
        db, booking_id, body.amount_minor, body.destination, body.reason
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.refunded",
            target=f"booking:{booking_id}",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"amount_minor": body.amount_minor, "destination": body.destination, "reason": body.reason},
        )
    except Exception:
        pass
    return result


@road_bookings_router.post("/{booking_id}/dispute", response_model=DisputeResponse)
async def open_dispute(
    booking_id: str,
    body: OpenDisputeBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.open_dispute(db, booking_id, body.reason, body.note)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.dispute_opened",
            target=f"booking:{booking_id}",
            category="Support",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"reason": body.reason},
        )
    except Exception:
        pass
    return result


@road_bookings_router.post("/{booking_id}/dispute/resolve", response_model=DisputeResponse)
async def resolve_dispute(
    booking_id: str,
    body: ResolveDisputeBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.resolve_dispute(db, booking_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.dispute_resolved",
            target=f"booking:{booking_id}",
            category="Support",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(exclude_unset=True),
        )
    except Exception:
        pass
    return result


@road_bookings_router.post("/{booking_id}/notes", response_model=AdminNoteResponse)
async def add_note(
    booking_id: str,
    body: AddNoteBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.add_note(db, booking_id, body.note)


@road_bookings_router.patch("/{booking_id}/flag", response_model=RoadBookingDetail)
async def flag_booking(
    booking_id: str,
    body: FlagBookingBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await bookings_service.flag_booking(db, booking_id, body.flagged, body.flag_reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.flagged" if body.flagged else "booking.unflagged",
            target=f"booking:{booking_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"flagged": body.flagged, "reason": body.flag_reason},
        )
    except Exception:
        pass
    return result


@road_bookings_router.get("/{booking_id}/telemetry")
async def get_telemetry(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.get_telemetry(db, booking_id)


@road_bookings_router.post("/{booking_id}/advance-status", response_model=RoadBookingDetail)
async def advance_status(
    booking_id: str,
    body: AdvanceStatusBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """Manually advance booking status for ops workflow."""
    result = await bookings_service.advance_status(db, booking_id, body.status, body.note)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="booking.status_advanced",
            target=f"booking:{booking_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"status": body.status, "note": body.note},
        )
    except Exception:
        pass
    return result
