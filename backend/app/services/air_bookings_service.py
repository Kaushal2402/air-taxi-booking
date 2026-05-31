from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
    CancelRequest,
    CharterQuote as CharterQuoteSchema,
    FlagRequest,
    ManifestPassenger,
    ManifestResponse,
    ManifestUpdateRequest,
    CreateAirBookingRequest,
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

def _cancel_fee_pct(hours_to_etd: float) -> tuple[str, int]:
    if hours_to_etd > 48:
        return ">48h", 0
    elif hours_to_etd > 24:
        return "24-48h", 25
    elif hours_to_etd > 4:
        return "4-24h", 50
    else:
        return "<4h", 100


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
    booking.operator_id = req.operator_id
    if req.aircraft_id:
        booking.aircraft_id = req.aircraft_id
    _add_timeline(db, booking, "Operator assigned", req.note, "info")
    await db.commit()
    await db.refresh(booking)
    return await get_air_booking(db, booking_id)


async def cancel_preview(db: AsyncSession, booking_id: str) -> CancelPreviewResponse:
    result = await db.execute(select(AirBooking).where(AirBooking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Air booking not found")

    now = datetime.now(timezone.utc)
    etd = booking.etd
    if etd.tzinfo is None:
        etd = etd.replace(tzinfo=timezone.utc)
    delta_hours = (etd - now).total_seconds() / 3600
    tier, fee_pct = _cancel_fee_pct(delta_hours)
    fare = booking.fare_estimate_minor
    cancel_fee = int(fare * fee_pct / 100)
    net_refund = fare - cancel_fee

    return CancelPreviewResponse(
        booking_id=booking.id,
        fare_minor=fare,
        tier=tier,
        fee_pct=fee_pct,
        cancel_fee_minor=cancel_fee,
        net_refund_minor=net_refund,
        hours_to_etd=round(max(delta_hours, 0), 2),
        is_force_majeure_eligible=delta_hours < 48,
    )


async def cancel_booking(
    db: AsyncSession, booking_id: str, req: CancelRequest
) -> AirBookingDetail:
    booking = await _load_booking(db, booking_id)
    if booking.status in ("Cancelled", "Refunded", "Completed"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel booking in status '{booking.status}'")

    booking.status = "Cancelled"
    booking.internal_reason = req.reason
    note_text = f"Cancelled: {req.reason}"
    if req.note:
        note_text += f" | {req.note}"
    if req.force_majeure:
        note_text += " [Force majeure]"
    _add_timeline(db, booking, "Booking cancelled", note_text, "danger")
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
    booking.status = "Refunded"
    msg = f"Refund of {req.amount_minor} minor units to {req.destination}"
    if req.reason:
        msg += f" — {req.reason}"
    _add_timeline(db, booking, "Refund processed", msg, "ok")
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
        etd=datetime.fromisoformat(req.etd.replace("Z", "+00:00")),
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
    )
    db.add(booking)
    _add_timeline(
        db, booking,
        "Booking created via assisted booking",
        req.internal_reason,
        "info",
    )
    await db.commit()
    return await get_air_booking(db, booking.id)


def _subtype_label(subtype: str) -> str:
    return {
        "helicopter_shuttle": "Heli · Shuttle",
        "helicopter_on_demand": "Heli · On-demand",
        "charter": "Charter",
        "vip": "VIP",
    }.get(subtype, subtype)
