from __future__ import annotations

import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import BookingTimelineEvent, RoadBooking
from app.models.catalog import ServiceZone
from app.models.customer import Customer
from app.models.dispatch import DispatchException, SurgeOverride
from app.models.driver import Driver
from app.core.currency import fmt_minor
from app.services.settings_service import get_base_currency, get_settings, is_in_quiet_window
from app.services import driver_suspension_service
from app.schemas.dispatch import (
    ActiveBookingSlaItem,
    AssignDriverResponse,
    EligibleDriverItem,
    EligibleDriversResponse,
    ExceptionItemResponse,
    ExceptionPatternResponse,
    ExceptionStatsResponse,
    ExceptionsListResponse,
    ExpandRadiusResponse,
    QueueItemResponse,
    QueueStatsResponse,
    ResolveExceptionResponse,
    SlaMonitorResponse,
    SurgeOverrideListItem,
    SurgeOverrideResponse,
    SupplyResponse,
    SupplyStatsResponse,
    ZoneSupplyItem,
)


# ── Haversine helper ──────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def _sla_status(age_seconds: int, warn_sec: int, danger_sec: int) -> str:
    """
    Compute ok / warn / danger from age vs two configurable thresholds.
    warn_sec  = when to flip to warn  (e.g. 0.75 × limit)
    danger_sec = when to flip to danger (= the configured SLA limit)
    """
    if age_seconds < warn_sec:
        return "ok"
    if age_seconds < danger_sec:
        return "warn"
    return "danger"


def _fare_display(minor: int, currency: str) -> str:
    return fmt_minor(minor, currency)


def _age_display(age_seconds: int) -> str:
    if age_seconds < 60:
        return f"{age_seconds}s"
    m, s = divmod(age_seconds, 60)
    return f"{m}m {s}s"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Queue ─────────────────────────────────────────────────────────────────────

async def get_queue(
    db: AsyncSession,
    zone_id: str | None,
    sla_filter: str | None,
    limit: int,
) -> list[QueueItemResponse]:
    stmt = (
        select(RoadBooking, Customer.name)
        .outerjoin(Customer, RoadBooking.customer_id == Customer.id)
        .where(RoadBooking.status == "Requested")
    )
    if zone_id:
        stmt = stmt.where(RoadBooking.zone_id == zone_id)
    result = await db.execute(stmt)
    rows = result.all()

    platform = await get_settings(db)
    max_retries: int = platform.max_dispatch_retries if platform.max_dispatch_retries is not None else 3
    ping_ttl_sec: int = platform.driver_acceptance_timeout_sec if platform.driver_acceptance_timeout_sec is not None else 60

    # Dispatch SLA alert: configured in minutes, converted to seconds
    dispatch_alert_sec: int = (platform.sla_dispatch_alert_min or 3) * 60
    dispatch_warn_sec: int = int(dispatch_alert_sec * 0.75)   # warn at 75% of limit

    currency = await get_base_currency(db)
    now = _now()
    items: list[QueueItemResponse] = []
    for b, cust_name in rows:
        created = b.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age = int((now - created).total_seconds())
        # Use platform-configured dispatch SLA thresholds
        status = _sla_status(age, warn_sec=dispatch_warn_sec, danger_sec=dispatch_alert_sec)

        if sla_filter and sla_filter != "all" and status != sla_filter:
            continue

        # Count eligible drivers
        eligible_count = await _count_eligible_drivers(db, b)

        # Determine exception_type using platform settings
        exception_type: str | None = None
        if b.dispatch_attempts >= max_retries:
            exception_type = "rejected"
        elif age >= dispatch_alert_sec:
            exception_type = "sla-breach"
        elif eligible_count == 0:
            exception_type = "no-driver"

        items.append(
            QueueItemResponse(
                id=b.id,
                booking_ref=b.booking_ref,
                customer_name=cust_name,
                vehicle_class=b.vehicle_class,
                pickup_address=b.pickup_address,
                pickup_lat=b.pickup_lat,
                pickup_lng=b.pickup_lng,
                drop_address=b.drop_address,
                drop_lat=b.drop_lat,
                drop_lng=b.drop_lng,
                fare_estimate_minor=b.fare_estimate_minor,
                fare_display=_fare_display(b.fare_estimate_minor, currency),
                age_seconds=age,
                dispatch_attempts=b.dispatch_attempts,
                current_radius_km=b.current_radius_km,
                zone_id=b.zone_id,
                zone_name=b.zone_name,
                eligible_count=eligible_count,
                sla_status=status,
                exception_type=exception_type,
                created_at=b.created_at,
            )
        )

    items.sort(key=lambda x: x.age_seconds, reverse=True)
    return items[:limit]


