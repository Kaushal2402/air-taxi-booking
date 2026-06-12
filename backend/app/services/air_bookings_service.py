from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.settings import PlatformSettings
from app.core.currency import fmt_minor
from app.services.settings_service import get_toggle, get_settings, is_in_quiet_window, is_kill_switch_active, get_active_maintenance_window
from app.services import driver_suspension_service, customer_service
from app.models.air_booking import (
    AirBooking,
    AirBookingNote,
    AirBookingPassenger,
    AirBookingTimeline,
    CharterQuote,
)
from app.schemas.air_bookings import (
    AddNoteRequest,
    AddQuoteRequest,
    AdvanceStatusRequest,
    AirBookingDetail,
    AirBookingListItem,
    AirBookingListResponse,
    AirBookingNoteResponse,
    AirBookingStats,
    AirBookingTimelineEvent,
    AssignOperatorRequest,
    CancelPreviewResponse,
    CancelTierInfo,
    CancelRequest,
    CharterQuote as CharterQuoteSchema,
    FlagRequest,
    ManifestPassenger,
    ManifestResponse,
    ManifestUpdateRequest,
    CreateAirBookingRequest,
    QuoteRequestRequest,
    QuotesListResponse,
    RefundRequest,
    RescheduleRequest,
)

# ── Status transition map ─────────────────────────────────────────────────────

VALID_TRANSITIONS: dict[str, str] = {
    "Requested": "Confirmed",
    "Quote shared": "Confirmed",
    "Confirmed": "Manifest locked",
    "Manifest locked": "Boarding",
    "Boarding": "Departed",
    "Departed": "Arrived",
    "Arrived": "Completed",
}


# ── Cancellation fee tiers ────────────────────────────────────────────────────

def _cancel_fee_pct(hours_to_etd: float, base_fee_pct: float = 10.0) -> tuple[str, int]:
    """
    Tiered fee scaled from the platform base cancellation fee.
    Tiers: >48h → 0%, 24-48h → 25% of base, 4-24h → 50% of base, <4h → 100% of base.
    """
    if hours_to_etd > 48:
        return ">48h", 0
    elif hours_to_etd > 24:
        return "24-48h", round(base_fee_pct * 0.25)
    elif hours_to_etd > 4:
        return "4-24h", round(base_fee_pct * 0.5)
    else:
        return "<4h", round(base_fee_pct)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _quote_total(q: CharterQuote) -> int:
    return (
        q.base_fare_minor
        + q.positioning_minor
        + q.night_halt_minor
        + q.catering_minor
        + q.fuel_surcharge_minor
        + q.taxes_minor
    )


def _booking_to_list_item(b: AirBooking) -> AirBookingListItem:
    return AirBookingListItem.model_validate(b)


def _booking_to_detail(b: AirBooking) -> AirBookingDetail:
    data = {
        "id": b.id,
        "booking_ref": b.booking_ref,
        "customer_id": b.customer_id,
        "customer_name": b.customer_name,
        "customer_phone": b.customer_phone,
        "operator_id": b.operator_id,
        "operator_name": b.operator_name,
        "aircraft_id": b.aircraft_id,
        "aircraft_registration": b.aircraft_registration,
        "service_subtype": b.service_subtype,
        "service_label": b.service_label,
        "route_from": b.route_from,
        "route_to": b.route_to,
        "pax_count": b.pax_count,
        "etd": b.etd,
        "scheduled_date": b.scheduled_date,
        "status": b.status,
        "fare_estimate_minor": b.fare_estimate_minor,
        "fare_final_minor": b.fare_final_minor,
        "payment_method": b.payment_method,
        "flagged": b.flagged,
        "flag_reason": b.flag_reason,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
        "eta": b.eta,
        "distance_nm": b.distance_nm,
        "flight_time_min": b.flight_time_min,
        "fuel_weight_kg": b.fuel_weight_kg,
        "notes": b.notes,
        "internal_reason": b.internal_reason,
        "reschedule_ref": b.reschedule_ref,
        "manifest_locked": b.manifest_locked,
        "manifest_locked_at": b.manifest_locked_at,
        "operator_otp_pct": b.operator_otp_pct,
        "operator_fleet_count": b.operator_fleet_count,
        "aircraft_model": b.aircraft_model,
        "aircraft_seats": b.aircraft_seats,
        "aircraft_mtow_kg": b.aircraft_mtow_kg,
        "aircraft_airworthy_until": b.aircraft_airworthy_until,
        "pilot_name": b.pilot_name,
        "pilot_license": b.pilot_license,
        "copilot_name": b.copilot_name,
        "timeline": [
            AirBookingTimelineEvent.model_validate(t) for t in (b.timeline or [])
        ],
        "admin_notes": [
            AirBookingNoteResponse.model_validate(n) for n in (b.admin_notes or [])
        ],
    }
    return AirBookingDetail(**data)


async def _load_booking(db: AsyncSession, booking_id: str) -> AirBooking:
    result = await db.execute(
        select(AirBooking)
        .options(
            selectinload(AirBooking.timeline),
            selectinload(AirBooking.admin_notes),
            selectinload(AirBooking.passengers),
            selectinload(AirBooking.quotes),
        )
        .where(AirBooking.id == booking_id)
    )
    booking = result.unique().scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Air booking not found")
    return booking


