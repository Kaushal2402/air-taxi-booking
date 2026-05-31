from __future__ import annotations

import random
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.booking import (
    BookingAdminNote,
    BookingFareComponent,
    BookingTimelineEvent,
    Dispute,
    RoadBooking,
)
from app.models.customer import Customer
from app.models.driver import Driver
from app.schemas.bookings import (
    AddNoteBody,
    AdjustFareBody,
    AssistedBookingCreate,
    CancelBookingBody,
    FlagBookingBody,
    OpenDisputeBody,
    ReassignBody,
    RefundBody,
    ResolveDisputeBody,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_booking_ref() -> str:
    """Generate a unique booking reference like AC-92F8311."""
    hex_part = "".join(random.choices(string.hexdigits.upper(), k=7))
    return f"AC-{hex_part}"


async def _generate_dispute_ref(db: AsyncSession) -> str:
    """Generate the next dispute ref like D-0001."""
    result = await db.execute(select(func.max(Dispute.dispute_ref)))
    max_ref: str | None = result.scalar()
    if max_ref is None:
        return "D-0001"
    try:
        num = int(max_ref.split("-")[1])
    except (IndexError, ValueError):
        num = 0
    return f"D-{(num + 1):04d}"


async def _add_timeline_event(
    db: AsyncSession,
    booking_id: str,
    event: str,
    message: str | None = None,
    tone: str = "info",
) -> BookingTimelineEvent:
    ev = BookingTimelineEvent(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        event=event,
        message=message,
        tone=tone,
    )
    db.add(ev)
    return ev


async def _load_booking(db: AsyncSession, booking_id: str) -> RoadBooking:
    """Load a booking with all relationships eagerly loaded."""
    stmt = (
        select(RoadBooking)
        .where(RoadBooking.id == booking_id)
        .options(
            selectinload(RoadBooking.timeline_events),
            selectinload(RoadBooking.fare_components),
            selectinload(RoadBooking.admin_notes),
            selectinload(RoadBooking.dispute),
        )
    )
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundException("RoadBooking", booking_id)
    return booking


# ── Denormalization helpers ───────────────────────────────────────────────────

def _booking_to_list_item_dict(
    booking: RoadBooking,
    customer_name: str | None,
    driver_name: str | None,
) -> dict:
    """Build flat dict matching RoadBookingListItem."""
    return {
        "id": booking.id,
        "booking_ref": booking.booking_ref,
        "customer_id": booking.customer_id,
        "customer_name": customer_name,
        "driver_id": booking.driver_id,
        "driver_name": driver_name,
        "service_type": booking.service_type,
        "vehicle_class": booking.vehicle_class,
        "pickup_address": booking.pickup_address,
        "drop_address": booking.drop_address,
        "status": booking.status,
        "fare_estimate_minor": booking.fare_estimate_minor,
        "fare_final_minor": booking.fare_final_minor,
        "payment_method": booking.payment_method,
        "flagged": booking.flagged,
        "flag_reason": booking.flag_reason,
        "scheduled_at": booking.scheduled_at,
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
    service_type: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    flagged: bool | None = None,
    payment_method: str | None = None,
) -> Tuple[List[dict], int, Dict[str, Any]]:
    """Return (items_as_dicts, total, stats_dict)."""

    # ── Build base query ──────────────────────────────────────────────────────
    filters = []

    if search:
        filters.append(
            or_(
                RoadBooking.booking_ref.ilike(f"%{search}%"),
                RoadBooking.customer_phone.ilike(f"%{search}%"),
                RoadBooking.driver_vehicle_plate.ilike(f"%{search}%"),
            )
        )
    if status:
        filters.append(RoadBooking.status == status)
    if service_type:
        filters.append(RoadBooking.service_type == service_type)
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            filters.append(RoadBooking.created_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            filters.append(RoadBooking.created_at <= dt)
        except ValueError:
            pass
    if flagged is not None:
        filters.append(RoadBooking.flagged == flagged)
    if payment_method:
        filters.append(RoadBooking.payment_method == payment_method)

    where_clause = and_(*filters) if filters else True  # type: ignore[arg-type]

    # ── Count ─────────────────────────────────────────────────────────────────
    count_stmt = select(func.count(RoadBooking.id)).where(where_clause)
    total: int = (await db.execute(count_stmt)).scalar_one()

    # ── Page query ────────────────────────────────────────────────────────────
    offset = (page - 1) * page_size
    stmt = (
        select(RoadBooking)
        .where(where_clause)
        .order_by(RoadBooking.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()

    # ── Gather customer/driver names for the page ─────────────────────────────
    customer_ids = [b.customer_id for b in rows if b.customer_id]
    driver_ids = [b.driver_id for b in rows if b.driver_id]

    customer_map: Dict[str, str] = {}
    driver_map: Dict[str, str] = {}

    if customer_ids:
        c_rows = (
            await db.execute(
                select(Customer.id, Customer.name).where(Customer.id.in_(customer_ids))
            )
        ).all()
        customer_map = {r[0]: r[1] for r in c_rows}

    if driver_ids:
        d_rows = (
            await db.execute(
                select(Driver.id, Driver.name).where(Driver.id.in_(driver_ids))
            )
        ).all()
        driver_map = {r[0]: r[1] for r in d_rows}

    items = [
        _booking_to_list_item_dict(
            b,
            customer_map.get(b.customer_id) if b.customer_id else None,
            driver_map.get(b.driver_id) if b.driver_id else None,
        )
        for b in rows
    ]

    # ── Stats ─────────────────────────────────────────────────────────────────
    today_start = _utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    live_count: int = (
        await db.execute(
            select(func.count(RoadBooking.id)).where(
                RoadBooking.status.in_(["InProgress", "Accepted", "Arrived"])
            )
        )
    ).scalar_one()

    scheduled_count: int = (
        await db.execute(
            select(func.count(RoadBooking.id)).where(RoadBooking.status == "Scheduled")
        )
    ).scalar_one()

    cancelled_today: int = (
        await db.execute(
            select(func.count(RoadBooking.id)).where(
                and_(
                    RoadBooking.status == "Cancelled",
                    RoadBooking.updated_at >= today_start,
                )
            )
        )
    ).scalar_one()

    disputed_count: int = (
        await db.execute(
            select(func.count(RoadBooking.id)).where(RoadBooking.status == "Disputed")
        )
    ).scalar_one()

    refund_pending_count: int = (
        await db.execute(
            select(func.count(RoadBooking.id)).where(RoadBooking.status == "Refunded")
        )
    ).scalar_one()

    gross_revenue_minor: int = (
        await db.execute(
            select(func.coalesce(func.sum(RoadBooking.fare_final_minor), 0)).where(
                and_(
                    RoadBooking.status == "Completed",
                    RoadBooking.updated_at >= today_start,
                )
            )
        )
    ).scalar_one()

    stats: Dict[str, Any] = {
        "live_count": live_count,
        "scheduled_count": scheduled_count,
        "cancelled_today": cancelled_today,
        "disputed_count": disputed_count,
        "refund_pending_count": refund_pending_count,
        "gross_revenue_minor": gross_revenue_minor,
    }

    return items, total, stats


# ── Get single booking ────────────────────────────────────────────────────────

async def get_booking(db: AsyncSession, booking_id: str) -> dict:
    """Return RoadBooking as a detail dict with all related data and denormalized names."""
    booking = await _load_booking(db, booking_id)

    customer_name: str | None = None
    driver_name: str | None = None

    if booking.customer_id:
        c = await db.get(Customer, booking.customer_id)
        if c:
            customer_name = c.name

    if booking.driver_id:
        d = await db.get(Driver, booking.driver_id)
        if d:
            driver_name = d.name

    return _build_detail_dict(booking, customer_name, driver_name)


def _build_detail_dict(
    booking: RoadBooking,
    customer_name: str | None,
    driver_name: str | None,
) -> dict:
    base = _booking_to_list_item_dict(booking, customer_name, driver_name)
    base.update(
        {
            "pickup_lat": booking.pickup_lat,
            "pickup_lng": booking.pickup_lng,
            "drop_lat": booking.drop_lat,
            "drop_lng": booking.drop_lng,
            "distance_km": booking.distance_km,
            "duration_min": booking.duration_min,
            "surge_multiplier": booking.surge_multiplier,
            "promo_code": booking.promo_code,
            "promo_discount_minor": booking.promo_discount_minor,
            "internal_reason": booking.internal_reason,
            "driver_vehicle_plate": booking.driver_vehicle_plate,
            "driver_vehicle_model": booking.driver_vehicle_model,
            "customer_phone": booking.customer_phone,
            "customer_ride_count": booking.customer_ride_count,
            "customer_rating": booking.customer_rating,
            "timeline": list(booking.timeline_events),
            "fare_components": list(booking.fare_components),
            "admin_notes": list(booking.admin_notes),
            "dispute": booking.dispute,
        }
    )
    return base


# ── Create assisted booking ───────────────────────────────────────────────────

async def create_assisted_booking(
    db: AsyncSession,
    data: AssistedBookingCreate,
    created_by_id: str,
) -> dict:
    # Denormalize customer info if provided
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_ride_count = 0
    customer_rating: float | None = None

    if data.customer_id:
        customer = await db.get(Customer, data.customer_id)
        if not customer:
            raise NotFoundException("Customer", data.customer_id)
        customer_name = customer.name
        customer_phone = customer.phone
        customer_ride_count = customer.trips_count
        customer_rating = customer.rating

    booking_ref = _generate_booking_ref()
    booking = RoadBooking(
        id=str(uuid.uuid4()),
        booking_ref=booking_ref,
        customer_id=data.customer_id,
        driver_id=None,
        service_type=data.service_type,
        vehicle_class=data.vehicle_class,
        pickup_address=data.pickup_address,
        pickup_lat=data.pickup_lat,
        pickup_lng=data.pickup_lng,
        drop_address=data.drop_address,
        drop_lat=data.drop_lat,
        drop_lng=data.drop_lng,
        status="Requested",
        fare_estimate_minor=data.fare_estimate_minor,
        payment_method=data.payment_method,
        promo_code=data.promo_code,
        internal_reason=data.internal_reason,
        scheduled_at=data.scheduled_at,
        customer_phone=customer_phone,
        customer_ride_count=customer_ride_count,
        customer_rating=customer_rating,
    )
    db.add(booking)
    await db.flush()  # get the id

    await _add_timeline_event(
        db, booking.id, "Booking requested", "Assisted booking created via admin panel", "info"
    )

    if data.admin_note:
        note = BookingAdminNote(
            id=str(uuid.uuid4()),
            booking_id=booking.id,
            note=data.admin_note,
        )
        db.add(note)

    await db.commit()

    # Reload with relationships
    booking = await _load_booking(db, booking.id)
    return _build_detail_dict(booking, customer_name, None)


# ── Cancel booking ────────────────────────────────────────────────────────────

async def cancel_booking(
    db: AsyncSession,
    booking_id: str,
    data: CancelBookingBody,
) -> dict:
    booking = await _load_booking(db, booking_id)

    if booking.status in ("Completed", "Cancelled", "Refunded"):
        raise ValidationException(
            f"Cannot cancel a booking with status '{booking.status}'"
        )

    cancellation_fee = (
        data.override_fee_minor
        if data.override_fee_minor is not None
        else max(5000, booking.fare_estimate_minor * 10 // 100)
    )

    booking.status = "Cancelled"
    await _add_timeline_event(
        db,
        booking_id,
        "Booking cancelled",
        f"Reason: {data.reason}" + (f" — {data.note}" if data.note else ""),
        "warn",
    )
    await db.commit()
    await db.refresh(booking)

    # Reload relationships
    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking, None, None)


# ── Reassign driver ───────────────────────────────────────────────────────────

async def reassign_driver(
    db: AsyncSession,
    booking_id: str,
    driver_id: str,
    reason: str,
) -> dict:
    booking = await _load_booking(db, booking_id)

    if booking.status not in ("Accepted", "Arrived"):
        raise ValidationException(
            f"Can only reassign driver when status is Accepted or Arrived (current: {booking.status})"
        )

    new_driver = await db.get(Driver, driver_id)
    if not new_driver:
        raise NotFoundException("Driver", driver_id)

    old_driver_id = booking.driver_id
    booking.driver_id = driver_id
    booking.driver_vehicle_plate = new_driver.vehicle_plate
    booking.driver_vehicle_model = new_driver.vehicle_class  # best available field

    await _add_timeline_event(
        db,
        booking_id,
        "Driver reassigned",
        f"New driver: {new_driver.name} — Reason: {reason}",
        "info",
    )
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking, None, new_driver.name)


# ── Adjust fare ───────────────────────────────────────────────────────────────

async def adjust_fare(
    db: AsyncSession,
    booking_id: str,
    new_fare_minor: int,
    reason: str,
) -> dict:
    booking = await _load_booking(db, booking_id)

    if booking.status not in ("Completed", "InProgress"):
        raise ValidationException(
            f"Can only adjust fare when status is Completed or InProgress (current: {booking.status})"
        )

    old_fare = booking.fare_final_minor
    booking.fare_final_minor = new_fare_minor

    await _add_timeline_event(
        db,
        booking_id,
        "Fare adjusted",
        f"Fare changed from {old_fare} to {new_fare_minor} — Reason: {reason}",
        "info",
    )
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking, None, None)


# ── Process refund ────────────────────────────────────────────────────────────

async def process_refund(
    db: AsyncSession,
    booking_id: str,
    amount_minor: int,
    destination: str,
    reason: str,
) -> dict:
    booking = await _load_booking(db, booking_id)

    if booking.status not in ("Cancelled", "Completed", "Disputed"):
        raise ValidationException(
            f"Cannot process refund for booking with status '{booking.status}'"
        )

    if booking.status == "Cancelled":
        booking.status = "Refunded"

    await _add_timeline_event(
        db,
        booking_id,
        "Refund issued",
        f"Amount: {amount_minor} paise — Destination: {destination} — Reason: {reason}",
        "ok",
    )
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking, None, None)


# ── Open dispute ──────────────────────────────────────────────────────────────

async def open_dispute(
    db: AsyncSession,
    booking_id: str,
    reason: str,
    note: str | None,
) -> Dispute:
    booking = await _load_booking(db, booking_id)

    if booking.dispute is not None:
        raise ConflictException("A dispute already exists for this booking")

    dispute_ref = await _generate_dispute_ref(db)
    dispute = Dispute(
        id=str(uuid.uuid4()),
        dispute_ref=dispute_ref,
        booking_id=booking_id,
        reason=reason,
        note=note,
        priority="medium",
        stage="open",
    )
    db.add(dispute)

    booking.status = "Disputed"
    await _add_timeline_event(
        db,
        booking_id,
        "Dispute opened",
        f"{dispute_ref} — {reason}",
        "warn",
    )
    await db.commit()
    await db.refresh(dispute)
    return dispute


# ── Resolve dispute ───────────────────────────────────────────────────────────

async def resolve_dispute(
    db: AsyncSession,
    booking_id: str,
    data: ResolveDisputeBody,
) -> Dispute:
    booking = await _load_booking(db, booking_id)

    if booking.dispute is None:
        raise NotFoundException("Dispute for booking", booking_id)

    dispute = booking.dispute
    dispute.stage = "resolved"
    dispute.action = data.action
    dispute.refund_amount_minor = data.refund_amount_minor
    dispute.driver_clawback_minor = data.driver_clawback_minor
    dispute.resolution_note = data.resolution_note

    await _add_timeline_event(
        db,
        booking_id,
        "Dispute resolved",
        f"Action: {data.action}" + (f" — {data.resolution_note}" if data.resolution_note else ""),
        "ok",
    )
    await db.commit()
    await db.refresh(dispute)
    return dispute


# ── Add note ──────────────────────────────────────────────────────────────────

async def add_note(
    db: AsyncSession,
    booking_id: str,
    note_text: str,
) -> BookingAdminNote:
    # Verify booking exists
    booking = await db.get(RoadBooking, booking_id)
    if not booking:
        raise NotFoundException("RoadBooking", booking_id)

    note = BookingAdminNote(
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
    await db.commit()

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking, None, None)


# ── Telemetry ─────────────────────────────────────────────────────────────────

async def get_telemetry(db: AsyncSession, booking_id: str) -> dict:
    booking = await db.get(RoadBooking, booking_id)
    if not booking:
        raise NotFoundException("RoadBooking", booking_id)

    return {
        "booking_id": booking.id,
        "pickup_lat": booking.pickup_lat,
        "pickup_lng": booking.pickup_lng,
        "drop_lat": booking.drop_lat,
        "drop_lng": booking.drop_lng,
        "gps_points": [],  # Real GPS feed not yet available
        "distance_expected_km": booking.distance_km,
        "distance_actual_km": booking.distance_km,
        "avg_speed_kmh": None,
    }


# ── List disputes ─────────────────────────────────────────────────────────────

async def list_disputes(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    stage: str | None = None,
    priority: str | None = None,
) -> Tuple[List[dict], int]:
    """Return (items_as_dicts, total)."""

    filters = []

    if stage:
        filters.append(Dispute.stage == stage)
    if priority:
        filters.append(Dispute.priority == priority)

    where_clause = and_(*filters) if filters else True  # type: ignore[arg-type]

    # Join with road_bookings for booking_ref and customer data
    stmt_base = (
        select(Dispute, RoadBooking.booking_ref, RoadBooking.customer_id, RoadBooking.fare_final_minor)
        .join(RoadBooking, Dispute.booking_id == RoadBooking.id)
        .where(where_clause)
    )

    if search:
        stmt_base = stmt_base.where(
            or_(
                Dispute.dispute_ref.ilike(f"%{search}%"),
                RoadBooking.booking_ref.ilike(f"%{search}%"),
            )
        )

    count_stmt = select(func.count(Dispute.id)).join(
        RoadBooking, Dispute.booking_id == RoadBooking.id
    ).where(where_clause)
    if search:
        count_stmt = count_stmt.where(
            or_(
                Dispute.dispute_ref.ilike(f"%{search}%"),
                RoadBooking.booking_ref.ilike(f"%{search}%"),
            )
        )

    total: int = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    rows = (
        await db.execute(
            stmt_base.order_by(Dispute.created_at.desc()).offset(offset).limit(page_size)
        )
    ).all()

    # Gather customer names
    customer_ids = [r[2] for r in rows if r[2]]
    customer_map: Dict[str, str] = {}
    if customer_ids:
        c_rows = (
            await db.execute(
                select(Customer.id, Customer.name).where(Customer.id.in_(customer_ids))
            )
        ).all()
        customer_map = {r[0]: r[1] for r in c_rows}

    items = []
    for row in rows:
        dispute: Dispute = row[0]
        booking_ref: str = row[1]
        customer_id: str | None = row[2]
        fare_final: int | None = row[3]

        items.append(
            {
                "id": dispute.id,
                "dispute_ref": dispute.dispute_ref,
                "booking_id": dispute.booking_id,
                "booking_ref": booking_ref,
                "customer_name": customer_map.get(customer_id) if customer_id else None,
                "reason": dispute.reason,
                "disputed_amount_minor": fare_final or 0,
                "priority": dispute.priority,
                "stage": dispute.stage,
                "created_at": dispute.created_at,
            }
        )

    return items, total