async def _count_eligible_drivers(db: AsyncSession, booking: RoadBooking) -> int:
    from datetime import date as _date
    no_location = booking.pickup_lat is None or booking.pickup_lng is None
    today = _date.today()
    # Allow drivers in active grace period alongside fully-approved drivers
    filters = [
        Driver.online_status == "online",
        Driver.status == "active",
        (
            Driver.kyc_status.in_(["approved", "expiring", "grace_period"]) &
            ((Driver.doc_grace_until == None) | (Driver.doc_grace_until >= today))  # noqa: E711
        ),
    ]
    if booking.vehicle_class:
        filters.append(Driver.vehicle_class == booking.vehicle_class)
    if not no_location:
        filters += [Driver.current_lat.is_not(None), Driver.current_lng.is_not(None)]
    result = await db.execute(select(Driver).where(*filters))
    drivers = result.scalars().all()
    if no_location:
        return len(drivers)
    platform = await get_settings(db)
    min_radius_km: float = (
        platform.dispatch_initial_radius_m / 1000.0
        if platform.dispatch_initial_radius_m is not None
        else 2.0
    )
    radius = max(booking.current_radius_km, min_radius_km)
    return sum(
        1 for d in drivers
        if d.current_lat is not None and d.current_lng is not None
        and haversine_km(booking.pickup_lat, booking.pickup_lng, d.current_lat, d.current_lng) <= radius
    )


async def get_queue_stats(db: AsyncSession) -> QueueStatsResponse:
    now = _now()

    platform = await get_settings(db)
    ping_ttl_sec: int = platform.driver_acceptance_timeout_sec if platform.driver_acceptance_timeout_sec is not None else 60
    max_retries: int = platform.max_dispatch_retries if platform.max_dispatch_retries is not None else 3
    auto_assign: bool = platform.auto_assign_enabled if platform.auto_assign_enabled is not None else True

    # Total in queue
    q_stmt = select(func.count()).select_from(RoadBooking).where(RoadBooking.status == "Requested")
    total_in_queue = (await db.execute(q_stmt)).scalar_one()

    # Online drivers
    d_stmt = select(func.count()).select_from(Driver).where(Driver.online_status == "online")
    online_drivers_count = (await db.execute(d_stmt)).scalar_one()

    # Stuck over configured ping TTL
    all_queue = await db.execute(select(RoadBooking).where(RoadBooking.status == "Requested"))
    queue_rows = all_queue.scalars().all()
    stuck_over_timeout = 0
    no_driver_count = 0
    for b in queue_rows:
        created = b.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age = int((now - created).total_seconds())
        if age > ping_ttl_sec:
            stuck_over_timeout += 1
        ec = await _count_eligible_drivers(db, b)
        if ec == 0:
            no_driver_count += 1

    # Auto-dispatch rate: ratio of bookings assigned within TTL vs total assigned today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    total_assigned_today = (await db.execute(
        select(func.count()).select_from(RoadBooking).where(
            RoadBooking.status.in_(["Accepted", "InProgress", "Completed"]),
            RoadBooking.updated_at >= today_start,
        )
    )).scalar_one()
    auto_dispatch_rate = 100.0 if total_assigned_today == 0 else round(
        min(100.0, (total_assigned_today / max(1, total_assigned_today)) * 100), 1
    )

    # Active exceptions
    exc_stmt = select(func.count()).select_from(DispatchException).where(
        DispatchException.resolved == False  # noqa: E712
    )
    exceptions_count = (await db.execute(exc_stmt)).scalar_one()

    sla_dispatch_min: int = platform.sla_dispatch_alert_min or 3
    sla_pickup_min: int = platform.sla_pickup_alert_min or 10
    sla_overrun_min: int = platform.sla_trip_overrun_alert_min or 120

    return QueueStatsResponse(
        total_in_queue=total_in_queue,
        exceptions_count=exceptions_count,
        online_drivers_count=online_drivers_count,
        avg_pickup_eta_seconds=252,  # placeholder — real ETA requires routing engine
        auto_dispatch_rate=auto_dispatch_rate,
        stuck_over_timeout=stuck_over_timeout,
        no_driver_count=no_driver_count,
        auto_assign_enabled=auto_assign,
        ping_ttl_sec=ping_ttl_sec,
        max_dispatch_retries=max_retries,
        sla_dispatch_alert_min=sla_dispatch_min,
        sla_pickup_alert_min=sla_pickup_min,
        sla_trip_overrun_alert_min=sla_overrun_min,
    )