def _add_timeline(db: AsyncSession, booking: AirBooking, event: str, message: str | None, tone: str) -> None:
    tl = AirBookingTimeline(
        id=str(uuid.uuid4()),
        booking_id=booking.id,
        event=event,
        message=message,
        tone=tone,
    )
    db.add(tl)


def _manifest_response(booking: AirBooking, passengers: list[AirBookingPassenger]) -> ManifestResponse:
    total_pax = sum(p.body_weight_kg for p in passengers)
    total_bag = sum(p.baggage_weight_kg for p in passengers)
    mtow = booking.aircraft_mtow_kg
    fuel = booking.fuel_weight_kg or 0.0
    # Rough: assume empty weight not stored, so we compute available total only
    total_weight = total_pax + total_bag + fuel
    utilization = None
    within_limits = None
    if mtow and mtow > 0:
        utilization = round((total_weight / mtow) * 100, 1)
        within_limits = total_weight <= mtow

    return ManifestResponse(
        booking_id=booking.id,
        passengers=[ManifestPassenger.model_validate(p) for p in passengers],
        total_pax_weight_kg=total_pax,
        total_baggage_weight_kg=total_bag,
        aircraft_empty_weight_kg=None,
        fuel_weight_kg=fuel if fuel else None,
        total_weight_kg=total_weight if total_weight > 0 else None,
        mtow_kg=mtow,
        utilization_pct=utilization,
        is_within_limits=within_limits,
        is_locked=booking.manifest_locked,
    )


# ── Service methods ───────────────────────────────────────────────────────────

async def list_air_bookings(
    db: AsyncSession,
    page: int,
    page_size: int,
    search: str | None,
    status: str | None,
    service_subtype: str | None,
    operator_id: str | None,
    date_from: str | None,
    date_to: str | None,
    flagged: bool | None,
    customer_id: str | None = None,
) -> AirBookingListResponse:
    filters: list[Any] = []

    if search:
        like = f"%{search}%"
        filters.append(
            or_(
                AirBooking.booking_ref.ilike(like),
                AirBooking.customer_name.ilike(like),
                AirBooking.route_from.ilike(like),
                AirBooking.route_to.ilike(like),
            )
        )
    if status:
        statuses = [s.strip() for s in status.split(",")]
        filters.append(AirBooking.status.in_(statuses))
    if service_subtype:
        filters.append(AirBooking.service_subtype == service_subtype)
    if operator_id:
        filters.append(AirBooking.operator_id == operator_id)
    if date_from:
        filters.append(AirBooking.etd >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(AirBooking.etd <= datetime.fromisoformat(date_to))
    if flagged is not None:
        filters.append(AirBooking.flagged == flagged)
    if customer_id:
        filters.append(AirBooking.customer_id == customer_id)

    where_clause = and_(*filters) if filters else true()

    count_result = await db.execute(
        select(func.count(AirBooking.id)).where(where_clause)
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    rows_result = await db.execute(
        select(AirBooking)
        .where(where_clause)
        .order_by(AirBooking.etd.desc())
        .offset(offset)
        .limit(page_size)
    )
    bookings = rows_result.scalars().all()

    # Compute stats
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    in_air = await db.execute(
        select(func.count(AirBooking.id)).where(AirBooking.status.in_(["Departed", "Boarding"]))
    )
    quote_pending = await db.execute(
        select(func.count(AirBooking.id)).where(AirBooking.status == "Quote shared")
    )
    manifest_open = await db.execute(
        select(func.count(AirBooking.id)).where(
            and_(AirBooking.status == "Confirmed", AirBooking.manifest_locked == False)
        )
    )
    cancelled_7d = await db.execute(
        select(func.count(AirBooking.id)).where(
            and_(AirBooking.status == "Cancelled", AirBooking.updated_at >= seven_days_ago)
        )
    )
    refund_q = await db.execute(
        select(func.count(AirBooking.id)).where(AirBooking.status == "Refunded")
    )
    gross_rev = await db.execute(
        select(func.coalesce(func.sum(AirBooking.fare_final_minor), 0)).where(
            AirBooking.status == "Completed"
        )
    )

    stats = AirBookingStats(
        in_air_count=in_air.scalar_one() or 0,
        quote_pending_count=quote_pending.scalar_one() or 0,
        manifest_open_count=manifest_open.scalar_one() or 0,
        cancelled_7d_count=cancelled_7d.scalar_one() or 0,
        refund_queue_count=refund_q.scalar_one() or 0,
        gross_revenue_minor=int(gross_rev.scalar_one() or 0),
    )

    return AirBookingListResponse(
        items=[_booking_to_list_item(b) for b in bookings],
        total=total,
        page=page,
        pages=math.ceil(total / page_size) if page_size else 1,
        stats=stats,
    )


async def get_air_booking(db: AsyncSession, booking_id: str) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)
    return _booking_to_detail(booking)


async def assign_operator(
    db: AsyncSession, booking_id: str, req: AssignOperatorRequest
) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)

    if req.aircraft_id:
        # Validate aircraft exists and is eligible
        from app.models.operator import Aircraft
        ac_row = await db.execute(
            select(Aircraft).where(Aircraft.id == req.aircraft_id)
        )
        aircraft = ac_row.scalar_one_or_none()
        if not aircraft:
            raise HTTPException(status_code=404, detail="Aircraft not found")

        if aircraft.status not in ("ready",):
            raise HTTPException(
                status_code=409,
                detail=f"Aircraft is not ready for assignment (status: '{aircraft.status}'). "
                       "Only 'ready' aircraft can be assigned to bookings.",
            )

        if aircraft.airworthiness_status == "expired":
            raise HTTPException(
                status_code=409,
                detail="Aircraft airworthiness certificate has expired. Renew before assigning.",
            )

        # Check maintenance window conflict with booking ETD
        etd = booking.etd
        if etd and aircraft.maintenance_windows:
            if etd.tzinfo is None:
                etd = etd.replace(tzinfo=timezone.utc)
            for window in aircraft.maintenance_windows:
                try:
                    w_start = datetime.fromisoformat(window["starts_at"])
                    w_end = datetime.fromisoformat(window["ends_at"])
                    if w_start.tzinfo is None:
                        w_start = w_start.replace(tzinfo=timezone.utc)
                    if w_end.tzinfo is None:
                        w_end = w_end.replace(tzinfo=timezone.utc)
                    if w_start <= etd <= w_end:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                f"Aircraft is scheduled for maintenance from "
                                f"{w_start.strftime('%Y-%m-%d %H:%M')} to "
                                f"{w_end.strftime('%Y-%m-%d %H:%M')} UTC. "
                                "Booking ETD falls within this window."
                            ),
                        )
                except (KeyError, ValueError):
                    continue  # malformed window entry — skip

        booking.aircraft_id = req.aircraft_id
        booking.aircraft_registration = aircraft.registration_mark
        booking.aircraft_seats = aircraft.seat_capacity
        booking.aircraft_mtow_kg = float(aircraft.mtow_kg) if aircraft.mtow_kg else None
        # Resolve model name from AircraftType catalog
        if aircraft.aircraft_type_id:
            from app.models.catalog import AircraftType
            at_row = await db.execute(select(AircraftType).where(AircraftType.id == aircraft.aircraft_type_id))
            at = at_row.scalar_one_or_none()
            booking.aircraft_model = at.name if at else aircraft.registration_mark
        else:
            booking.aircraft_model = aircraft.registration_mark
        # Airworthiness expiry — store snapshot at assignment time
        if aircraft.airworthiness_expiry:
            booking.aircraft_airworthy_until = datetime.combine(
                aircraft.airworthiness_expiry, datetime.min.time()
            ).replace(tzinfo=timezone.utc)

    booking.operator_id = req.operator_id

    # Denormalize operator name from Operator table
    from app.models.operator import Operator as OperatorModel
    op_row = await db.execute(select(OperatorModel).where(OperatorModel.id == req.operator_id))
    operator = op_row.scalar_one_or_none()
    if operator:
        booking.operator_name = operator.name

    _add_timeline(db, booking, "Operator assigned", req.note, "info")
    await db.commit()
    await db.refresh(booking)
    return await get_air_booking(db, booking_id)


