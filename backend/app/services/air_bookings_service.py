from __future__ import annotations

import random
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.air_booking import (
    AirBooking,
    AirBookingNote,
    AirBookingTimeline,
    CharterQuote,
    ManifestPassenger,
)
from app.models.customer import Customer
from app.models.operator import Operator
from app.schemas.air_bookings import (
    AssignOperatorBody,
    CancelAirBookingBody,
    CharterQuoteCreate,
    ManifestPassengerInput,
    RescheduleBody,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_booking_ref() -> str:
    """Generate a unique air booking reference like AC-A4-21809."""
    seq = random.randint(0, 99)
    hex_part = "".join(random.choices(string.hexdigits.upper(), k=5))
    return f"AC-A{seq}-{hex_part}"


async def _add_timeline_event(
    db: AsyncSession,
    booking_id: str,
    event: str,
    message: str | None = None,
    tone: str = "info",
) -> AirBookingTimeline:
    ev = AirBookingTimeline(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        event=event,
        message=message,
        tone=tone,
    )
    db.add(ev)
    return ev


async def _load_booking(db: AsyncSession, booking_id: str) -> AirBooking:
    """Load an air booking with all relationships eagerly loaded."""
    stmt = (
        select(AirBooking)
        .where(AirBooking.id == booking_id)
        .options(
            selectinload(AirBooking.timeline_events),
            selectinload(AirBooking.admin_notes),
            selectinload(AirBooking.manifest_passengers),
            selectinload(AirBooking.charter_quotes),
        )
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundException("AirBooking", booking_id)
    return booking


def _build_detail_dict(booking: AirBooking) -> dict:
    """Build the full air booking detail dict."""
    scheduled_date: str | None = None
    if booking.etd is not None:
        try:
            scheduled_date = booking.etd.strftime("%Y-%m-%d")
        except Exception:
            scheduled_date = None

    return {
        "id": booking.id,
        "booking_ref": booking.booking_ref,
        "customer_id": booking.customer_id,
        "customer_name": booking.customer_name,
        "customer_phone": booking.customer_phone,
        "operator_id": booking.operator_id,
        "operator_name": None,  # resolved separately if needed
        "aircraft_id": booking.aircraft_id,
        "aircraft_registration": booking.aircraft_registration,
        "service_subtype": booking.service_subtype,
        "service_label": booking.service_label,
        "route_from": booking.route_from,
        "route_to": booking.route_to,
        "pax_count": booking.pax_count,
        "etd": booking.etd,
        "scheduled_date": scheduled_date,
        "eta": booking.eta,
        "status": booking.status,
        "fare_estimate_minor": booking.fare_estimate_minor,
        "fare_final_minor": booking.fare_final_minor,
        "payment_method": booking.payment_method,
        "flagged": booking.flagged,
        "flag_reason": booking.flag_reason,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
        # Detail-only fields
        "distance_nm": booking.distance_nm,
        "flight_time_min": booking.flight_time_min,
        "fuel_weight_kg": booking.fuel_weight_kg,
        "notes": booking.notes,
        "internal_reason": booking.internal_reason,
        "reschedule_ref": booking.reschedule_ref,
        "manifest_locked": booking.manifest_locked,
        "manifest_locked_at": booking.manifest_locked_at,
        "operator_otp_pct": booking.operator_otp_pct,
        "operator_fleet_count": booking.operator_fleet_count,
        "aircraft_model": booking.aircraft_model,
        "aircraft_seats": booking.aircraft_seats,
        "aircraft_mtow_kg": booking.aircraft_mtow_kg,
        "aircraft_airworthy_until": booking.aircraft_airworthy_until,
        "pilot_name": booking.pilot_name,
        "pilot_license": booking.pilot_license,
        "copilot_name": booking.copilot_name,
        "timeline": list(booking.timeline_events),
        "admin_notes": list(booking.admin_notes),
    }


def _build_list_item_dict(booking: AirBooking) -> dict:
    """Build air booking list item dict."""
    scheduled_date: str | None = None
    if booking.etd is not None:
        try:
            scheduled_date = booking.etd.strftime("%Y-%m-%d")
        except Exception:
            scheduled_date = None

    return {
        "id": booking.id,
        "booking_ref": booking.booking_ref,
        "customer_id": booking.customer_id,
        "customer_name": booking.customer_name,
        "customer_phone": booking.customer_phone,
        "operator_id": booking.operator_id,
        "operator_name": None,
        "aircraft_id": booking.aircraft_id,
        "aircraft_registration": booking.aircraft_registration,
        "service_subtype": booking.service_subtype,
        "service_label": booking.service_label,
        "route_from": booking.route_from,
        "route_to": booking.route_to,
        "pax_count": booking.pax_count,
        "etd": booking.etd,
        "scheduled_date": scheduled_date,
        "status": booking.status,
        "fare_estimate_minor": booking.fare_estimate_minor,
        "fare_final_minor": booking.fare_final_minor,
        "payment_method": booking.payment_method,
        "flagged": booking.flagged,
        "flag_reason": booking.flag_reason,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
    }


# ── List bookings ─────────────────────────────────────────────────────────────

async def list_bookings(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    status: str | None = None,
    service_subtype: str | None = None,
    operator_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    flagged: bool | None = None,
) -> Tuple[List[dict], int, Dict[str, Any]]:
    """Return (items_as_dicts, total, stats_dict)."""

    filters = []

    if search:
        like = f"%{search}%"
        cust_ids_subq = select(Customer.id).where(
            or_(Customer.name.ilike(like), Customer.phone.ilike(like))
        )
        filters.append(
            or_(
                AirBooking.booking_ref.ilike(like),
                AirBooking.customer_name.ilike(like),
                AirBooking.route_from.ilike(like),
                AirBooking.route_to.ilike(like),
                AirBooking.customer_id.in_(cust_ids_subq),
            )
        )

    if status:
        status_values = [s.strip() for s in status.split(",") if s.strip()]
        if len(status_values) == 1:
            filters.append(AirBooking.status == status_values[0])
        else:
            filters.append(AirBooking.status.in_(status_values))

    if service_subtype:
        filters.append(AirBooking.service_subtype == service_subtype)

    if operator_id:
        filters.append(AirBooking.operator_id == operator_id)

    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            filters.append(AirBooking.etd >= dt)
        except ValueError:
            pass

    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            filters.append(AirBooking.etd <= dt)
        except ValueError:
            pass

    if flagged is not None:
        filters.append(AirBooking.flagged == flagged)

    where_clause = and_(*filters) if filters else True  # type: ignore[arg-type]

    # Count
    count_stmt = select(func.count(AirBooking.id)).where(where_clause)
    total: int = (await db.execute(count_stmt)).scalar_one()

    # Page query
    offset = (page - 1) * page_size
    stmt = (
        select(AirBooking)
        .where(where_clause)
        .order_by(AirBooking.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()

    # Gather operator names for the page
    operator_ids = [b.operator_id for b in rows if b.operator_id]
    operator_map: Dict[str, str] = {}
    if operator_ids:
        op_rows = (
            await db.execute(
                select(Operator.id, Operator.name).where(Operator.id.in_(operator_ids))
            )
        ).all()
        operator_map = {r[0]: r[1] for r in op_rows}

    items: List[dict] = []
    for b in rows:
        d = _build_list_item_dict(b)
        if b.operator_id:
            d["operator_name"] = operator_map.get(b.operator_id)
        items.append(d)

    # Stats
    now = _utcnow()
    seven_days_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    in_air_count: int = (
        await db.execute(
            select(func.count(AirBooking.id)).where(
                AirBooking.status.in_(["Boarding", "Departed", "Arrived"])
            )
        )
    ).scalar_one()

    quote_pending_count: int = (
        await db.execute(
            select(func.count(AirBooking.id)).where(AirBooking.status == "Quote shared")
        )
    ).scalar_one()

    manifest_open_count: int = (
        await db.execute(
            select(func.count(AirBooking.id)).where(
                AirBooking.status.in_(["Confirmed", "Manifest locked"])
            )
        )
    ).scalar_one()

    cancelled_7d_count: int = (
        await db.execute(
            select(func.count(AirBooking.id)).where(
                and_(
                    AirBooking.status == "Cancelled",
                    AirBooking.updated_at >= seven_days_ago,
                )
            )
        )
    ).scalar_one()

    refund_queue_count: int = (
        await db.execute(
            select(func.count(AirBooking.id)).where(AirBooking.status == "Refunded")
        )
    ).scalar_one()

    gross_revenue_minor: int = (
        await db.execute(
            select(func.coalesce(func.sum(AirBooking.fare_final_minor), 0)).where(
                and_(
                    AirBooking.status == "Completed",
                    AirBooking.updated_at >= today_start,
                )
            )
        )
    ).scalar_one()

    stats: Dict[str, Any] = {
        "in_air_count": in_air_count,
        "quote_pending_count": quote_pending_count,
        "manifest_open_count": manifest_open_count,
        "cancelled_7d_count": cancelled_7d_count,
        "refund_queue_count": refund_queue_count,
        "gross_revenue_minor": gross_revenue_minor,
    }

    return items, total, stats


# ── Get single booking ────────────────────────────────────────────────────────

async def get_booking(db: AsyncSession, booking_id: str) -> dict:
    """Return AirBooking as a detail dict."""
    booking = await _load_booking(db, booking_id)

    detail = _build_detail_dict(booking)

    # Resolve operator name
    if booking.operator_id:
        op = await db.get(Operator, booking.operator_id)
        if op:
            detail["operator_name"] = op.name

    return detail


# ── Assign operator ───────────────────────────────────────────────────────────

async def assign_operator(
    db: AsyncSession,
    booking_id: str,
    body: AssignOperatorBody,
) -> dict:
    booking = await _load_booking(db, booking_id)

    operator = await db.get(Operator, body.operator_id)
    if not operator:
        raise NotFoundException("Operator", body.operator_id)

    booking.operator_id = body.operator_id
    booking.updated_at = _utcnow()

    if body.aircraft_id:
        booking.aircraft_id = body.aircraft_id

    await _add_timeline_event(
        db,
        booking_id,
        "Operator assigned",
        f"Operator: {operator.name}" + (f" — {body.note}" if body.note else ""),
        "info",
    )
    await db.commit()

    booking = await _load_booking(db, booking_id)
    detail = _build_detail_dict(booking)
    detail["operator_name"] = operator.name
    return detail


# ── Cancel preview ────────────────────────────────────────────────────────────

async def get_cancel_preview(db: AsyncSession, booking_id: str) -> dict:
    """Compute cancellation fee preview based on time-to-departure tier."""
    booking = await db.get(AirBooking, booking_id)
    if not booking:
        raise NotFoundException("AirBooking", booking_id)

    fare = booking.fare_final_minor or booking.fare_estimate_minor or 0
    now = _utcnow()

    hours_to_etd: float | None = None
    if booking.etd is not None:
        etd = booking.etd
        if etd.tzinfo is None:
            etd = etd.replace(tzinfo=timezone.utc)
        hours_to_etd = (etd - now).total_seconds() / 3600

    tier, fee_pct = _compute_cancel_tier(hours_to_etd)
    cancel_fee_minor = int(fare * fee_pct / 100)
    net_refund_minor = fare - cancel_fee_minor

    return {
        "booking_id": booking_id,
        "fare_minor": fare,
        "tier": tier,
        "fee_pct": fee_pct,
        "cancel_fee_minor": cancel_fee_minor,
        "net_refund_minor": net_refund_minor,
        "hours_to_etd": hours_to_etd,
        "is_force_majeure_eligible": hours_to_etd is not None and hours_to_etd > 0,
    }


def _compute_cancel_tier(hours_to_etd: float | None) -> Tuple[str, int]:
    """Return (tier_label, fee_pct)."""
    if hours_to_etd is None or hours_to_etd > 48:
        return ">48h", 0
    elif hours_to_etd > 24:
        return "24–48h", 25
    elif hours_to_etd > 4:
        return "4–24h", 50
    else:
        return "<4h", 100


# ── Cancel booking ────────────────────────────────────────────────────────────

async def cancel_booking(
    db: AsyncSession,
    booking_id: str,
    data: CancelAirBookingBody,
) -> dict:
    booking = await _load_booking(db, booking_id)

    if booking.status in ("Completed", "Cancelled", "Refunded"):
        raise ValidationException(
            f"Cannot cancel a booking with status '{booking.status}'"
        )

    fare = booking.fare_final_minor or booking.fare_estimate_minor or 0
    now = _utcnow()
    hours_to_etd: float | None = None
    if booking.etd is not None:
        etd = booking.etd
        if etd.tzinfo is None:
            etd = etd.replace(tzinfo=timezone.utc)
        hours_to_etd = (etd - now).total_seconds() / 3600

    tier, fee_pct = _compute_cancel_tier(hours_to_etd)
    cancel_fee_minor = int(fare * fee_pct / 100) if not data.force_majeure else 0

    booking.status = "Cancelled"
    booking.updated_at = now

    msg = f"Reason: {data.reason}"
    if data.note:
        msg += f" — {data.note}"
    msg += f" | Tier: {tier}, Fee: {cancel_fee_minor} minor"
    if data.force_majeure:
        msg += " (Force Majeure — fee waived)"

    await _add_timeline_event(db, booking_id, "Booking cancelled", msg, "warn")
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking)


# ── Reschedule booking ────────────────────────────────────────────────────────

async def reschedule_booking(
    db: AsyncSession,
    booking_id: str,
    data: RescheduleBody,
) -> dict:
    booking = await _load_booking(db, booking_id)

    if booking.status in ("Completed", "Cancelled", "Refunded"):
        raise ValidationException(
            f"Cannot reschedule a booking with status '{booking.status}'"
        )

    # Parse new_etd
    if isinstance(data.new_etd, str):
        try:
            new_etd = datetime.fromisoformat(data.new_etd.replace("Z", "+00:00"))
        except ValueError:
            raise ValidationException(f"Invalid new_etd format: {data.new_etd}")
    else:
        new_etd = data.new_etd

    old_etd = booking.etd
    booking.etd = new_etd
    booking.status = "Confirmed"
    booking.updated_at = _utcnow()

    await _add_timeline_event(
        db,
        booking_id,
        "Booking rescheduled",
        f"ETD changed from {old_etd} to {new_etd} — Reason: {data.reason}",
        "info",
    )
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking)


# ── Process refund ────────────────────────────────────────────────────────────

async def process_refund(
    db: AsyncSession,
    booking_id: str,
    amount_minor: int,
    destination: str,
    reason: str,
) -> dict:
    booking = await _load_booking(db, booking_id)

    if booking.status not in ("Cancelled", "Completed"):
        raise ValidationException(
            f"Cannot process refund for booking with status '{booking.status}'"
        )

    booking.status = "Refunded"
    booking.updated_at = _utcnow()

    await _add_timeline_event(
        db,
        booking_id,
        "Refund issued",
        f"Amount: {amount_minor} minor — Destination: {destination} — Reason: {reason}",
        "ok",
    )
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking)


# ── Manifest ──────────────────────────────────────────────────────────────────

_EMPTY_WEIGHT_KG = 1860.0  # default empty weight for MTOW calc


async def get_manifest(db: AsyncSession, booking_id: str) -> dict:
    """Build manifest response with weight sums and MTOW calculation."""
    booking = await _load_booking(db, booking_id)

    passengers = list(booking.manifest_passengers)

    total_pax_weight = sum(p.body_weight_kg for p in passengers)
    total_baggage_weight = sum(p.baggage_weight_kg for p in passengers)
    fuel_weight = booking.fuel_weight_kg or 0.0
    mtow = booking.aircraft_mtow_kg or 2722.0
    empty_weight = _EMPTY_WEIGHT_KG
    total_weight = total_pax_weight + total_baggage_weight + fuel_weight + empty_weight
    utilization_pct = round((total_weight / mtow) * 100, 1) if mtow > 0 else 0.0
    is_within = total_weight <= mtow

    return {
        "booking_id": booking_id,
        "passengers": passengers,
        "total_pax_weight_kg": total_pax_weight,
        "total_baggage_weight_kg": total_baggage_weight,
        "aircraft_empty_weight_kg": empty_weight,
        "fuel_weight_kg": fuel_weight,
        "total_weight_kg": total_weight,
        "mtow_kg": mtow,
        "utilization_pct": utilization_pct,
        "is_within_limits": is_within,
        "is_locked": booking.manifest_locked,
    }


async def update_manifest(
    db: AsyncSession,
    booking_id: str,
    passengers: List[ManifestPassengerInput],
) -> dict:
    """Replace all manifest passengers and validate MTOW."""
    booking = await _load_booking(db, booking_id)

    if booking.manifest_locked:
        raise ValidationException("Manifest is locked. Contact ops admin to unlock.")

    # Delete existing passengers
    existing = list(booking.manifest_passengers)
    for pax in existing:
        await db.delete(pax)
    await db.flush()

    # Insert new passengers
    for seq, pax_input in enumerate(passengers, start=1):
        pax = ManifestPassenger(
            id=pax_input.id or str(uuid.uuid4()),
            booking_id=booking_id,
            seq=seq,
            name=pax_input.name,
            age=pax_input.age,
            id_number=pax_input.id_number,
            body_weight_kg=pax_input.body_weight_kg,
            baggage_weight_kg=pax_input.baggage_weight_kg,
            special_notes=pax_input.special_notes,
            is_minor=pax_input.is_minor,
        )
        db.add(pax)

    # MTOW validation
    total_pax_weight = sum(p.body_weight_kg for p in passengers)
    total_baggage_weight = sum(p.baggage_weight_kg for p in passengers)
    fuel_weight = booking.fuel_weight_kg or 0.0
    mtow = booking.aircraft_mtow_kg or 2722.0
    empty_weight = _EMPTY_WEIGHT_KG
    total_weight = total_pax_weight + total_baggage_weight + fuel_weight + empty_weight
    is_within = total_weight <= mtow

    booking.pax_count = len(passengers)
    booking.updated_at = _utcnow()

    await _add_timeline_event(
        db,
        booking_id,
        "Manifest updated",
        f"{len(passengers)} passengers · Total weight: {total_weight:.1f} kg / MTOW {mtow:.0f} kg"
        + (" — EXCEEDS MTOW" if not is_within else ""),
        "warn" if not is_within else "info",
    )
    await db.commit()

    # Reload to get the fresh passengers list
    booking = await _load_booking(db, booking_id)
    new_passengers = list(booking.manifest_passengers)

    utilization_pct = round((total_weight / mtow) * 100, 1) if mtow > 0 else 0.0

    return {
        "booking_id": booking_id,
        "passengers": new_passengers,
        "total_pax_weight_kg": total_pax_weight,
        "total_baggage_weight_kg": total_baggage_weight,
        "aircraft_empty_weight_kg": empty_weight,
        "fuel_weight_kg": fuel_weight,
        "total_weight_kg": total_weight,
        "mtow_kg": mtow,
        "utilization_pct": utilization_pct,
        "is_within_limits": is_within,
        "is_locked": booking.manifest_locked,
    }


async def lock_manifest(db: AsyncSession, booking_id: str) -> dict:
    """Lock the manifest — no further edits without admin override."""
    booking = await _load_booking(db, booking_id)

    if booking.manifest_locked:
        raise ConflictException("Manifest is already locked.")

    booking.manifest_locked = True
    booking.manifest_locked_at = _utcnow()
    booking.updated_at = _utcnow()

    await _add_timeline_event(db, booking_id, "Manifest locked", None, "ok")
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return await get_manifest(db, booking_id)


# ── Charter Quotes ────────────────────────────────────────────────────────────

async def list_quotes(db: AsyncSession, booking_id: str) -> dict:
    booking = await db.get(AirBooking, booking_id)
    if not booking:
        raise NotFoundException("AirBooking", booking_id)

    stmt = (
        select(CharterQuote)
        .where(CharterQuote.booking_id == booking_id)
        .order_by(CharterQuote.created_at.desc())
    )
    quotes = (await db.execute(stmt)).scalars().all()

    return {"booking_id": booking_id, "quotes": list(quotes)}


async def create_quote(
    db: AsyncSession,
    booking_id: str,
    data: CharterQuoteCreate,
) -> CharterQuote:
    booking = await db.get(AirBooking, booking_id)
    if not booking:
        raise NotFoundException("AirBooking", booking_id)

    # Compute total
    total_minor = (
        data.base_fare_minor
        + data.positioning_minor
        + data.night_halt_minor
        + data.catering_minor
        + data.fuel_surcharge_minor
        + data.taxes_minor
    )

    # Resolve operator name if provided
    operator_name: str | None = None
    if data.operator_id:
        op = await db.get(Operator, data.operator_id)
        if op:
            operator_name = op.name

    # Parse etd/eta if strings
    etd_val = None
    eta_val = None
    if data.etd:
        if isinstance(data.etd, str):
            try:
                etd_val = datetime.fromisoformat(str(data.etd).replace("Z", "+00:00"))
            except ValueError:
                etd_val = None
        else:
            etd_val = data.etd
    if data.eta:
        if isinstance(data.eta, str):
            try:
                eta_val = datetime.fromisoformat(str(data.eta).replace("Z", "+00:00"))
            except ValueError:
                eta_val = None
        else:
            eta_val = data.eta

    quote = CharterQuote(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        operator_id=data.operator_id,
        operator_name=operator_name,
        aircraft_registration=data.aircraft_registration,
        aircraft_model=data.aircraft_model,
        pax_capacity=data.pax_capacity,
        range_nm=data.range_nm,
        depart_icao=data.depart_icao,
        arrive_icao=data.arrive_icao,
        etd=etd_val,
        eta=eta_val,
        base_fare_minor=data.base_fare_minor,
        positioning_minor=data.positioning_minor,
        night_halt_minor=data.night_halt_minor,
        catering_minor=data.catering_minor,
        fuel_surcharge_minor=data.fuel_surcharge_minor,
        taxes_minor=data.taxes_minor,
        total_minor=total_minor,
        conditions=data.conditions,
        otp_30d_pct=data.otp_30d_pct,
        score=data.score,
        status="pending",
        is_recommended=False,
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote


async def push_quote(db: AsyncSession, booking_id: str, quote_id: str) -> dict:
    """Set quote status to 'pushed' and booking status to 'Quote shared'."""
    quote = await db.get(CharterQuote, quote_id)
    if not quote or quote.booking_id != booking_id:
        raise NotFoundException("CharterQuote", quote_id)

    quote.status = "pushed"

    booking = await _load_booking(db, booking_id)
    booking.status = "Quote shared"
    booking.updated_at = _utcnow()

    await _add_timeline_event(
        db,
        booking_id,
        "Quote pushed to customer",
        f"Quote {quote_id[:8]}... pushed",
        "info",
    )
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking)


async def decline_quote(db: AsyncSession, booking_id: str, quote_id: str) -> CharterQuote:
    """Decline a charter quote."""
    quote = await db.get(CharterQuote, quote_id)
    if not quote or quote.booking_id != booking_id:
        raise NotFoundException("CharterQuote", quote_id)

    quote.status = "declined"
    await db.commit()
    await db.refresh(quote)
    return quote


# ── Admin notes ───────────────────────────────────────────────────────────────

async def add_note(db: AsyncSession, booking_id: str, note_text: str) -> AirBookingNote:
    booking = await db.get(AirBooking, booking_id)
    if not booking:
        raise NotFoundException("AirBooking", booking_id)

    note = AirBookingNote(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        note=note_text,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


# ── Flag booking ──────────────────────────────────────────────────────────────

async def flag_booking(
    db: AsyncSession,
    booking_id: str,
    flagged: bool,
    flag_reason: str | None,
) -> dict:
    booking = await _load_booking(db, booking_id)
    booking.flagged = flagged
    booking.flag_reason = flag_reason
    booking.updated_at = _utcnow()
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking)


# ── Advance status ────────────────────────────────────────────────────────────

_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "Requested":       ["Confirmed", "Cancelled"],
    "Quote shared":    ["Confirmed", "Cancelled"],
    "Confirmed":       ["Manifest locked", "Cancelled"],
    "Manifest locked": ["Boarding", "Cancelled"],
    "Boarding":        ["Departed", "Cancelled"],
    "Departed":        ["Arrived"],
    "Arrived":         ["Completed"],
}