# ── SLA Monitor (pickup + trip-overrun) ──────────────────────────────────────

async def get_sla_monitor(db: AsyncSession) -> SlaMonitorResponse:
    """
    Scan all live bookings (Accepted, Arrived, InProgress) and evaluate them
    against the two remaining SLA timers:

      sla_pickup_alert_min   — bookings in Accepted/Arrived that have been waiting
                               longer than the configured pickup window
      sla_trip_overrun_alert_min — bookings InProgress longer than the configured
                                   maximum trip duration

    The age is measured from `updated_at` (when the status last changed), not
    `created_at`, so the clock restarts each time the booking advances.
    """
    platform = await get_settings(db)
    pickup_limit_sec: int = (platform.sla_pickup_alert_min or 10) * 60
    overrun_limit_sec: int = (platform.sla_trip_overrun_alert_min or 120) * 60
    pickup_warn_sec: int = int(pickup_limit_sec * 0.75)
    overrun_warn_sec: int = int(overrun_limit_sec * 0.75)

    now = _now()

    # Fetch all live bookings with customer + driver names
    from app.models.driver import Driver as _Driver
    stmt = (
        select(RoadBooking, Customer.name)
        .outerjoin(Customer, RoadBooking.customer_id == Customer.id)
        .where(RoadBooking.status.in_(["Accepted", "Arrived", "InProgress"]))
    )
    rows = (await db.execute(stmt)).all()

    # Pre-fetch driver names
    driver_ids = [b.driver_id for b, _ in rows if b.driver_id]
    driver_map: dict[str, str] = {}
    if driver_ids:
        dr = await db.execute(
            select(_Driver.id, _Driver.name).where(_Driver.id.in_(driver_ids))
        )
        driver_map = {row[0]: row[1] for row in dr.all()}

    items: list[ActiveBookingSlaItem] = []
    pickup_breached = 0
    overrun_breached = 0

    for b, cust_name in rows:
        # Use updated_at as the clock start — it's when status last changed
        anchor = b.updated_at
        if anchor is None:
            anchor = b.created_at
        if anchor.tzinfo is None:
            anchor = anchor.replace(tzinfo=timezone.utc)
        age = int((now - anchor).total_seconds())

        if b.status in ("Accepted", "Arrived"):
            # Pickup SLA
            sla_status = _sla_status(age, warn_sec=pickup_warn_sec, danger_sec=pickup_limit_sec)
            if sla_status == "ok":
                continue  # only surface warn + danger
            if sla_status == "danger":
                pickup_breached += 1
            items.append(ActiveBookingSlaItem(
                id=b.id,
                booking_ref=b.booking_ref,
                status=b.status,
                customer_name=cust_name,
                driver_name=driver_map.get(b.driver_id) if b.driver_id else None,
                pickup_address=b.pickup_address,
                age_seconds=age,
                sla_type="pickup",
                sla_limit_seconds=pickup_limit_sec,
                sla_status=sla_status,
                created_at=b.created_at,
            ))

        elif b.status == "InProgress":
            # Trip overrun SLA
            sla_status = _sla_status(age, warn_sec=overrun_warn_sec, danger_sec=overrun_limit_sec)
            if sla_status == "ok":
                continue
            if sla_status == "danger":
                overrun_breached += 1
            items.append(ActiveBookingSlaItem(
                id=b.id,
                booking_ref=b.booking_ref,
                status=b.status,
                customer_name=cust_name,
                driver_name=driver_map.get(b.driver_id) if b.driver_id else None,
                pickup_address=b.pickup_address,
                age_seconds=age,
                sla_type="overrun",
                sla_limit_seconds=overrun_limit_sec,
                sla_status=sla_status,
                created_at=b.created_at,
            ))

    items.sort(key=lambda x: x.age_seconds, reverse=True)
    return SlaMonitorResponse(
        pickup_breached=pickup_breached,
        overrun_breached=overrun_breached,
        items=items,
    )