async def cancel_preview(db: AsyncSession, booking_id: str) -> CancelPreviewResponse:
    result = await db.execute(select(AirBooking).where(AirBooking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Air booking not found")

    platform = await get_settings(db)
    base_fee_pct: float = platform.cancellation_fee_pct if platform.cancellation_fee_pct is not None else 10.0
    free_window_min: int = platform.cancellation_free_window_min if platform.cancellation_free_window_min is not None else 5

    now = datetime.now(timezone.utc)
    etd = booking.etd
    if etd.tzinfo is None:
        etd = etd.replace(tzinfo=timezone.utc)
    delta_hours = (etd - now).total_seconds() / 3600

    # Free window: if booking was created very recently, no fee
    created = booking.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    elapsed_min = (now - created).total_seconds() / 60
    is_free_window = elapsed_min <= free_window_min

    tier, fee_pct = _cancel_fee_pct(delta_hours, base_fee_pct)
    if is_free_window:
        tier, fee_pct = "free_window", 0

    fare = booking.fare_estimate_minor
    cancel_fee = 0 if fee_pct == 0 else int(fare * fee_pct / 100)
    net_refund = fare - cancel_fee

    all_tiers = [
        CancelTierInfo(label=">48h", fee_pct=0),
        CancelTierInfo(label="24-48h", fee_pct=round(base_fee_pct * 0.25)),
        CancelTierInfo(label="4-24h", fee_pct=round(base_fee_pct * 0.5)),
        CancelTierInfo(label="<4h", fee_pct=round(base_fee_pct)),
    ]

    return CancelPreviewResponse(
        booking_id=booking.id,
        fare_minor=fare,
        tier=tier,
        fee_pct=fee_pct,
        cancel_fee_minor=cancel_fee,
        net_refund_minor=net_refund,
        hours_to_etd=round(max(delta_hours, 0), 2),
        is_force_majeure_eligible=delta_hours < 48,
        all_tiers=all_tiers,
    )


async def cancel_booking(
    db: AsyncSession, booking_id: str, req: CancelRequest
) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)
    if booking.status in ("Cancelled", "Refunded", "Completed"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel booking in status '{booking.status}'")

    platform = await get_settings(db)

    # Enforce max cancellations per day per customer
    if booking.customer_id:
        max_per_day: int = platform.max_cancellations_per_day if platform.max_cancellations_per_day is not None else 3
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        cancelled_today: int = (
            await db.execute(
                select(func.count(AirBooking.id)).where(
                    and_(
                        AirBooking.customer_id == booking.customer_id,
                        AirBooking.status == "Cancelled",
                        AirBooking.updated_at >= today_start,
                    )
                )
            )
        ).scalar_one()
        if cancelled_today >= max_per_day:
            raise HTTPException(
                status_code=422,
                detail=f"Customer has already cancelled {cancelled_today} booking(s) today "
                       f"(limit: {max_per_day}). Contact support to override.",
            )

    # Fall back to platform default refund destination if not specified
    refund_dest = req.refund_destination
    if not refund_dest:
        refund_dest = platform.refund_destination_default or "original"

    booking.status = "Cancelled"
    booking.internal_reason = req.reason
    note_text = f"Cancelled: {req.reason}"
    if req.note:
        note_text += f" | {req.note}"
    if req.force_majeure:
        note_text += " [Force majeure]"
    note_text += f" — Refund to: {refund_dest}"

    # Record no-show wait policy in timeline when reason indicates no-show
    is_no_show = req.reason and "no-show" in req.reason.lower()
    if is_no_show:
        no_show_wait: int = platform.no_show_wait_minutes if platform.no_show_wait_minutes is not None else 5
        note_text += f" — No-show wait enforced: {no_show_wait}min"

    _add_timeline(db, booking, "Booking cancelled", note_text, "danger")

    # Post refund to payments ledger
    try:
        from app.models.payment import Payment, PaymentStatus
        preview_result = await cancel_preview(db, booking_id)
        refund_amount = booking.fare_estimate_minor if req.force_majeure else preview_result.net_refund_minor
        if refund_amount and refund_amount > 0:
            db.add(Payment(
                id=str(uuid.uuid4()),
                booking_id=booking_id,
                customer_id=booking.customer_id or "",
                customer_name=booking.customer_name or "",
                booking_ref=booking.booking_ref,
                service=f"Air · {booking.service_label or booking.service_subtype} · refund",
                method=booking.payment_method or "original",
                gross_amount=-refund_amount,
                gateway_fee=0,
                net_amount=-refund_amount,
                status=PaymentStatus.completed,
            ))
    except Exception:
        pass  # ledger posting is non-fatal

    # Notify customer of cancellation
    try:
        from app.services.notifications_service import send_event_notification
        if booking.customer_phone or booking.customer_email:
            await send_event_notification(
                db,
                "AIR_BOOKING_CANCELLED",
                {
                    "customer_name": booking.customer_name or "Customer",
                    "booking_ref": booking.booking_ref,
                    "route": f"{booking.route_from} → {booking.route_to}",
                    "reason": req.reason or "",
                },
                recipient_phone=booking.customer_phone,
                recipient_email=booking.customer_email,
                recipient_user_type="customer",
                recipient_user_id=booking.customer_id,
                notify_push=True, notify_sms=True, notify_email=True,
                reference=booking.booking_ref,
            )
    except Exception:
        pass  # notification is non-fatal

    await db.commit()
    return await get_air_booking(db, booking_id)


async def reschedule_booking(
    db: AsyncSession, booking_id: str, req: RescheduleRequest
) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)
    if booking.status in ("Cancelled", "Refunded", "Completed", "Departed", "Arrived"):
        raise HTTPException(status_code=400, detail=f"Cannot reschedule booking in status '{booking.status}'")

    old_etd = booking.etd
    booking.etd = req.new_etd
    booking.scheduled_date = req.new_etd.date().isoformat()
    booking.status = "Rescheduled"
    msg = f"ETD changed from {old_etd.isoformat()} to {req.new_etd.isoformat()}"
    if req.reason:
        msg += f" — {req.reason}"
    _add_timeline(db, booking, "Booking rescheduled", msg, "warn")
    await db.commit()
    return await get_air_booking(db, booking_id)


async def process_refund(
    db: AsyncSession, booking_id: str, req: RefundRequest
) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)

    # Fall back to platform default refund destination if not provided
    destination = req.destination
    if not destination:
        platform = await get_settings(db)
        destination = platform.refund_destination_default or "original"

    booking.status = "Refunded"
    msg = f"Refund of {req.amount_minor} minor units to {destination}"
    if req.reason:
        msg += f" — {req.reason}"
    _add_timeline(db, booking, "Refund processed", msg, "ok")

    # Post refund to payments ledger
    try:
        from app.models.payment import Payment, PaymentStatus
        if req.amount_minor and req.amount_minor > 0:
            db.add(Payment(
                id=str(uuid.uuid4()),
                booking_id=booking_id,
                customer_id=booking.customer_id or "",
                customer_name=booking.customer_name or "",
                booking_ref=booking.booking_ref,
                service=f"Air · {booking.service_label or booking.service_subtype} · refund",
                method=destination,
                gross_amount=-req.amount_minor,
                gateway_fee=0,
                net_amount=-req.amount_minor,
                status=PaymentStatus.completed,
            ))
    except Exception:
        pass

    # Notify customer of refund
    try:
        from app.services.notifications_service import send_event_notification
        if booking.customer_phone or booking.customer_email:
            await send_event_notification(
                db,
                "AIR_BOOKING_REFUNDED",
                {
                    "customer_name": booking.customer_name or "Customer",
                    "booking_ref": booking.booking_ref,
                    "amount": fmt_minor(req.amount_minor, platform.base_currency or "INR") if req.amount_minor else "—",
                    "destination": destination,
                },
                recipient_phone=booking.customer_phone,
                recipient_email=booking.customer_email,
                recipient_user_type="customer",
                recipient_user_id=booking.customer_id,
                notify_push=True, notify_sms=True, notify_email=True,
                reference=booking.booking_ref,
            )
    except Exception:
        pass

    await db.commit()
    return await get_air_booking(db, booking_id)


