from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.air_bookings import (
    AddNoteRequest,
    AddQuoteRequest,
    AdvanceStatusRequest,
    AirBookingDetail,
    AirBookingListResponse,
    AirBookingNoteResponse,
    AssignOperatorRequest,
    CancelPreviewResponse,
    CancelRequest,
    CharterQuote,
    CreateAirBookingRequest,
    FlagRequest,
    ManifestResponse,
    ManifestUpdateRequest,
    QuotesListResponse,
    RefundRequest,
    RescheduleRequest,
)
from app.services import audit_service, air_bookings_service

router = APIRouter()


# ── Create (Assisted booking) ─────────────────────────────────────────────────

@router.post("", response_model=AirBookingDetail, status_code=201)
async def create_air_booking(
    body: CreateAirBookingRequest,
    request: Request,
    db=Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user),
) -> AirBookingDetail:
    result = await air_bookings_service.create_air_booking(db, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="air_booking.created",
            target=f"air_booking:{result.id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=AirBookingListResponse)
async def list_air_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    status: str | None = Query(None),
    service_subtype: str | None = Query(None),
    operator_id: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    flagged: bool | None = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.list_air_bookings(
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


# ── Detail ────────────────────────────────────────────────────────────────────

@router.get("/{booking_id}", response_model=AirBookingDetail)
async def get_air_booking(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.get_air_booking(db, booking_id)


# ── Assign operator ───────────────────────────────────────────────────────────

@router.post("/{booking_id}/assign-operator", response_model=AirBookingDetail)
async def assign_operator(
    booking_id: str,
    body: AssignOperatorRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await air_bookings_service.assign_operator(db, booking_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="air_booking.operator_assigned",
            target=f"air_booking:{booking_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(),
        )
    except Exception:
        pass
    return result


# ── Cancel preview ────────────────────────────────────────────────────────────

@router.get("/{booking_id}/cancel-preview", response_model=CancelPreviewResponse)
async def cancel_preview(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.cancel_preview(db, booking_id)


# ── Cancel ────────────────────────────────────────────────────────────────────

@router.post("/{booking_id}/cancel", response_model=AirBookingDetail)
async def cancel_booking(
    booking_id: str,
    body: CancelRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await air_bookings_service.cancel_booking(db, booking_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="air_booking.cancelled",
            target=f"air_booking:{booking_id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(exclude_unset=True),
        )
    except Exception:
        pass
    return result


# ── Reschedule ────────────────────────────────────────────────────────────────

@router.post("/{booking_id}/reschedule", response_model=AirBookingDetail)
async def reschedule_booking(
    booking_id: str,
    body: RescheduleRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await air_bookings_service.reschedule_booking(db, booking_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="air_booking.rescheduled",
            target=f"air_booking:{booking_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(exclude_unset=True),
        )
    except Exception:
        pass
    return result


# ── Refund ────────────────────────────────────────────────────────────────────

@router.post("/{booking_id}/refund", response_model=AirBookingDetail)
async def process_refund(
    booking_id: str,
    body: RefundRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await air_bookings_service.process_refund(db, booking_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="air_booking.refunded",
            target=f"air_booking:{booking_id}",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(exclude_unset=True),
        )
    except Exception:
        pass
    return result


# ── Manifest ──────────────────────────────────────────────────────────────────

@router.get("/{booking_id}/manifest", response_model=ManifestResponse)
async def get_manifest(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.get_manifest(db, booking_id)


@router.patch("/{booking_id}/manifest", response_model=ManifestResponse)
async def update_manifest(
    booking_id: str,
    body: ManifestUpdateRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.update_manifest(db, booking_id, body)


@router.post("/{booking_id}/manifest/lock", response_model=ManifestResponse)
async def lock_manifest(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.lock_manifest(db, booking_id)


# ── Quotes ────────────────────────────────────────────────────────────────────

@router.get("/{booking_id}/quotes", response_model=QuotesListResponse)
async def list_quotes(
    booking_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.list_quotes(db, booking_id)


@router.post("/{booking_id}/quotes", response_model=CharterQuote, status_code=201)
async def add_quote(
    booking_id: str,
    body: AddQuoteRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.add_quote(db, booking_id, body)


@router.post("/{booking_id}/quotes/{quote_id}/push", response_model=AirBookingDetail)
async def push_quote(
    booking_id: str,
    quote_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.push_quote(db, booking_id, quote_id)


@router.post("/{booking_id}/quotes/{quote_id}/decline", response_model=CharterQuote)
async def decline_quote(
    booking_id: str,
    quote_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.decline_quote(db, booking_id, quote_id)


# ── Notes ─────────────────────────────────────────────────────────────────────

@router.post("/{booking_id}/notes", response_model=AirBookingNoteResponse, status_code=201)
async def add_note(
    booking_id: str,
    body: AddNoteRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.add_note(db, booking_id, body)


# ── Advance status ────────────────────────────────────────────────────────────

@router.post("/{booking_id}/advance-status", response_model=AirBookingDetail)
async def advance_status(
    booking_id: str,
    body: AdvanceStatusRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await air_bookings_service.advance_status(db, booking_id, body)


# ── Flag ──────────────────────────────────────────────────────────────────────

@router.patch("/{booking_id}/flag", response_model=AirBookingDetail)
async def flag_booking(
    booking_id: str,
    body: FlagRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await air_bookings_service.flag_booking(db, booking_id, body)
    try:
        flagged = getattr(body, "flagged", True)
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="air_booking.flagged" if flagged else "air_booking.unflagged",
            target=f"air_booking:{booking_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(exclude_unset=True),
        )
    except Exception:
        pass
    return result