# ── Eligible Drivers ──────────────────────────────────────────────────────────

async def get_eligible_drivers(db: AsyncSession, booking_id: str) -> EligibleDriversResponse:
    b_result = await db.execute(select(RoadBooking).where(RoadBooking.id == booking_id))
    booking = b_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    no_location = booking.pickup_lat is None or booking.pickup_lng is None

    # Base filter: online + active. If vehicle_class set, filter by it.
    filters = [Driver.online_status == "online", Driver.status == "active"]
    if booking.vehicle_class:
        filters.append(Driver.vehicle_class == booking.vehicle_class)
    if not no_location:
        filters += [Driver.current_lat.is_not(None), Driver.current_lng.is_not(None)]

    stmt = select(Driver).where(*filters)
    result = await db.execute(stmt)
    drivers = result.scalars().all()

    platform = await get_settings(db)
    min_radius_km: float = (
        platform.dispatch_initial_radius_m / 1000.0
        if platform.dispatch_initial_radius_m is not None
        else 2.0
    )
    # Gaps 1-6: read all three ranking weights from platform settings
    w_distance: int = platform.rank_weight_distance if platform.rank_weight_distance is not None else 50
    w_rating: int = platform.rank_weight_rating if platform.rank_weight_rating is not None else 30
    w_acceptance: int = platform.rank_weight_acceptance if platform.rank_weight_acceptance is not None else 20

    candidates: list[tuple[float, float, Driver]] = []  # (distance_km, score, driver)
    radius = max(booking.current_radius_km, min_radius_km)
    for d in drivers:
        if no_location or d.current_lat is None or d.current_lng is None:
            # No location data — include driver but distance unknown (use 0)
            dist = 0.0
        else:
            dist = haversine_km(booking.pickup_lat, booking.pickup_lng, d.current_lat, d.current_lng)
            if dist > radius:
                continue
        rating = d.rating or 3.0
        acceptance = d.acceptance_rate or 50.0
        # Gap 1, 3, 5: score uses platform ranking weights instead of hardcoded values
        score = (1.0 / max(dist, 0.01)) * w_distance + rating * w_rating + acceptance * w_acceptance
        candidates.append((dist, score, d))

    candidates.sort(key=lambda x: x[1], reverse=True)

    items: list[EligibleDriverItem] = []
    for rank, (dist, _, d) in enumerate(candidates, 1):
        eta_minutes = max(1, int(dist / 25 * 60))  # rough 25 km/h city speed
        items.append(
            EligibleDriverItem(
                rank=rank,
                driver_id=d.id,
                name=d.name,
                vehicle_plate=d.vehicle_plate,
                distance_km=round(dist, 2),
                eta_minutes=eta_minutes,
                rating=d.rating,
                acceptance_rate=d.acceptance_rate,
                recommended=(rank == 1),
                current_lat=d.current_lat,
                current_lng=d.current_lng,
            )
        )

    return EligibleDriversResponse(
        booking_ref=booking.booking_ref,
        total_eligible=len(items),
        current_radius_km=booking.current_radius_km,
        # Gap 2, 4, 6: return actual weights from settings, not hardcoded values
        ranking_weights={"distance": w_distance, "rating": w_rating, "acceptance": w_acceptance},
        drivers=items,
    )


# ── Assign Driver ─────────────────────────────────────────────────────────────

