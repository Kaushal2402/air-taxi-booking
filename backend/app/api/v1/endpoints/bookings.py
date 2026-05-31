from __future__ import annotations

import math
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.bookings import (
    AddNoteBody,
    AdminNoteResponse,
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
from app.services import bookings_service

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
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.create_assisted_booking(db, body, current_user.id)


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
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.cancel_booking(db, booking_id, body)


@road_bookings_router.post("/{booking_id}/reassign", response_model=RoadBookingDetail)
async def reassign_driver(
    booking_id: str,
    body: ReassignBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.reassign_driver(db, booking_id, body.driver_id, body.reason)


@road_bookings_router.post("/{booking_id}/adjust-fare", response_model=RoadBookingDetail)
async def adjust_fare(
    booking_id: str,
    body: AdjustFareBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.adjust_fare(db, booking_id, body.new_fare_minor, body.reason)


@road_bookings_router.post("/{booking_id}/refund", response_model=RoadBookingDetail)
async def process_refund(
    booking_id: str,
    body: RefundBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.process_refund(
        db, booking_id, body.amount_minor, body.destination, body.reason
    )


@road_bookings_router.post("/{booking_id}/dispute", response_model=DisputeResponse)
async def open_dispute(
    booking_id: str,
    body: OpenDisputeBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.open_dispute(db, booking_id, body.reason, body.note)


@road_bookings_router.post("/{booking_id}/dispute/resolve", response_model=DisputeResponse)
async def resolve_dispute(
    booking_id: str,
    body: ResolveDisputeBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.resolve_dispute(db, booking_id, body)


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
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.flag_booking(db, booking_id, body.flagged, body.flag_reason)


@road_bookings_router.get("/{booking_id}/telemetry")
async def get_telemetry(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await bookings_service.get_telemetry(db, booking_id)