async def get_manifest(db: AsyncSession, booking_id: str) -> ManifestResponse:
    booking = await _load_booking(db, booking_id)
    passengers_result = await db.execute(
        select(AirBookingPassenger)
        .where(AirBookingPassenger.booking_id == booking_id)
        .order_by(AirBookingPassenger.seq)
    )
    passengers = list(passengers_result.scalars().all())
    return _manifest_response(booking, passengers)


async def update_manifest(
    db: AsyncSession, booking_id: str, req: ManifestUpdateRequest
) -> ManifestResponse:
    booking = await _load_booking(db, booking_id)
    if booking.manifest_locked:
        raise HTTPException(status_code=400, detail="Manifest is locked")

    # Delete existing passengers
    existing = await db.execute(
        select(AirBookingPassenger).where(AirBookingPassenger.booking_id == booking_id)
    )
    for p in existing.scalars().all():
        await db.delete(p)

    # Re-create
    new_passengers = []
    for idx, pax_in in enumerate(req.passengers, start=1):
        pax = AirBookingPassenger(
            id=pax_in.id if pax_in.id else str(uuid.uuid4()),
            booking_id=booking_id,
            seq=idx,
            name=pax_in.name,
            age=pax_in.age,
            id_number=pax_in.id_number,
            body_weight_kg=pax_in.body_weight_kg,
            baggage_weight_kg=pax_in.baggage_weight_kg,
            special_notes=pax_in.special_notes,
            is_minor=pax_in.is_minor,
        )
        db.add(pax)
        new_passengers.append(pax)

    booking.pax_count = len(new_passengers)
    _add_timeline(db, booking, "Manifest updated", f"{len(new_passengers)} passengers", "info")
    await db.commit()
    return _manifest_response(booking, new_passengers)