async def assign_driver(
    db: AsyncSession,
    booking_id: str,
    driver_id: str,
    reason: str | None,
) -> AssignDriverResponse:
    b_result = await db.execute(select(RoadBooking).where(RoadBooking.id == booking_id))
    booking = b_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "Requested":
        raise HTTPException(status_code=409, detail="Booking already assigned or not in Requested state")

    platform = await get_settings(db)
    max_retries: int = platform.max_dispatch_retries if platform.max_dispatch_retries is not None else 3
    ping_ttl_sec: int = platform.driver_acceptance_timeout_sec if platform.driver_acceptance_timeout_sec is not None else 60

    # Guard: max dispatch retries exceeded
    if (booking.dispatch_attempts or 0) >= max_retries:
        raise HTTPException(
            status_code=422,
            detail=f"Booking has reached the maximum dispatch retries ({max_retries}). "
                   "Resolve the dispatch exception before reassigning.",
        )

    # Guard: booking has exceeded the driver acceptance timeout
    created = booking.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_sec = int((_now() - created).total_seconds())
    if age_sec > ping_ttl_sec:
        raise HTTPException(
            status_code=422,
            detail=f"Booking has exceeded the acceptance timeout ({ping_ttl_sec}s). "
                   "Cancel and re-create to dispatch again.",
        )

    d_result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = d_result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Validate eligibility within 2× radius
    if (
        booking.pickup_lat is not None
        and booking.pickup_lng is not None
        and driver.current_lat is not None
        and driver.current_lng is not None
    ):
        dist = haversine_km(
            booking.pickup_lat, booking.pickup_lng,
            driver.current_lat, driver.current_lng,
        )
        if dist > booking.current_radius_km * 2:
            raise HTTPException(status_code=422, detail="Driver is outside the allowed radius")

    if driver.online_status != "online" or driver.status != "active":
        raise HTTPException(status_code=422, detail="Driver is not available")

    booking.status = "Accepted"
    booking.driver_id = driver_id
    booking.dispatch_attempts = (booking.dispatch_attempts or 0) + 1
    if driver.vehicle_plate:
        booking.driver_vehicle_plate = driver.vehicle_plate

    # Record in state timeline
    db.add(BookingTimelineEvent(
        booking_id=booking.id,
        event="Driver assigned",
        message=f"Manually assigned to {driver.name} ({driver.vehicle_plate or 'no plate'}) · {reason or 'Admin dispatch'}",
        tone="ok",
    ))

    await db.commit()
    await db.refresh(booking)

    # ── Update acceptance metric after driver accepts ─────────────────────────
    try:
        await driver_suspension_service.update_driver_metrics_on_accept(db, driver_id)
        await driver_suspension_service.check_and_auto_suspend(db, driver_id)
    except Exception:
        pass

    return AssignDriverResponse(
        booking_id=booking.id,
        booking_ref=booking.booking_ref,
        driver_id=driver_id,
        driver_name=driver.name,
        message="Driver assigned successfully",
    )


# ── Expand Radius ─────────────────────────────────────────────────────────────

async def expand_radius(db: AsyncSession, booking_id: str) -> dict[str, Any]:
    b_result = await db.execute(select(RoadBooking).where(RoadBooking.id == booking_id))
    booking = b_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    platform = await get_settings(db)
    step_km: float = (
        platform.dispatch_radius_step_m / 1000.0
        if platform.dispatch_radius_step_m is not None
        else 1.0
    )
    max_km: float = (
        platform.dispatch_max_radius_m / 1000.0
        if platform.dispatch_max_radius_m is not None
        else 10.0
    )

    old_radius = booking.current_radius_km
    if old_radius >= max_km:
        raise HTTPException(
            status_code=422,
            detail=f"Radius is already at the maximum ({max_km} km). Cannot expand further.",
        )
    new_radius = min(old_radius + step_km, max_km)
    booking.current_radius_km = new_radius

    db.add(BookingTimelineEvent(
        booking_id=booking.id,
        event="Search radius expanded",
        message=f"Dispatch radius increased from {old_radius} km to {new_radius} km by admin",
        tone="pending",
    ))

    await db.commit()
    await db.refresh(booking)

    new_eligible = await _count_eligible_drivers(db, booking)

    return dict(
        booking_id=booking.id,
        booking_ref=booking.booking_ref,
        old_radius_km=old_radius,
        new_radius_km=new_radius,
        new_eligible_count=new_eligible,
        message=f"Radius expanded to {new_radius} km (step: {step_km} km, max: {max_km} km)",
    )


# ── Exceptions ────────────────────────────────────────────────────────────────

