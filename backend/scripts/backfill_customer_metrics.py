"""Backfill customer metrics from existing road + air booking data.

Run from the backend directory:
    python scripts/backfill_customer_metrics.py

Updates for every customer:
  - trips_count       (completed road + air bookings)
  - ltv_minor         (sum of fares for completed bookings)
  - avg_fare_minor    (ltv / trips_count)
  - cancellation_rate (cancelled / total bookings)
  - last_active_at    (most recent booking created_at)
  - computed_segment  (recomputed from refreshed metrics)
"""
from __future__ import annotations

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, and_
from app.database import AsyncSessionLocal
from app.models.customer import Customer
from app.models.booking import RoadBooking
from app.models.air_booking import AirBooking


async def compute_segment(customer: Customer) -> str:
    if customer.trips_count >= 300:
        return "loyalist"
    now = datetime.now(timezone.utc)
    joined = customer.joined_at
    if joined is not None:
        if joined.tzinfo is None:
            joined = joined.replace(tzinfo=timezone.utc)
        if (now - joined) <= timedelta(days=30):
            return "new"
    if customer.trips_count >= 50:
        return "frequent"
    return "regular"


async def backfill() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Customer))
        customers = result.scalars().all()
        print(f"Backfilling {len(customers)} customers…")
        updated = 0

        for customer in customers:
            cid = customer.id

            # ── Road bookings ──────────────────────────────────────────────────
            road_completed = await db.execute(
                select(func.count(RoadBooking.id), func.sum(
                    RoadBooking.fare_final_minor
                )).where(
                    RoadBooking.customer_id == cid,
                    RoadBooking.status == "Completed",
                )
            )
            road_row = road_completed.one()
            road_count = road_row[0] or 0
            road_ltv   = road_row[1] or 0

            road_total_res = await db.execute(
                select(func.count(RoadBooking.id)).where(RoadBooking.customer_id == cid)
            )
            road_total = road_total_res.scalar_one() or 0

            road_canc_res = await db.execute(
                select(func.count(RoadBooking.id)).where(
                    RoadBooking.customer_id == cid,
                    RoadBooking.status == "Cancelled",
                )
            )
            road_cancelled = road_canc_res.scalar_one() or 0

            road_last_res = await db.execute(
                select(func.max(RoadBooking.created_at)).where(RoadBooking.customer_id == cid)
            )
            road_last = road_last_res.scalar_one()

            # ── Air bookings ───────────────────────────────────────────────────
            air_completed = await db.execute(
                select(func.count(AirBooking.id), func.sum(
                    AirBooking.fare_final_minor
                )).where(
                    AirBooking.customer_id == cid,
                    AirBooking.status == "Completed",
                )
            )
            air_row = air_completed.one()
            air_count = air_row[0] or 0
            air_ltv   = air_row[1] or 0

            air_total_res = await db.execute(
                select(func.count(AirBooking.id)).where(AirBooking.customer_id == cid)
            )
            air_total = air_total_res.scalar_one() or 0

            air_canc_res = await db.execute(
                select(func.count(AirBooking.id)).where(
                    AirBooking.customer_id == cid,
                    AirBooking.status == "Cancelled",
                )
            )
            air_cancelled = air_canc_res.scalar_one() or 0

            air_last_res = await db.execute(
                select(func.max(AirBooking.created_at)).where(AirBooking.customer_id == cid)
            )
            air_last = air_last_res.scalar_one()

            # ── Aggregate ──────────────────────────────────────────────────────
            trips_count     = road_count + air_count
            ltv_minor       = road_ltv   + air_ltv
            total_bookings  = road_total + air_total
            total_cancelled = road_cancelled + air_cancelled

            avg_fare_minor = int(ltv_minor / trips_count) if trips_count > 0 else None
            cancellation_rate = (total_cancelled / total_bookings) if total_bookings > 0 else 0.0

            last_active = None
            if road_last and air_last:
                last_active = max(road_last, air_last)
            elif road_last:
                last_active = road_last
            elif air_last:
                last_active = air_last

            # ── Write ──────────────────────────────────────────────────────────
            changed = (
                customer.trips_count      != trips_count       or
                customer.ltv_minor        != ltv_minor         or
                customer.avg_fare_minor   != avg_fare_minor    or
                abs((customer.cancellation_rate or 0) - cancellation_rate) > 0.001
            )

            customer.trips_count      = trips_count
            customer.ltv_minor        = ltv_minor
            customer.avg_fare_minor   = avg_fare_minor
            customer.cancellation_rate = cancellation_rate
            if last_active:
                if last_active.tzinfo is None:
                    last_active = last_active.replace(tzinfo=timezone.utc)
                customer.last_active_at = last_active

            customer.computed_segment = await compute_segment(customer)

            if changed:
                updated += 1
                print(f"  {customer.customer_code or customer.id[:8]} — trips={trips_count}  ltv={ltv_minor}  cancRate={cancellation_rate:.2%}  seg={customer.computed_segment}")

        await db.commit()
        print(f"\nDone. {updated}/{len(customers)} customers updated.")


if __name__ == "__main__":
    asyncio.run(backfill())