async def lock_manifest(db: AsyncSession, booking_id: str) -> ManifestResponse:
    booking = await _load_booking(db, booking_id)
    if booking.manifest_locked:
        raise HTTPException(status_code=400, detail="Manifest is already locked")

    booking.manifest_locked = True
    booking.manifest_locked_at = datetime.now(timezone.utc)
    booking.status = "Manifest locked"
    _add_timeline(db, booking, "Manifest locked", None, "ok")
    await db.commit()

    passengers_result = await db.execute(
        select(AirBookingPassenger)
        .where(AirBookingPassenger.booking_id == booking_id)
        .order_by(AirBookingPassenger.seq)
    )
    passengers = list(passengers_result.scalars().all())
    return _manifest_response(booking, passengers)


async def list_quotes(db: AsyncSession, booking_id: str) -> QuotesListResponse:
    # verify booking exists
    result = await db.execute(select(AirBooking.id).where(AirBooking.id == booking_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Air booking not found")

    quotes_result = await db.execute(
        select(CharterQuote)
        .where(CharterQuote.booking_id == booking_id)
        .order_by(CharterQuote.created_at.desc())
    )
    quotes = list(quotes_result.scalars().all())

    return QuotesListResponse(
        booking_id=booking_id,
        quotes=[
            CharterQuoteSchema(
                **{
                    **{c.key: getattr(q, c.key) for c in q.__table__.columns},
                    "total_minor": _quote_total(q),
                }
            )
            for q in quotes
        ],
    )


async def add_quote(
    db: AsyncSession, booking_id: str, req: AddQuoteRequest
) -> CharterQuoteSchema:
    # verify booking exists
    result = await db.execute(select(AirBooking).where(AirBooking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Air booking not found")

    q = CharterQuote(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        operator_id=req.operator_id,
        aircraft_id=req.aircraft_id,
        aircraft_registration=req.aircraft_registration,
        aircraft_model=req.aircraft_model,
        pax_capacity=req.pax_capacity,
        range_nm=req.range_nm,
        depart_icao=req.depart_icao,
        arrive_icao=req.arrive_icao,
        etd=req.etd,
        eta=req.eta,
        base_fare_minor=req.base_fare_minor,
        positioning_minor=req.positioning_minor,
        night_halt_minor=req.night_halt_minor,
        catering_minor=req.catering_minor,
        fuel_surcharge_minor=req.fuel_surcharge_minor,
        taxes_minor=req.taxes_minor,
        conditions=req.conditions,
        otp_30d_pct=req.otp_30d_pct,
        score=req.score,
        status="pending",
        is_recommended=False,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)

    return CharterQuoteSchema(
        **{c.key: getattr(q, c.key) for c in q.__table__.columns},
        total_minor=_quote_total(q),
    )


async def push_quote(
    db: AsyncSession, booking_id: str, quote_id: str
) -> AirBookingDetail:
    result = await db.execute(
        select(CharterQuote).where(
            and_(CharterQuote.id == quote_id, CharterQuote.booking_id == booking_id)
        )
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")

    q.status = "pushed"
    booking = await _load_booking(db, booking_id)
    booking.status = "Quote shared"
    _add_timeline(db, booking, "Quote pushed to customer", f"Quote {quote_id}", "info")
    await db.commit()
    return await get_air_booking(db, booking_id)


async def decline_quote(
    db: AsyncSession, booking_id: str, quote_id: str
) -> CharterQuoteSchema:
    result = await db.execute(
        select(CharterQuote).where(
            and_(CharterQuote.id == quote_id, CharterQuote.booking_id == booking_id)
        )
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")

    q.status = "declined"
    await db.commit()
    await db.refresh(q)
    return CharterQuoteSchema(
        **{c.key: getattr(q, c.key) for c in q.__table__.columns},
        total_minor=_quote_total(q),
    )


async def request_operator_quotes(
    db: AsyncSession, booking_id: str, req: QuoteRequestRequest
) -> AirBookingDetail:
    result = await db.execute(select(AirBooking).where(AirBooking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Air booking not found")
    if booking.status not in ("Requested", "Confirmed"):
        raise HTTPException(
            status_code=422,
            detail=f"Quote requests are only allowed on Requested/Confirmed bookings (current: {booking.status})",
        )
    operator_note = req.note or "Admin has requested a quote for this booking."
    target_desc = (
        f"Operators: {', '.join(req.operator_ids)}" if req.operator_ids else "all eligible operators"
    )
    _add_timeline(
        db,
        booking,
        f"Quote requested from {target_desc}",
        operator_note,
        "info",
    )

    # Notify operator(s) of quote request
    try:
        from app.services.notifications_service import send_event_notification
        from app.models.operator import Operator as OperatorModel
        op_ids = req.operator_ids or []
        if op_ids:
            op_rows = await db.execute(
                select(OperatorModel).where(OperatorModel.id.in_(op_ids))
            )
            operators = op_rows.scalars().all()
        else:
            # Notify all active operators
            op_rows = await db.execute(
                select(OperatorModel).where(OperatorModel.status == "active").limit(50)
            )
            operators = op_rows.scalars().all()

        for op in operators:
            contact_email = getattr(op, "contact_email", None)
            contact_phone = getattr(op, "contact_phone", None)
            if contact_email or contact_phone:
                await send_event_notification(
                    db,
                    "AIR_QUOTE_REQUESTED",
                    {
                        "operator_name": op.name,
                        "booking_ref": booking.booking_ref,
                        "route": f"{booking.route_from} → {booking.route_to}",
                        "pax": str(booking.pax_count),
                        "note": operator_note,
                    },
                    recipient_phone=contact_phone,
                    recipient_email=contact_email,
                    recipient_user_type="operator",
                    recipient_user_id=op.id,
                    notify_push=True, notify_sms=True, notify_email=True,
                    reference=booking.booking_ref,
                )
    except Exception:
        pass  # notification is non-fatal

    await db.commit()
    return await get_air_booking(db, booking_id)


async def add_note(
    db: AsyncSession, booking_id: str, req: AddNoteRequest
) -> AirBookingNoteResponse:
    result = await db.execute(select(AirBooking.id).where(AirBooking.id == booking_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Air booking not found")

    note = AirBookingNote(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        note=req.note,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return AirBookingNoteResponse.model_validate(note)


async def advance_status(
    db: AsyncSession, booking_id: str, req: AdvanceStatusRequest
) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)
    expected_next = VALID_TRANSITIONS.get(booking.status)
    if expected_next is None or req.status != expected_next:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot advance from '{booking.status}' to '{req.status}'. Expected next: '{expected_next}'",
        )

    driver_id_snapshot = getattr(booking, "driver_id", None)
    booking.status = req.status
    tone_map = {
        "Confirmed": "ok",
        "Manifest locked": "ok",
        "Boarding": "info",
        "Departed": "info",
        "Arrived": "ok",
        "Completed": "ok",
    }
    _add_timeline(
        db,
        booking,
        f"Status advanced to {req.status}",
        req.note,
        tone_map.get(req.status, "info"),
    )
    await db.commit()

    # ── Auto-suspension threshold enforcement ─────────────────────────────────
    if driver_id_snapshot and req.status in ("Completed", "Cancelled"):
        try:
            if req.status == "Completed":
                await driver_suspension_service.update_driver_metrics_on_completion(
                    db, driver_id_snapshot, driver_rating=None
                )
            else:
                await driver_suspension_service.update_driver_metrics_on_cancellation(
                    db, driver_id_snapshot
                )
            await driver_suspension_service.check_and_auto_suspend(db, driver_id_snapshot)
        except Exception:
            pass

    # ── Customer metrics ──────────────────────────────────────────────────────
    _b = await _load_booking(db, booking_id)
    if _b.customer_id:
        try:
            if req.status == "Completed":
                fare = _b.fare_final_minor or _b.fare_estimate_minor or 0
                await customer_service.update_customer_metrics_on_completion(
                    db, _b.customer_id, fare_minor=fare
                )
            elif req.status == "Cancelled":
                total_res = await db.execute(
                    select(func.count(AirBooking.id)).where(
                        AirBooking.customer_id == _b.customer_id
                    )
                )
                canc_res = await db.execute(
                    select(func.count(AirBooking.id)).where(
                        AirBooking.customer_id == _b.customer_id,
                        AirBooking.status == "Cancelled",
                    )
                )
                await customer_service.update_customer_metrics_on_cancellation(
                    db, _b.customer_id,
                    total_bookings=total_res.scalar_one() or 1,
                    total_cancellations=canc_res.scalar_one() or 0,
                )
        except Exception:
            pass

    return await get_air_booking(db, booking_id)


async def flag_booking(
    db: AsyncSession, booking_id: str, req: FlagRequest
) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)
    booking.flagged = req.flagged
    booking.flag_reason = req.flag_reason
    tone = "warn" if req.flagged else "info"
    msg = f"Flagged: {req.flag_reason}" if req.flagged else "Flag cleared"
    _add_timeline(db, booking, msg, None, tone)
    await db.commit()
    return await get_air_booking(db, booking_id)


async def create_air_booking(
    db: AsyncSession, req: CreateAirBookingRequest
) -> AirBookingDetail:
    import random, string
    suffix = ''.join(random.choices(string.digits, k=5))
    booking_ref = f"AC-A5-{suffix}"

    etd_dt = datetime.fromisoformat(req.etd.replace("Z", "+00:00"))

    # ── Kill switch enforcement ───────────────────────────────────────────────
    if await is_kill_switch_active(db, "new_bookings"):
        raise HTTPException(status_code=503, detail="New bookings are currently suspended. Please try again later.")
    if await is_kill_switch_active(db, "heli_air"):
        raise HTTPException(status_code=503, detail="Air / helicopter bookings are currently paused. Please try again later.")

    # ── Regional maintenance window enforcement ───────────────────────────────
    if req.region_name:
        mw = await get_active_maintenance_window(db, req.region_name)
        if mw:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Air bookings in '{req.region_name}' are paused due to a scheduled maintenance window "
                    f"({mw.starts_at.strftime('%H:%M')}–{mw.ends_at.strftime('%H:%M')} UTC). "
                    "Please try again later."
                ),
            )
    # Also check the global "Air · all" window
    air_mw = await get_active_maintenance_window(db, "Air · all")
    if air_mw:
        raise HTTPException(
            status_code=503,
            detail=(
                f"All air bookings are paused due to a platform-wide maintenance window "
                f"({air_mw.starts_at.strftime('%H:%M')}–{air_mw.ends_at.strftime('%H:%M')} UTC). "
                "Please try again later."
            ),
        )

    # ── Max simultaneous active rides per rider ───────────────────────────────
    if req.customer_id:
        _plat = await get_settings(db)
        max_active: int = _plat.max_active_bookings_per_rider if _plat.max_active_bookings_per_rider is not None else 2
        active_statuses = ["Requested", "Confirmed", "Manifest locked", "Boarding", "Departed", "Rescheduled"]
        active_count: int = (
            await db.execute(
                select(func.count(AirBooking.id)).where(
                    and_(
                        AirBooking.customer_id == req.customer_id,
                        AirBooking.status.in_(active_statuses),
                    )
                )
            )
        ).scalar_one()
        if active_count >= max_active:
            raise HTTPException(
                status_code=422,
                detail=f"Customer already has {active_count} active booking(s) "
                       f"(limit: {max_active}). Complete or cancel existing rides first.",
            )

    # Validate advance booking window from platform settings
    settings_result = await db.execute(select(PlatformSettings).limit(1))
    settings = settings_result.scalar_one_or_none()
    min_advance_hours: float = (
        settings.air_min_advance_hours
        if settings and settings.air_min_advance_hours is not None
        else 2.0
    )
    max_advance_days: int = (
        settings.max_advance_days
        if settings and settings.max_advance_days is not None
        else 7
    )
    now_utc = datetime.now(timezone.utc)
    hours_ahead = (etd_dt - now_utc).total_seconds() / 3600
    days_ahead = hours_ahead / 24
    if hours_ahead < min_advance_hours:
        raise HTTPException(
            status_code=400,
            detail=f"ETD must be at least {min_advance_hours:.0f} hour(s) in advance (currently {hours_ahead:.1f}h away).",
        )
    if days_ahead > max_advance_days:
        raise HTTPException(
            status_code=400,
            detail=f"ETD cannot be more than {max_advance_days} day(s) in advance (currently {days_ahead:.1f} days away).",
        )

    # ── Quiet hours enforcement ───────────────────────────────────────────────
    _qh_platform = await get_settings(db)
    if is_in_quiet_window(_qh_platform) and _qh_platform.quiet_hours_action == "pause_bookings":
        raise HTTPException(
            status_code=422,
            detail=(
                f"New bookings are paused during quiet hours "
                f"({_qh_platform.quiet_hours_start}–{_qh_platform.quiet_hours_end}). "
                "Please try again later."
            ),
        )

    # ── Toggle enforcement ────────────────────────────────────────────────────
    if req.payment_method == "cash" and not await get_toggle(db, "cash_payments"):
        raise HTTPException(status_code=422, detail="Cash payments are currently disabled on this platform.")

    # Resolve great-circle distance & estimated flight time via Google Maps geocoding (non-fatal)
    distance_nm: Any = None
    flight_time_min: Any = None
    try:
        from app.providers import get_maps_provider
        maps = get_maps_provider()
        origin_geo = await maps.geocode(req.route_from)
        dest_geo = await maps.geocode(req.route_to)
        # Haversine in nautical miles
        R_NM = 3440.065
        lat1 = math.radians(origin_geo.lat)
        lon1 = math.radians(origin_geo.lng)
        lat2 = math.radians(dest_geo.lat)
        lon2 = math.radians(dest_geo.lng)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        dist_nm = R_NM * 2 * math.asin(math.sqrt(a))
        distance_nm = round(dist_nm, 1)
        # Helicopter cruise ~150 knots; add 20% overhead for approach/departure
        flight_time_min = max(5, round(dist_nm / 150 * 60 * 1.2))
    except Exception:
        pass

    booking = AirBooking(
        id=str(uuid.uuid4()),
        booking_ref=booking_ref,
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        customer_phone=req.customer_phone,
        service_subtype=req.service_subtype,
        service_label=_subtype_label(req.service_subtype),
        route_from=req.route_from,
        route_to=req.route_to,
        pax_count=req.pax_count,
        etd=etd_dt,
        scheduled_date=etd_dt.date().isoformat(),
        fare_estimate_minor=req.fare_estimate_minor,
        fare_final_minor=None,
        payment_method=req.payment_method,
        operator_id=req.operator_id,
        aircraft_id=req.aircraft_id,
        status="Requested",
        flagged=False,
        internal_reason=req.internal_reason,
        notes=req.notes,
        manifest_locked=False,
        distance_nm=distance_nm,
        flight_time_min=flight_time_min,
    )
    db.add(booking)

    # Carbon offset — amount configurable via PlatformSettings.carbon_offset_amount_minor
    if await get_toggle(db, "carbon_offset"):
        _platform = await get_settings(db)
        _currency = _platform.base_currency or "INR"
        _offset_amount = _platform.carbon_offset_amount_minor or 500
        booking.fare_estimate_minor = (booking.fare_estimate_minor or 0) + _offset_amount
        _add_timeline(
            db, booking,
            f"Carbon offset applied · {fmt_minor(_offset_amount, _currency)}",
            "Platform toggle carbon_offset is enabled",
            "info",
        )

    _add_timeline(
        db, booking,
        "Booking created via assisted booking",
        req.internal_reason,
        "info",
    )

    # ── Create Razorpay order + Payment ledger entry ──────────────────────────
    _is_online = req.payment_method and req.payment_method != "cash"
    _fare = booking.fare_estimate_minor or req.fare_estimate_minor or 0
    if _fare > 0:
        try:
            from app.models.payment import Payment as PaymentModel, PaymentMethod as PM, PaymentStatus as PS
            from app.services.settings_service import get_base_currency
            _currency = await get_base_currency(db)
            _pm_str = (req.payment_method or "upi").lower()
            try:
                _pm = PM(_pm_str)
            except ValueError:
                _pm = PM.upi if _is_online else PM.cash
            _gw_order_id: str | None = None
            if _is_online:
                try:
                    from app.providers import get_payment_provider
                    _order = await get_payment_provider().create_order(
                        amount_minor=_fare,
                        currency=_currency,
                        receipt=booking.booking_ref,
                        notes={"booking_id": booking.id, "customer_id": booking.customer_id or ""},
                    )
                    _gw_order_id = _order.gateway_order_id
                except Exception:
                    pass
            db.add(PaymentModel(
                id=f"PAY-{booking.id[:8].upper()}",
                booking_id=booking.id,
                customer_id=booking.customer_id or "",
                customer_name=booking.customer_name or "",
                booking_ref=booking.booking_ref,
                service=f"Air · {booking.service_label or booking.service_subtype or ''}",
                method=_pm,
                gross_amount=_fare,
                gateway_fee=0,
                net_amount=_fare,
                status=PS.captured if not _is_online else PS.initiated,
                gateway_order_id=_gw_order_id,
                currency=_currency,
            ))
        except Exception:
            pass

    await db.commit()
    return await get_air_booking(db, booking.id)


def _subtype_label(subtype: str) -> str:
    return {
        "helicopter_shuttle": "Heli · Shuttle",
        "helicopter_on_demand": "Heli · On-demand",
        "charter": "Charter",
        "vip": "VIP",
    }.get(subtype, subtype)