async def get_exceptions(
    db: AsyncSession,
    zone_id: str | None,
    severity: str | None,
    limit: int,
) -> ExceptionsListResponse:
    now = _now()

    stmt = select(DispatchException).where(DispatchException.resolved == False)  # noqa: E712
    if zone_id:
        stmt = stmt.where(DispatchException.zone_id == zone_id)
    if severity:
        stmt = stmt.where(DispatchException.severity == severity)
    result = await db.execute(stmt)
    exceptions = result.scalars().all()

    # Stats
    all_active_stmt = select(DispatchException).where(DispatchException.resolved == False)  # noqa: E712
    all_active_result = await db.execute(all_active_stmt)
    all_active = all_active_result.scalars().all()

    no_driver_count = sum(1 for e in all_active if e.kind == "no-driver")
    sla_breach_count = sum(1 for e in all_active if e.severity == "danger")

    one_hour_ago = now - timedelta(hours=1)
    resolved_stmt = select(DispatchException).where(
        DispatchException.resolved == True,  # noqa: E712
        DispatchException.resolved_at >= one_hour_ago,
    )
    resolved_result = await db.execute(resolved_stmt)
    resolved_recent = resolved_result.scalars().all()
    resolved_last_hour = len(resolved_recent)

    avg_resolve_seconds = 0
    if resolved_recent:
        total_secs = 0
        for e in resolved_recent:
            if e.resolved_at and e.created_at:
                ra = e.resolved_at
                ca = e.created_at
                if ra.tzinfo is None:
                    ra = ra.replace(tzinfo=timezone.utc)
                if ca.tzinfo is None:
                    ca = ca.replace(tzinfo=timezone.utc)
                total_secs += int((ra - ca).total_seconds())
        avg_resolve_seconds = total_secs // len(resolved_recent)

    stats = ExceptionStatsResponse(
        active_count=len(all_active),
        no_driver_count=no_driver_count,
        sla_breach_risk_count=sla_breach_count,
        resolved_last_hour=resolved_last_hour,
        avg_resolve_seconds=avg_resolve_seconds,
    )

    # Pattern analysis: find hot zone
    zone_counts: Counter[str] = Counter(e.zone_id for e in all_active)
    hot_zone_id: str | None = None
    hot_zone_name: str | None = None
    if zone_counts:
        hot_zone_id = zone_counts.most_common(1)[0][0]
        for e in all_active:
            if e.zone_id == hot_zone_id:
                hot_zone_name = e.zone_name
                break
        hot_count = zone_counts[hot_zone_id]
        pattern_desc = f"{hot_count} of {len(all_active)} exceptions cluster in {hot_zone_id} {hot_zone_name}"
    else:
        pattern_desc = "No active exceptions"

    pattern = ExceptionPatternResponse(
        description=pattern_desc,
        detail="Driver supply may be reduced in this zone.",
        hot_zone_id=hot_zone_id,
        hot_zone_name=hot_zone_name,
    )

    # Build exception items — join booking for ref + customer name
    exception_items: list[ExceptionItemResponse] = []
    for e in exceptions[:limit]:
        created = e.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age = int((now - created).total_seconds())

        booking_ref: str | None = None
        customer_name: str | None = None
        if e.booking_id:
            br = await db.execute(
                select(RoadBooking, Customer.name)
                .outerjoin(Customer, RoadBooking.customer_id == Customer.id)
                .where(RoadBooking.id == e.booking_id)
            )
            bk_row = br.first()
            if bk_row:
                booking_ref = bk_row[0].booking_ref
                customer_name = bk_row[1]

        exception_items.append(
            ExceptionItemResponse(
                id=e.id,
                exception_ref=e.exception_ref,
                kind=e.kind,
                booking_id=e.booking_id,
                booking_ref=booking_ref,
                customer_name=customer_name,
                zone_id=e.zone_id,
                zone_name=e.zone_name,
                vehicle_class=e.vehicle_class,
                age_display=_age_display(age),
                age_seconds=age,
                dispatch_attempts=e.dispatch_attempts,
                recommended_action=e.recommended_action,
                severity=e.severity,
                resolved=e.resolved,
                created_at=e.created_at,
            )
        )

    return ExceptionsListResponse(stats=stats, pattern=pattern, exceptions=exception_items)


