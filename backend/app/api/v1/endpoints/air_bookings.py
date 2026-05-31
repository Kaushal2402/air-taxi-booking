from __future__ import annotations

import math
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.air_bookings import (
    AddAirNoteBody,
    AdvanceAirStatusBody,
    AirBookingDetail,
    AirBookingListResponse,
    AirBookingNoteResponse,
    AirBookingStats,
    AssignOperatorBody,
    CancelAirBookingBody,
    CharterQuoteCreate,
    CharterQuoteResponse,
    FlagAirBookingBody,
    ManifestResponse,
    ManifestUpdateBody,
    QuotesListResponse,
    RefundAirBookingBody,
    RescheduleBody,
)
from app.services import air_bookings_service

air_bookings_router = APIRouter()


# ── Cancel preview (static — must be before /{booking_id}) ───────────────────

@air_bookings_router.get("/{booking_id}/cancel-preview")
async def cancel_preview(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """Return computed cancellation fee preview based on time-to-departure tier."""
    return await air_bookings_service.get_cancel_preview(db, booking_id)


# ── Collection ────────────────────────────────────────────────────────────────

@air_bookings_router.get("", response_model=AirBookingListResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    service_subtype: Optional[str] = Query(None),
    operator_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    flagged: Optional[bool] = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items, total, stats_dict = await air_bookings_service.list_bookings(
        db,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        service_subtype=service_subtype,
        operator_id=operator_id,
        date_from=date_from,
        date_to=date_to,
        flagged=flagged,
    )
    pages = math.ceil(total / page_size) if total > 0 else 1
    return AirBookingListResponse(
        items=items,
        total=total,
        page=page,
        pages=pages,
        stats=AirBookingStats(**stats_dict),
    )


# ── Single booking ────────────────────────────────────────────────────────────

@air_bookings_router.get("/{booking_id}", response_model=AirBookingDetail)
async def get_booking(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.get_booking(db, booking_id)


@air_bookings_router.post("/{booking_id}/assign-operator", response_model=AirBookingDetail)
async def assign_operator(
    booking_id: str,
    body: AssignOperatorBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.assign_operator(db, booking_id, body)


@air_bookings_router.post("/{booking_id}/cancel", response_model=AirBookingDetail)
async def cancel_booking(
    booking_id: str,
    body: CancelAirBookingBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.cancel_booking(db, booking_id, body)


@air_bookings_router.post("/{booking_id}/reschedule", response_model=AirBookingDetail)
async def reschedule_booking(
    booking_id: str,
    body: RescheduleBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.reschedule_booking(db, booking_id, body)


@air_bookings_router.post("/{booking_id}/refund", response_model=AirBookingDetail)
async def process_refund(
    booking_id: str,
    body: RefundAirBookingBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.process_refund(
        db, booking_id, body.amount_minor, body.destination, body.reason
    )


# ── Manifest ──────────────────────────────────────────────────────────────────

@air_bookings_router.get("/{booking_id}/manifest", response_model=ManifestResponse)
async def get_manifest(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.get_manifest(db, booking_id)


@air_bookings_router.patch("/{booking_id}/manifest", response_model=ManifestResponse)
async def update_manifest(
    booking_id: str,
    body: ManifestUpdateBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.update_manifest(db, booking_id, body.passengers)


@air_bookings_router.post("/{booking_id}/manifest/lock", response_model=ManifestResponse)
async def lock_manifest(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.lock_manifest(db, booking_id)


# ── Charter Quotes ────────────────────────────────────────────────────────────

@air_bookings_router.get("/{booking_id}/quotes", response_model=QuotesListResponse)
async def list_quotes(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.list_quotes(db, booking_id)


@air_bookings_router.post(
    "/{booking_id}/quotes", response_model=CharterQuoteResponse, status_code=201
)
async def create_quote(
    booking_id: str,
    body: CharterQuoteCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.create_quote(db, booking_id, body)


@air_bookings_router.post(
    "/{booking_id}/quotes/{quote_id}/push", response_model=AirBookingDetail
)
async def push_quote(
    booking_id: str,
    quote_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.push_quote(db, booking_id, quote_id)


@air_bookings_router.post(
    "/{booking_id}/quotes/{quote_id}/decline", response_model=CharterQuoteResponse
)
async def decline_quote(
    booking_id: str,
    quote_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.decline_quote(db, booking_id, quote_id)


# ── Notes ─────────────────────────────────────────────────────────────────────

@air_bookings_router.post("/{booking_id}/notes", response_model=AirBookingNoteResponse)
async def add_note(
    booking_id: str,
    body: AddAirNoteBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.add_note(db, booking_id, body.note)


# ── Advance status ────────────────────────────────────────────────────────────

@air_bookings_router.post("/{booking_id}/advance-status", response_model=AirBookingDetail)
async def advance_status(
    booking_id: str,
    body: AdvanceAirStatusBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """Manually advance booking status for ops workflow."""
    return await air_bookings_service.advance_status(db, booking_id, body.status, body.note)


# ── Flag ──────────────────────────────────────────────────────────────────────

@air_bookings_router.patch("/{booking_id}/flag", response_model=AirBookingDetail)
async def flag_booking(
    booking_id: str,
    body: FlagAirBookingBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.flag_booking(
        db, booking_id, body.flagged, body.flag_reason
    )
