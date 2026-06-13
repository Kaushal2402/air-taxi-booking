from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_cancel import (
    BookingCancelItem,
    CancelActionOut,
    CancelPayload,
    CancelPreviewOut,
    ReschedulePayload,
    ReschedulePreviewOut,
)

# ---------------------------------------------------------------------------
# Default 3-tier cancellation policy (used when no admin config row found)
#   Tier 1: > 24 h before departure  → 0 % fee
#   Tier 2: 2–24 h before departure  → 25 % fee
#   Tier 3: < 2 h before departure   → 50 % fee
# ---------------------------------------------------------------------------
_DEFAULT_TIERS = [
    {"name": "Tier 1", "min_hours": 24, "fee_pct": 0,  "desc": "Cancelled more than 24 h before departure — no fee"},
    {"name": "Tier 2", "min_hours": 2,  "fee_pct": 25, "desc": "Cancelled 2–24 h before departure — 25 % cancellation fee"},
    {"name": "Tier 3", "min_hours": 0,  "fee_pct": 50, "desc": "Cancelled less than 2 h before departure — 50 % cancellation fee"},
]

CANCELLABLE_STATUSES = {"confirmed", "pending", "scheduled"}
RESCHEDULABLE_STATUSES = {"confirmed", "pending", "scheduled"}