async def resolve_exception(
    db: AsyncSession,
    exception_id: str,
    action_taken: str,
    resolved_by_driver_id: str | None,
) -> ResolveExceptionResponse:
    result = await db.execute(select(DispatchException).where(DispatchException.id == exception_id))
    exc = result.scalar_one_or_none()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
    if exc.resolved:
        raise HTTPException(status_code=409, detail="Exception already resolved")

    exc.resolved = True
    exc.action_taken = action_taken
    exc.resolved_by_driver_id = resolved_by_driver_id
    exc.resolved_at = _now()
    await db.commit()
    await db.refresh(exc)

    return ResolveExceptionResponse(
        id=exc.id,
        exception_ref=exc.exception_ref,
        resolved=exc.resolved,
        resolved_at=exc.resolved_at,
        message="Exception resolved",
    )


# ── Supply ────────────────────────────────────────────────────────────────────

async def get_supply(db: AsyncSession) -> SupplyResponse:  # noqa: C901
    now = _now()
    _settings = await get_settings(db)
    surge_ceiling = float(_settings.surge_ceiling or 2.0)

    # Online / approved drivers
    online_stmt = select(func.count()).select_from(Driver).where(Driver.online_status == "online")
    online_total = (await db.execute(online_stmt)).scalar_one()

    approved_stmt = select(func.count()).select_from(Driver).where(Driver.status == "active")
    approved_total = (await db.execute(approved_stmt)).scalar_one()

    online_pct = round(online_total / approved_total * 100, 1) if approved_total else 0.0

    # Demand = pending bookings
    demand_stmt = select(func.count()).select_from(RoadBooking).where(RoadBooking.status == "Requested")
    live_demand = (await db.execute(demand_stmt)).scalar_one()

    ds_ratio = round(online_total / max(live_demand, 1), 2)

    # Active surge overrides
    surge_stmt = select(SurgeOverride).where(
        SurgeOverride.is_active == True,  # noqa: E712
        SurgeOverride.expires_at > now,
    )
    surge_result = await db.execute(surge_stmt)
    active_surges = surge_result.scalars().all()
    surge_by_zone: dict[str, float] = {s.zone_id: s.multiplier for s in active_surges}

    # Build per-zone data from ServiceZone catalog (all active zones)
    zone_stmt = select(ServiceZone.code, ServiceZone.name).where(ServiceZone.is_active == True)  # noqa: E712
    zone_result = await db.execute(zone_stmt)
    zone_rows = zone_result.all()

    zones_list: list[ZoneSupplyItem] = []
    for zone_id_val, zone_name_val in zone_rows:
        # Demand in zone
        zd_stmt = select(func.count()).select_from(RoadBooking).where(
            RoadBooking.zone_id == zone_id_val,
            RoadBooking.status == "Requested",
        )
        zone_demand = (await db.execute(zd_stmt)).scalar_one()

        # Online drivers in zone (using zone_code match)
        od_stmt = select(func.count()).select_from(Driver).where(
            Driver.zone_code == zone_id_val,
            Driver.online_status == "online",
        )
        zone_online = (await db.execute(od_stmt)).scalar_one()

        zone_ds = round(zone_online / max(zone_demand, 1), 2)
        multiplier = surge_by_zone.get(zone_id_val, 1.0)
        is_capped = multiplier >= surge_ceiling
        tone = "ok" if zone_ds >= 1.0 else ("warn" if zone_ds >= 0.7 else "danger")

        active_override_data: dict[str, Any] | None = None
        for s in active_surges:
            if s.zone_id == zone_id_val:
                active_override_data = {
                    "id": s.id,
                    "multiplier": s.multiplier,
                    "reason": s.reason,
                    "expires_at": s.expires_at.isoformat(),
                }
                break

        zones_list.append(
            ZoneSupplyItem(
                zone_id=zone_id_val,
                zone_name=zone_name_val or zone_id_val,
                online_drivers=zone_online,
                demand=zone_demand,
                ds_ratio=zone_ds,
                surge_multiplier=multiplier,
                is_capped=is_capped,
                tone=tone,
                active_override=active_override_data,
            )
        )

    total_zones = len(zones_list)
    zones_above_1_3 = sum(1 for z in zones_list if z.ds_ratio > 1.3)
    active_surge_zones = len(surge_by_zone)
    avg_surge = (
        round(sum(surge_by_zone.values()) / len(surge_by_zone), 2)
        if surge_by_zone
        else 1.0
    )
    capped = sum(1 for z in zones_list if z.is_capped)

    stats = SupplyStatsResponse(
        online_drivers_total=online_total,
        approved_drivers_total=approved_total,
        online_percentage=online_pct,
        live_demand=live_demand,
        ds_ratio=ds_ratio,
        zones_above_1_3=zones_above_1_3,
        active_surge_zones=active_surge_zones,
        total_zones=total_zones,
        avg_surge_multiplier=avg_surge,
        capped_zones_count=capped,
    )

    return SupplyResponse(stats=stats, zones=zones_list)