_TRANSITION_EVENTS: dict[str, str] = {
    "Confirmed":       "Booking confirmed",
    "Manifest locked": "Manifest locked",
    "Boarding":        "Passengers boarding",
    "Departed":        "Aircraft departed",
    "Arrived":         "Aircraft arrived",
    "Completed":       "Flight completed",
    "Cancelled":       "Booking cancelled (manual)",
    "Rescheduled":     "Booking rescheduled",
}


async def advance_status(
    db: AsyncSession,
    booking_id: str,
    new_status: str,
    note: str | None = None,
) -> dict:
    """Manually advance booking status for ops workflow."""
    booking = await _load_booking(db, booking_id)

    allowed = _STATUS_TRANSITIONS.get(booking.status, [])
    if new_status not in allowed:
        raise ValidationException(
            f"Cannot transition from '{booking.status}' to '{new_status}'. "
            f"Allowed: {', '.join(allowed) if allowed else 'none'}"
        )

    booking.status = new_status
    booking.updated_at = _utcnow()

    tone = "ok" if new_status in ("Completed", "Arrived") else "info"
    if new_status == "Cancelled":
        tone = "warn"

    await _add_timeline_event(
        db,
        booking_id,
        _TRANSITION_EVENTS.get(new_status, f"Status → {new_status}"),
        note or "Advanced manually via admin panel",
        tone,
    )

    await db.commit()
    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking)
