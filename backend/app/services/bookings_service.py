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
from app.core.currency import fmt_major, fmt_minor
from app.services.settings_service import get_base_currency, get_toggle, get_settings, is_in_quiet_window
from app.services import driver_suspension_service
from app.models.settings import PlatformSettings
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
        "pickup_lat": booking.pickup_lat,
        "pickup_lng": booking.pickup_lng,
        "drop_address": booking.drop_address,
        "drop_lat": booking.drop_lat,
        "drop_lng": booking.drop_lng,
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
    customer_id: str | None = None,
) -> Tuple[List[dict], int, Dict[str, Any]]:
    """Return (items_as_dicts, total, stats_dict)."""

    # ── Build base query ──────────────────────────────────────────────────────
    filters = []

    if search:
        like = f"%{search}%"
        # Customer IDs matching the search term (by name or email)
        cust_ids_subq = select(Customer.id).where(
            or_(Customer.name.ilike(like), Customer.phone.ilike(like))
        )
        # Driver IDs matching the search term (by name)
        driver_ids_subq = select(Driver.id).where(Driver.name.ilike(like))
        filters.append(
            or_(
                RoadBooking.booking_ref.ilike(like),
                RoadBooking.customer_phone.ilike(like),
                RoadBooking.driver_vehicle_plate.ilike(like),
                RoadBooking.customer_id.in_(cust_ids_subq),
                RoadBooking.driver_id.in_(driver_ids_subq),
            )
        )
    if status:
        # Support comma-separated multi-status e.g. "InProgress,Accepted,Arrived"
        status_values = [s.strip() for s in status.split(',') if s.strip()]
        if len(status_values) == 1:
            filters.append(RoadBooking.status == status_values[0])
        else:
            filters.append(RoadBooking.status.in_(status_values))
    if service_type:
        filters.append(RoadBooking.service_type == service_type)
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            # Use updated_at so "Cancelled today" catches bookings cancelled today
            # regardless of when they were originally created
            filters.append(RoadBooking.updated_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            filters.append(RoadBooking.updated_at <= dt)
        except ValueError:
            pass
    if flagged is not None:
        filters.append(RoadBooking.flagged == flagged)
    if payment_method:
        filters.append(RoadBooking.payment_method == payment_method)
    if customer_id:
        filters.append(RoadBooking.customer_id == customer_id)

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
    # ── Toggle enforcement ────────────────────────────────────────────────────
    if data.payment_method == "cash" and not await get_toggle(db, "cash_payments"):
        raise ValidationException("Cash payments are currently disabled on this platform.")

    if data.scheduled_at and not await get_toggle(db, "scheduled_rides"):
        raise ValidationException("Scheduled rides are currently disabled on this platform.")

    # ── Quiet hours enforcement ───────────────────────────────────────────────
    _qh_platform = await get_settings(db)
    if is_in_quiet_window(_qh_platform) and _qh_platform.quiet_hours_action == "pause_bookings":
        raise ValidationException(
            f"New bookings are paused during quiet hours "
            f"({_qh_platform.quiet_hours_start}–{_qh_platform.quiet_hours_end}). "
            "Please try again later."
        )

    # ── Max simultaneous active rides per rider ───────────────────────────────
    if data.customer_id:
        _plat = await get_settings(db)
        max_active: int = _plat.max_active_bookings_per_rider if _plat.max_active_bookings_per_rider is not None else 2
        active_count: int = (
            await db.execute(
                select(func.count(RoadBooking.id)).where(
                    and_(
                        RoadBooking.customer_id == data.customer_id,
                        RoadBooking.status.in_(["Requested", "Accepted", "Arrived", "InProgress"]),
                    )
                )
            )
        ).scalar_one()
        if active_count >= max_active:
            raise ValidationException(
                f"Customer already has {active_count} active booking(s) "
                f"(limit: {max_active}). Complete or cancel existing rides first."
            )

    # ── Advance booking window validation ────────────────────────────────────
    if data.scheduled_at:
        platform = await get_settings(db)
        now_utc = datetime.now(timezone.utc)

        # Parse scheduled_at to timezone-aware datetime
        sched = data.scheduled_at
        if isinstance(sched, str):
            sched = datetime.fromisoformat(sched.replace("Z", "+00:00"))
        if sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)

        minutes_ahead = (sched - now_utc).total_seconds() / 60
        days_ahead = minutes_ahead / 1440

        min_advance_minutes: int = platform.min_advance_minutes if platform.min_advance_minutes is not None else 15
        max_advance_days: int = platform.max_advance_days if platform.max_advance_days is not None else 7

        if minutes_ahead < min_advance_minutes:
            raise ValidationException(
                f"Scheduled time must be at least {min_advance_minutes} minute(s) in advance "
                f"(currently {int(minutes_ahead)} min away)."
            )
        if days_ahead > max_advance_days:
            raise ValidationException(
                f"Scheduled time cannot be more than {max_advance_days} day(s) in advance "
                f"(currently {days_ahead:.1f} days away)."
            )

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
    _platform = await get_settings(db)
    initial_radius_km: float = (
        (_platform.dispatch_initial_radius_m / 1000.0)
        if _platform.dispatch_initial_radius_m is not None
        else 2.0
    )

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
        current_radius_km=initial_radius_km,
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

    # Auto-generate fare components so Fare Breakdown tab is never empty
    if data.fare_estimate_minor and data.fare_estimate_minor > 0:
        fare = data.fare_estimate_minor
        # Rough breakdown: ~12% tax band, ~15% base, rest = distance/time
        tax_minor = int(fare * 0.05)           # 5% GST
        base_minor = max(5000, int(fare * 0.15)) # 15% base fare, min ₹50
        discount_minor = -data.promo_discount_minor if (data.promo_code and data.promo_discount_minor) else 0
        dist_time_minor = fare - base_minor - tax_minor + abs(discount_minor)
        components_data = [
            ("Base fare", base_minor),
            ("Distance & time", max(0, dist_time_minor)),
            ("GST · 5%", tax_minor),
        ]
        if discount_minor < 0:
            components_data.append((f"Promo · {data.promo_code}", discount_minor))
        for label, amount in components_data:
            if amount != 0:
                db.add(BookingFareComponent(
                    id=str(uuid.uuid4()),
                    booking_id=booking.id,
                    label=label,
                    rule_ref=None,
                    amount_minor=amount,
                ))

    # Carbon offset — add 5 base-currency units (500 minor) when toggle is on
    if await get_toggle(db, "carbon_offset"):
        _settings = await get_settings(db)
        _currency = _settings.base_currency or "INR"
        db.add(BookingFareComponent(
            id=str(uuid.uuid4()),
            booking_id=booking.id,
            label=f"Carbon offset · {fmt_minor(500, _currency)}",
            rule_ref="carbon_offset",
            amount_minor=500,
        ))

    await db.commit()

    # Reload with relationships
    booking = await _load_booking(db, booking.id)
    return _build_detail_dict(booking, customer_name, None)