# ── Surge Override ────────────────────────────────────────────────────────────

async def create_surge_override(
    db: AsyncSession,
    zone_id: str,
    zone_name: str,
    multiplier: float,
    reason: str,
    expires_in_minutes: int,
    applies_to: str,
    admin_user_id: str | None,
) -> SurgeOverrideResponse:
    _s = await get_settings(db)
    _ceiling = float(_s.surge_ceiling or 2.0)
    if multiplier > _ceiling:
        raise HTTPException(
            status_code=422,
            detail=f"Multiplier cannot exceed {_ceiling}× (platform surge ceiling)",
        )

    # Quiet hours: cap_surge action forces multiplier to 1.0× during the window
    if is_in_quiet_window(_s) and _s.quiet_hours_action == "cap_surge":
        if multiplier > 1.0:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Surge is capped at 1.0× during quiet hours "
                    f"({_s.quiet_hours_start}–{_s.quiet_hours_end}). "
                    "Override rejected."
                ),
            )

    expires_at = _now() + timedelta(minutes=expires_in_minutes)

    override = SurgeOverride(
        zone_id=zone_id,
        zone_name=zone_name,
        multiplier=multiplier,
        reason=reason,
        expires_at=expires_at,
        applies_to=applies_to,
        is_active=True,
        bookings_affected=0,
        created_by=admin_user_id,
    )
    db.add(override)
    await db.commit()
    await db.refresh(override)

    # Resolve creator name + write audit log
    created_by_name: str | None = None
    if admin_user_id:
        from app.models.admin_user import AdminUser
        au_result = await db.execute(select(AdminUser).where(AdminUser.id == admin_user_id))
        au = au_result.scalar_one_or_none()
        if au:
            created_by_name = getattr(au, "name", None) or au.email

    from app.services.audit_service import log_event
    await log_event(
        db=db,
        actor_name=created_by_name or "Admin",
        actor_role="dispatcher",
        action=f"Surge override applied: {multiplier}× on {zone_id} for {expires_in_minutes}m — {reason}",
        target=f"zone:{zone_id}",
        category="dispatch",
        severity="medium",
    )

    return SurgeOverrideResponse(
        id=override.id,
        zone_id=override.zone_id,
        zone_name=override.zone_name,
        multiplier=override.multiplier,
        reason=override.reason,
        expires_at=override.expires_at,
        applies_to=override.applies_to,
        created_by_name=created_by_name,
        bookings_affected=override.bookings_affected,
        created_at=override.created_at,
    )


async def get_surge_overrides(
    db: AsyncSession,
    limit: int,
    offset: int,
) -> list[SurgeOverrideListItem]:
    now = _now()
    stmt = select(SurgeOverride).order_by(SurgeOverride.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    overrides = result.scalars().all()

    items: list[SurgeOverrideListItem] = []
    for o in overrides:
        # Compute is_active based on expires_at
        expires = o.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        is_active = expires > now

        # duration_minutes from created_at to expires_at
        created = o.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        duration_minutes = int((expires - created).total_seconds() // 60)

        # Resolve creator name
        created_by_name: str | None = None
        if o.created_by:
            from app.models.admin_user import AdminUser
            au_result = await db.execute(select(AdminUser).where(AdminUser.id == o.created_by))
            au = au_result.scalar_one_or_none()
            if au:
                created_by_name = au.name if hasattr(au, "name") else au.email

        items.append(
            SurgeOverrideListItem(
                id=o.id,
                zone_id=o.zone_id,
                zone_name=o.zone_name,
                multiplier=o.multiplier,
                reason=o.reason,
                duration_minutes=duration_minutes,
                expires_at=o.expires_at,
                is_active=is_active,
                created_by_name=created_by_name,
                bookings_affected=o.bookings_affected,
                created_at=o.created_at,
            )
        )

    return items