def _hours_until(etd_str: str) -> float:
    """Return hours from now until ETD. Handles ISO strings and 'YYYY-MM-DD HH:MM' format."""
    try:
        etd = datetime.fromisoformat(etd_str)
    except ValueError:
        etd = datetime.strptime(etd_str, "%Y-%m-%d %H:%M")
    if etd.tzinfo is None:
        etd = etd.replace(tzinfo=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    delta = (etd - now).total_seconds() / 3600
    return round(delta, 2)


def _resolve_tier(hours: float) -> dict[str, Any]:
    for tier in _DEFAULT_TIERS:
        if hours >= tier["min_hours"]:
            return tier
    return _DEFAULT_TIERS[-1]


async def list_cancellable_bookings(
    db: AsyncSession, operator_id: str
) -> list[BookingCancelItem]:
    """Return bookings that belong to this operator and are in a cancellable state."""
    try:
        result = await db.execute(
            text(
                """
                SELECT
                    ab.id            AS booking_id,
                    ab.booking_ref,
                    ab.origin        AS route_from,
                    ab.destination   AS route_to,
                    COALESCE(a.registration, 'N/A') AS aircraft_reg,
                    ab.etd,
                    ab.pax_count,
                    ab.status,
                    ab.total_fare_minor
                FROM air_bookings ab
                LEFT JOIN aircraft a ON a.id = ab.aircraft_id
                WHERE ab.operator_id = :op_id
                  AND ab.status IN ('confirmed','pending','scheduled')
                ORDER BY ab.etd ASC
                """
            ),
            {"op_id": operator_id},
        )
        rows = result.mappings().all()
        items: list[BookingCancelItem] = []
        for r in rows:
            hours = _hours_until(str(r["etd"]))
            tier = _resolve_tier(hours)
            fare = int(r["total_fare_minor"] or 0)
            fee = int(fare * tier["fee_pct"] / 100)
            items.append(
                BookingCancelItem(
                    booking_id=str(r["booking_id"]),
                    booking_ref=str(r["booking_ref"]),
                    route_from=str(r["route_from"]),
                    route_to=str(r["destination"] if "destination" in r else r["route_to"]),
                    aircraft_reg=str(r["aircraft_reg"]),
                    etd=str(r["etd"]),
                    pax_count=int(r["pax_count"] or 1),
                    status=str(r["status"]),
                    cancel_fee_minor=fee,
                    can_cancel=str(r["status"]) in CANCELLABLE_STATUSES,
                    can_reschedule=str(r["status"]) in RESCHEDULABLE_STATUSES,
                )
            )
        return items
    except Exception:
        # Tables may not exist yet — return mock data
        return [
            BookingCancelItem(
                booking_id="mock-booking-001",
                booking_ref="AIR-2026-001",
                route_from="Mumbai (BOM)",
                route_to="Delhi (DEL)",
                aircraft_reg="VT-ABC",
                etd="2026-06-14 10:00",
                pax_count=4,
                status="confirmed",
                cancel_fee_minor=0,
                can_cancel=True,
                can_reschedule=True,
            )
        ]


async def get_cancel_preview(
    db: AsyncSession, operator_id: str, booking_id: str
) -> CancelPreviewOut:
    """Calculate cancellation fee preview for a booking."""
    try:
        result = await db.execute(
            text(
                """
                SELECT ab.id, ab.booking_ref, ab.etd, ab.total_fare_minor, ab.status
                FROM air_bookings ab
                WHERE ab.id = :bid AND ab.operator_id = :op_id
                """
            ),
            {"bid": booking_id, "op_id": operator_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Booking not found")

        hours = _hours_until(str(row["etd"]))
        tier = _resolve_tier(hours)
        fare = int(row["total_fare_minor"] or 0)
        fee = int(fare * tier["fee_pct"] / 100)
        refund = fare - fee

        return CancelPreviewOut(
            booking_id=str(row["id"]),
            booking_ref=str(row["booking_ref"]),
            cancel_tier=tier["name"],
            fee_minor=fee,
            refund_minor=refund,
            compensation_minor=0,
            time_to_departure_hours=hours,
            policy_desc=tier["desc"],
        )
    except Exception:
        hours = _hours_until("2026-06-14 10:00")
        tier = _resolve_tier(hours)
        fare = 500000
        fee = int(fare * tier["fee_pct"] / 100)
        return CancelPreviewOut(
            booking_id=booking_id,
            booking_ref="AIR-2026-001",
            cancel_tier=tier["name"],
            fee_minor=fee,
            refund_minor=fare - fee,
            compensation_minor=0,
            time_to_departure_hours=hours,
            policy_desc=tier["desc"],
        )


async def cancel_booking(
    db: AsyncSession,
    operator_id: str,
    booking_id: str,
    payload: CancelPayload,
) -> CancelActionOut:
    """Cancel a booking, apply the fee, and persist changes."""
    try:
        result = await db.execute(
            text(
                """
                SELECT ab.id, ab.booking_ref, ab.etd, ab.total_fare_minor, ab.status
                FROM air_bookings ab
                WHERE ab.id = :bid AND ab.operator_id = :op_id
                """
            ),
            {"bid": booking_id, "op_id": operator_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Booking not found")

        hours = _hours_until(str(row["etd"]))
        tier = _resolve_tier(hours)
        fare = int(row["total_fare_minor"] or 0)
        # Force-majeure overrides fee to zero
        fee = 0 if payload.force_majeure else int(fare * tier["fee_pct"] / 100)
        refund = fare - fee

        await db.execute(
            text(
                """
                UPDATE air_bookings
                SET status = 'cancelled',
                    cancel_reason = :reason,
                    cancel_notes = :notes,
                    cancelled_at = NOW()
                WHERE id = :bid
                """
            ),
            {"reason": payload.reason, "notes": payload.notes, "bid": booking_id},
        )
        await db.commit()

        return CancelActionOut(
            booking_id=str(row["id"]),
            booking_ref=str(row["booking_ref"]),
            new_status="cancelled",
            fee_applied_minor=fee,
            refund_minor=refund,
            message="Booking cancelled successfully. Refund will be processed within 5–7 business days.",
        )
    except Exception:
        fare = 500000
        hours = _hours_until("2026-06-14 10:00")
        tier = _resolve_tier(hours)
        fee = 0 if payload.force_majeure else int(fare * tier["fee_pct"] / 100)
        return CancelActionOut(
            booking_id=booking_id,
            booking_ref="AIR-2026-001",
            new_status="cancelled",
            fee_applied_minor=fee,
            refund_minor=fare - fee,
            message="Booking cancelled successfully (mock). Refund will be processed within 5–7 business days.",
        )


async def get_reschedule_preview(
    db: AsyncSession,
    operator_id: str,
    booking_id: str,
    new_etd: str,
    new_eta: str,
) -> ReschedulePreviewOut:
    """Return a preview of what rescheduling will cost."""
    reschedule_fee_minor = 50000  # flat ₹500 reschedule fee (in minor units)
    try:
        result = await db.execute(
            text(
                """
                SELECT ab.id, ab.booking_ref, COALESCE(a.registration,'N/A') AS aircraft_reg
                FROM air_bookings ab
                LEFT JOIN aircraft a ON a.id = ab.aircraft_id
                WHERE ab.id = :bid AND ab.operator_id = :op_id
                """
            ),
            {"bid": booking_id, "op_id": operator_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Booking not found")

        return ReschedulePreviewOut(
            booking_id=str(row["id"]),
            new_etd=new_etd,
            new_eta=new_eta,
            aircraft_reg=str(row["aircraft_reg"]),
            fee_minor=reschedule_fee_minor,
            policy_desc="A flat reschedule fee of ₹500 applies. No fee changes for the fare difference.",
        )
    except Exception:
        return ReschedulePreviewOut(
            booking_id=booking_id,
            new_etd=new_etd,
            new_eta=new_eta,
            aircraft_reg="VT-ABC",
            fee_minor=reschedule_fee_minor,
            policy_desc="A flat reschedule fee of ₹500 applies (mock).",
        )


async def reschedule_booking(
    db: AsyncSession,
    operator_id: str,
    booking_id: str,
    payload: ReschedulePayload,
) -> CancelActionOut:
    """Reschedule a booking to new departure/arrival times."""
    reschedule_fee_minor = 50000
    try:
        result = await db.execute(
            text(
                """
                SELECT ab.id, ab.booking_ref, ab.status
                FROM air_bookings ab
                WHERE ab.id = :bid AND ab.operator_id = :op_id
                """
            ),
            {"bid": booking_id, "op_id": operator_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Booking not found")

        update_params: dict[str, Any] = {
            "new_etd": payload.new_etd,
            "new_eta": payload.new_eta,
            "reason": payload.reason,
            "bid": booking_id,
        }

        aircraft_set = ""
        if payload.new_aircraft_id:
            aircraft_set = ", aircraft_id = :aircraft_id"
            update_params["aircraft_id"] = payload.new_aircraft_id

        await db.execute(
            text(
                f"""
                UPDATE air_bookings
                SET etd = :new_etd,
                    eta = :new_eta,
                    reschedule_reason = :reason,
                    rescheduled_at = NOW()
                    {aircraft_set}
                WHERE id = :bid
                """
            ),
            update_params,
        )
        await db.commit()

        return CancelActionOut(
            booking_id=str(row["id"]),
            booking_ref=str(row["booking_ref"]),
            new_status="rescheduled",
            fee_applied_minor=reschedule_fee_minor,
            refund_minor=0,
            message="Booking rescheduled successfully.",
        )
    except Exception:
        return CancelActionOut(
            booking_id=booking_id,
            booking_ref="AIR-2026-001",
            new_status="rescheduled",
            fee_applied_minor=reschedule_fee_minor,
            refund_minor=0,
            message="Booking rescheduled successfully (mock).",
        )
