from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.models.air_booking import AirBooking
from app.models.booking import RoadBooking
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class KpiStats(BaseModel):
    live_trips_road: int
    live_trips_air: int
    live_trips_total: int
    today_bookings: int
    today_gbv_minor: int
    today_completed: int
    cancel_rate_pct: float
    active_operators: int
    # 14-day sparklines (daily booking counts)
    bookings_14d: List[int]
    revenue_14d_minor: List[int]


class LiveBookingItem(BaseModel):
    id: str
    booking_ref: str
    service: str
    route: str
    status: str
    fare_minor: int
    kind: str  # "road" | "air"


class AlertItem(BaseModel):
    severity: str   # "danger" | "warn" | "info"
    title: str
    message: str
    module: str


class DashboardResponse(BaseModel):
    kpi: KpiStats
    live_bookings: List[LiveBookingItem]
    alerts: List[AlertItem]


# ── Helper ────────────────────────────────────────────────────────────────────

def _today_range() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, now


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    window: str = Query("today", regex="^(today|7d|30d|90d)$"),
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    now = datetime.now(timezone.utc)
    today_start, today_end = _today_range()

    LIVE_ROAD = ["InProgress", "Accepted", "Arrived"]
    LIVE_AIR  = ["Boarding", "Departed"]

    # Live road trips
    live_road_q = await db.execute(
        select(func.count(RoadBooking.id)).where(RoadBooking.status.in_(LIVE_ROAD))
    )
    live_road = live_road_q.scalar_one() or 0

    # Live air trips
    live_air_q = await db.execute(
        select(func.count(AirBooking.id)).where(AirBooking.status.in_(LIVE_AIR))
    )
    live_air = live_air_q.scalar_one() or 0

    # Today's road bookings
    today_road_q = await db.execute(
        select(func.count(RoadBooking.id)).where(
            RoadBooking.created_at >= today_start,
            RoadBooking.created_at <= today_end,
        )
    )
    today_road = today_road_q.scalar_one() or 0

    # Today's air bookings
    today_air_q = await db.execute(
        select(func.count(AirBooking.id)).where(
            AirBooking.created_at >= today_start,
            AirBooking.created_at <= today_end,
        )
    )
    today_air = today_air_q.scalar_one() or 0
    today_total = today_road + today_air

    # Today GBV (road final or estimate)
    gbv_road_q = await db.execute(
        select(
            func.sum(func.coalesce(RoadBooking.fare_final_minor, RoadBooking.fare_estimate_minor))
        ).where(
            RoadBooking.created_at >= today_start,
            RoadBooking.status.notin_(["Cancelled"]),
        )
    )
    gbv_road = int(gbv_road_q.scalar_one() or 0)

    gbv_air_q = await db.execute(
        select(
            func.sum(func.coalesce(AirBooking.fare_final_minor, AirBooking.fare_estimate_minor))
        ).where(
            AirBooking.created_at >= today_start,
            AirBooking.status.notin_(["Cancelled"]),
        )
    )
    gbv_air = int(gbv_air_q.scalar_one() or 0)

    # Today completed
    completed_q = await db.execute(
        select(func.count(RoadBooking.id)).where(
            RoadBooking.created_at >= today_start,
            RoadBooking.status == "Completed",
        )
    )
    completed_road = completed_q.scalar_one() or 0
    completed_air_q = await db.execute(
        select(func.count(AirBooking.id)).where(
            AirBooking.created_at >= today_start,
            AirBooking.status == "Completed",
        )
    )
    completed_air = completed_air_q.scalar_one() or 0
    today_completed = completed_road + completed_air

    # Cancel rate today
    cancelled_q = await db.execute(
        select(func.count(RoadBooking.id)).where(
            RoadBooking.created_at >= today_start,
            RoadBooking.status == "Cancelled",
        )
    )
    cancelled_road = cancelled_q.scalar_one() or 0
    cancel_rate = round((cancelled_road / today_road * 100) if today_road > 0 else 0.0, 1)

    # 14-day sparklines
    bookings_14d: list[int] = []
    revenue_14d: list[int] = []
    for i in range(13, -1, -1):
        day_start = (today_start - timedelta(days=i))
        day_end   = day_start + timedelta(days=1)
        cnt_q = await db.execute(
            select(func.count(RoadBooking.id)).where(
                RoadBooking.created_at >= day_start,
                RoadBooking.created_at < day_end,
            )
        )
        rev_q = await db.execute(
            select(func.sum(func.coalesce(RoadBooking.fare_final_minor, RoadBooking.fare_estimate_minor))).where(
                RoadBooking.created_at >= day_start,
                RoadBooking.created_at < day_end,
                RoadBooking.status.notin_(["Cancelled"]),
            )
        )
        bookings_14d.append(cnt_q.scalar_one() or 0)
        revenue_14d.append(int(rev_q.scalar_one() or 0))

    # Live bookings (road)
    live_road_rows = await db.execute(
        select(RoadBooking)
        .where(RoadBooking.status.in_(LIVE_ROAD))
        .order_by(RoadBooking.created_at.desc())
        .limit(4)
    )
    live_items: list[LiveBookingItem] = []
    for b in live_road_rows.scalars().all():
        live_items.append(LiveBookingItem(
            id=b.id,
            booking_ref=b.booking_ref,
            service=f"{b.service_type or 'Cab'} · {b.vehicle_class or ''}".strip(" ·"),
            route=f"{b.pickup_address or '—'} → {b.drop_address or '—'}",
            status=b.status,
            fare_minor=int(b.fare_final_minor or b.fare_estimate_minor or 0),
            kind="road",
        ))

    # Live bookings (air)
    live_air_rows = await db.execute(
        select(AirBooking)
        .where(AirBooking.status.in_(LIVE_AIR))
        .order_by(AirBooking.etd.asc())
        .limit(4)
    )
    for b in live_air_rows.scalars().all():
        live_items.append(LiveBookingItem(
            id=b.id,
            booking_ref=b.booking_ref,
            service=b.service_label or "Air",
            route=f"{b.route_from} → {b.route_to}",
            status=b.status,
            fare_minor=int(b.fare_final_minor or b.fare_estimate_minor or 0),
            kind="air",
        ))

    # Static alerts (no alert table yet — derived from data thresholds)
    alerts: list[AlertItem] = []
    if cancel_rate > 6:
        alerts.append(AlertItem(severity="danger", title="Cancel rate spike",
                                message=f"Today's cancel rate at {cancel_rate}% · above 6% threshold",
                                module="Bookings"))
    if live_road + live_air > 0:
        alerts.append(AlertItem(severity="info", title="Live operations",
                                message=f"{live_road} road trips · {live_air} air trips in progress",
                                module="Dispatch"))

    kpi = KpiStats(
        live_trips_road=live_road,
        live_trips_air=live_air,
        live_trips_total=live_road + live_air,
        today_bookings=today_total,
        today_gbv_minor=gbv_road + gbv_air,
        today_completed=today_completed,
        cancel_rate_pct=cancel_rate,
        active_operators=0,
        bookings_14d=bookings_14d,
        revenue_14d_minor=revenue_14d,
    )

    return DashboardResponse(kpi=kpi, live_bookings=live_items, alerts=alerts)