# ── Cancellation helpers ──────────────────────────────────────────────────────

async def _get_platform_settings(db: AsyncSession) -> PlatformSettings | None:
    """Load the singleton PlatformSettings row (may be None if not yet seeded)."""
    result = await db.execute(select(PlatformSettings).limit(1))
    return result.scalar_one_or_none()


async def get_cancel_preview(db: AsyncSession, booking_id: str) -> dict:
    """Compute cancellation fee preview using configured platform settings."""
    booking = await _load_booking(db, booking_id)
    settings = await _get_platform_settings(db)

    fare = booking.fare_final_minor or booking.fare_estimate_minor or 0

    # Check free-cancellation window (e.g. within 5 min of booking creation)
    free_window_min: int = (
        settings.cancellation_free_window_min
        if settings and settings.cancellation_free_window_min is not None
        else 5
    )
    now = datetime.now(timezone.utc)
    created = booking.created_at
    if created.tzinfo is None:
        from datetime import timezone as _tz
        created = created.replace(tzinfo=_tz.utc)
    elapsed_min = (now - created).total_seconds() / 60
    is_free_window = elapsed_min <= free_window_min

    # Fee calculation
    fee_pct: float = (
        settings.cancellation_fee_pct
        if settings and settings.cancellation_fee_pct is not None
        else 10.0
    )
    cancel_fee_minor = 0 if is_free_window else max(5000, int(fare * fee_pct / 100))
    net_refund_minor = fare - cancel_fee_minor

    return {
        "booking_id": booking_id,
        "fare_minor": fare,
        "cancel_fee_minor": cancel_fee_minor,
        "net_refund_minor": net_refund_minor,
        "is_free_window": is_free_window,
        "free_window_min": free_window_min,
        "fee_pct": fee_pct,
        "policy": f"{fee_pct:.0f}% cancellation fee · {free_window_min}min free window",
    }


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

    platform = await get_settings(db)

    # Enforce max cancellations per day per customer
    if booking.customer_id:
        max_per_day: int = platform.max_cancellations_per_day if platform.max_cancellations_per_day is not None else 3
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        cancelled_today: int = (
            await db.execute(
                select(func.count(RoadBooking.id)).where(
                    and_(
                        RoadBooking.customer_id == booking.customer_id,
                        RoadBooking.status == "Cancelled",
                        RoadBooking.updated_at >= today_start,
                    )
                )
            )
        ).scalar_one()
        if cancelled_today >= max_per_day:
            raise ValidationException(
                f"Customer has already cancelled {cancelled_today} booking(s) today "
                f"(limit: {max_per_day}). Contact support to override."
            )

    # Use settings-based fee, overridable by admin
    if data.override_fee_minor is not None:
        cancellation_fee = data.override_fee_minor
    else:
        is_no_show = data.reason and "no-show" in data.reason.lower()
        if is_no_show:
            fare = booking.fare_final_minor or booking.fare_estimate_minor or 0
            no_show_fee_pct: float = platform.no_show_fee_pct if platform.no_show_fee_pct is not None else 25.0
            cancellation_fee = max(5000, int(fare * no_show_fee_pct / 100))
        else:
            preview = await get_cancel_preview(db, booking_id)
            cancellation_fee = preview["cancel_fee_minor"]

    # Fall back to platform default refund destination if not specified
    refund_dest = data.refund_destination
    if not refund_dest or refund_dest == "none":
        refund_dest = platform.refund_destination_default or "original"

    driver_id_before_cancel = booking.driver_id

    booking.status = "Cancelled"
    timeline_detail = f"Reason: {data.reason}"
    if data.note:
        timeline_detail += f" — {data.note}"
    timeline_detail += f" — Refund to: {refund_dest}"
    if data.reason and "no-show" in data.reason.lower():
        no_show_wait: int = platform.no_show_wait_minutes if platform.no_show_wait_minutes is not None else 5
        timeline_detail += f" — No-show wait enforced: {no_show_wait}min"
    await _add_timeline_event(db, booking_id, "Booking cancelled", timeline_detail, "warn")
    await db.commit()
    await db.refresh(booking)

    # ── Auto-suspension threshold enforcement ─────────────────────────────────
    if driver_id_before_cancel:
        try:
            await driver_suspension_service.update_driver_metrics_on_cancellation(
                db, driver_id_before_cancel
            )
            await driver_suspension_service.check_and_auto_suspend(db, driver_id_before_cancel)
        except Exception:
            pass

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

    if booking.status not in ("Requested", "Accepted", "Arrived", "InProgress"):
        raise ValidationException(
            f"Can only reassign driver when status is Requested/Accepted/Arrived/InProgress (current: {booking.status})"
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

    if booking.status not in ("Completed", "InProgress", "Disputed"):
        raise ValidationException(
            f"Can only adjust fare when status is Completed, InProgress, or Disputed (current: {booking.status})"
        )

    old_fare = booking.fare_final_minor or booking.fare_estimate_minor
    booking.fare_final_minor = new_fare_minor

    # Record as a fare component entry
    db.add(BookingFareComponent(
        id=str(uuid.uuid4()),
        booking_id=booking_id,
        label=f"Fare adjustment · {reason[:60]}",
        rule_ref=None,
        amount_minor=new_fare_minor - old_fare,
    ))

    currency = await get_base_currency(db)
    await _add_timeline_event(
        db,
        booking_id,
        "Fare adjusted",
        f"{fmt_major(old_fare / 100, currency)} → {fmt_major(new_fare_minor / 100, currency)} — Reason: {reason}",
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

    # Fall back to platform default refund destination if not provided
    if not destination:
        platform = await get_settings(db)
        destination = platform.refund_destination_default or "original"

    # Always transition to Refunded once a refund is processed
    booking.status = "Refunded"
    booking.updated_at = datetime.now(timezone.utc)

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

    # Update booking status based on the resolution action
    # partial_refund / full_refund → Refunded
    # uphold_fare / goodwill_credit → Completed (fare stands, dispute closed)
    if data.action in ("partial_refund", "full_refund"):
        booking.status = "Refunded"
    else:
        booking.status = "Completed"

    booking.updated_at = datetime.now(timezone.utc)

    await _add_timeline_event(
        db,
        booking_id,
        "Dispute resolved",
        f"Action: {data.action} — {data.resolution_note}" if data.resolution_note else f"Action: {data.action}",
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


# ── Advance status (ops workflow) ─────────────────────────────────────────────

# Allowed manual transitions for ops/admin use
_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "Requested":  ["Accepted", "Cancelled"],
    "Accepted":   ["Arrived", "Cancelled"],
    "Arrived":    ["InProgress", "Cancelled"],
    "InProgress": ["Completed", "Cancelled"],
}

_TRANSITION_EVENTS: dict[str, str] = {
    "Accepted":   "Driver accepted",
    "Arrived":    "Driver arrived at pickup",
    "InProgress": "Trip started",
    "Completed":  "Trip completed",
    "Cancelled":  "Booking cancelled (manual)",
}


async def advance_status(
    db: AsyncSession,
    booking_id: str,
    new_status: str,
    note: str | None = None,
) -> dict:
    """Manually advance booking status. Used by ops when no driver app is available."""
    booking = await _load_booking(db, booking_id)

    allowed = _STATUS_TRANSITIONS.get(booking.status, [])
    if new_status not in allowed:
        raise ValidationException(
            f"Cannot transition from '{booking.status}' to '{new_status}'. "
            f"Allowed: {', '.join(allowed) if allowed else 'none'}"
        )

    booking.status = new_status
    booking.updated_at = datetime.now(timezone.utc)

    # On trip completion, apply waiting charge if the driver was kept waiting
    if new_status == "Completed":
        platform = await get_settings(db)
        free_wait_min: int = platform.free_waiting_minutes if platform.free_waiting_minutes is not None else 3
        charge_per_min: float = platform.waiting_charge_per_min if platform.waiting_charge_per_min is not None else 0.0
        if charge_per_min > 0:
            # arrived_at is recorded in timeline; use created_at as fallback proxy
            arrived_events = [
                e for e in (booking.timeline_events or [])
                if "arrived" in (e.event or "").lower()
            ]
            if arrived_events:
                arrived_at = arrived_events[-1].created_at
                if arrived_at.tzinfo is None:
                    arrived_at = arrived_at.replace(tzinfo=timezone.utc)
                wait_min = (datetime.now(timezone.utc) - arrived_at).total_seconds() / 60
                billable_wait = max(0.0, wait_min - free_wait_min)
                if billable_wait > 0:
                    wait_charge_minor = int(billable_wait * charge_per_min * 100)
                    db.add(BookingFareComponent(
                        id=str(uuid.uuid4()),
                        booking_id=booking_id,
                        label=f"Waiting charge · {billable_wait:.1f}min @ ₹{charge_per_min}/min",
                        rule_ref="platform_waiting_charge",
                        amount_minor=wait_charge_minor,
                    ))
                    if booking.fare_final_minor:
                        booking.fare_final_minor += wait_charge_minor
                    elif booking.fare_estimate_minor:
                        booking.fare_final_minor = booking.fare_estimate_minor + wait_charge_minor

    await _add_timeline_event(
        db,
        booking_id,
        _TRANSITION_EVENTS.get(new_status, f"Status → {new_status}"),
        note or "Advanced manually via admin panel",
        "ok" if new_status == "Completed" else "info",
    )

    await db.commit()

    # ── Auto-suspension threshold enforcement ─────────────────────────────────
    # Re-load booking after commit so driver_id is available
    _b = await _load_booking(db, booking_id)
    if _b.driver_id:
        try:
            if new_status == "Completed":
                await driver_suspension_service.update_driver_metrics_on_completion(
                    db, _b.driver_id, driver_rating=None
                )
            elif new_status == "Cancelled":
                await driver_suspension_service.update_driver_metrics_on_cancellation(
                    db, _b.driver_id
                )
            await driver_suspension_service.check_and_auto_suspend(db, _b.driver_id)
        except Exception:
            pass  # never let metric update break the booking response

    booking = await _load_booking(db, booking_id)
    return _build_detail_dict(booking, None, None)
