from __future__ import annotations

"""
Auto-suspension enforcement for driver performance thresholds.

Called after every booking state change that affects driver metrics:
  - Booking Completed  → update trips_count, rating, acceptance_rate
  - Booking Cancelled (by driver) → update cancellation_rate
  - Driver assigned / times-out → update acceptance_rate

After each metric update, check_and_auto_suspend() compares the rolling
window stats against the four platform thresholds and suspends the driver
if any are breached.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import RoadBooking
from app.models.driver import Driver
from app.services.settings_service import get_settings


# ── Metric updaters ───────────────────────────────────────────────────────────

async def update_driver_metrics_on_completion(
    db: AsyncSession,
    driver_id: str,
    driver_rating: Optional[float],
) -> None:
    """
    Called when a road booking reaches 'Completed'.
    Increments trips_count and recomputes rolling rating average.
    """
    driver = await _get_driver(db, driver_id)
    if not driver:
        return

    driver.trips_count = (driver.trips_count or 0) + 1

    # Rolling average rating (simple cumulative average)
    if driver_rating is not None and driver_rating > 0:
        old_rating = driver.rating or 0.0
        old_count = max(1, (driver.trips_count or 1) - 1)  # count before this trip
        driver.rating = round(
            (old_rating * old_count + driver_rating) / driver.trips_count, 2
        )

    # Recompute acceptance_rate and cancellation_rate from booking history
    await _recompute_rolling_rates(db, driver)
    await db.commit()


async def update_driver_metrics_on_cancellation(
    db: AsyncSession,
    driver_id: str,
) -> None:
    """
    Called when a booking is Cancelled while the driver was assigned.
    Recomputes rolling cancellation rate.
    """
    driver = await _get_driver(db, driver_id)
    if not driver:
        return

    await _recompute_rolling_rates(db, driver)
    await db.commit()


async def update_driver_metrics_on_accept(
    db: AsyncSession,
    driver_id: str,
) -> None:
    """
    Called when a driver is assigned to a booking (accepted).
    Recomputes acceptance rate.
    """
    driver = await _get_driver(db, driver_id)
    if not driver:
        return

    await _recompute_rolling_rates(db, driver)
    await db.commit()


# ── Rolling rate computation ──────────────────────────────────────────────────

async def _recompute_rolling_rates(db: AsyncSession, driver: Driver) -> None:
    """
    Recompute driver cancellation_rate and acceptance_rate from road_bookings
    within the evaluation window (driver_threshold_window_days).
    """
    settings = await get_settings(db)
    window_days: int = settings.driver_threshold_window_days or 30
    since = datetime.now(timezone.utc) - timedelta(days=window_days)

    # All bookings assigned to this driver in the window
    total_q = await db.execute(
        select(func.count(RoadBooking.id)).where(
            and_(
                RoadBooking.driver_id == driver.id,
                RoadBooking.updated_at >= since,
            )
        )
    )
    total: int = total_q.scalar_one() or 0

    if total == 0:
        return  # not enough data — keep existing rates

    # Cancelled bookings (driver-side: assigned and then cancelled)
    cancelled_q = await db.execute(
        select(func.count(RoadBooking.id)).where(
            and_(
                RoadBooking.driver_id == driver.id,
                RoadBooking.status == "Cancelled",
                RoadBooking.updated_at >= since,
            )
        )
    )
    cancelled: int = cancelled_q.scalar_one() or 0

    # Completed bookings
    completed_q = await db.execute(
        select(func.count(RoadBooking.id)).where(
            and_(
                RoadBooking.driver_id == driver.id,
                RoadBooking.status == "Completed",
                RoadBooking.updated_at >= since,
            )
        )
    )
    completed: int = completed_q.scalar_one() or 0

    driver.cancellation_rate = round((cancelled / total) * 100, 2)

    # Acceptance rate = completed / (completed + cancelled); proxy for accept vs reject
    assigned = completed + cancelled
    if assigned > 0:
        driver.acceptance_rate = round((completed / assigned) * 100, 2)


# ── Threshold check & auto-suspension ────────────────────────────────────────

async def check_and_auto_suspend(
    db: AsyncSession,
    driver_id: str,
) -> Optional[str]:
    """
    Compare driver metrics against platform thresholds.
    Suspends the driver if any threshold is breached.

    Returns the suspension reason string if suspended, None otherwise.
    """
    driver = await _get_driver(db, driver_id)
    if not driver:
        return None

    # Only check active/online drivers — skip already suspended/rejected
    if driver.status not in ("active",):
        return None

    settings = await get_settings(db)
    min_rating: float = settings.driver_min_rating or 3.5
    max_cancel: float = settings.driver_max_cancellation_rate_pct or 30.0
    min_accept: float = settings.driver_min_acceptance_rate_pct or 60.0
    window_days: int = settings.driver_threshold_window_days or 30

    reasons: list[str] = []

    # Check star rating (only when we have enough data — at least 5 trips)
    if driver.trips_count and driver.trips_count >= 5:
        if driver.rating is not None and driver.rating < min_rating:
            reasons.append(
                f"Rating {driver.rating:.1f}★ below minimum {min_rating:.1f}★"
            )

    # Check cancellation rate
    if driver.cancellation_rate is not None and driver.cancellation_rate > max_cancel:
        reasons.append(
            f"Cancellation rate {driver.cancellation_rate:.1f}% exceeds limit {max_cancel:.1f}%"
        )

    # Check acceptance rate
    if driver.acceptance_rate is not None and driver.acceptance_rate < min_accept:
        reasons.append(
            f"Acceptance rate {driver.acceptance_rate:.1f}% below minimum {min_accept:.1f}%"
        )

    if not reasons:
        return None

    # Suspend
    suspension_reason = (
        f"Auto-suspended (evaluation window: {window_days} days): "
        + "; ".join(reasons)
    )
    driver.status = "suspended"
    driver.online_status = "offline"
    driver.flag_reason = suspension_reason
    await db.commit()
    return suspension_reason


# ── Helper ────────────────────────────────────────────────────────────────────

async def _get_driver(db: AsyncSession, driver_id: str) -> Optional[Driver]:
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    return result.scalar_one_or_none()
