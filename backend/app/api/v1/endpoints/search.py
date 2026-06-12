from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.models.air_booking import AirBooking
from app.models.booking import RoadBooking
from app.models.customer import Customer
from app.models.driver import Driver
from app.models.operator import Operator

router = APIRouter()


class SearchResultItem(BaseModel):
    id: str
    category: str          # "booking" | "customer" | "driver" | "operator"
    title: str
    subtitle: Optional[str] = None
    href: str              # frontend route to navigate to


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int


@router.get("", response_model=SearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(get_current_admin_user),
) -> SearchResponse:
    q = q.strip()
    pattern = f"%{q}%"
    results: List[SearchResultItem] = []

    # ── Road Bookings (by ref) ───────────────────────────────────────────────
    booking_q = await db.execute(
        select(RoadBooking)
        .where(RoadBooking.booking_ref.ilike(pattern))
        .limit(4)
    )
    for b in booking_q.scalars().all():
        results.append(SearchResultItem(
            id=b.id,
            category="booking",
            title=f"Booking {b.booking_ref}",
            subtitle=f"{b.pickup_address or ''} → {b.drop_address or ''}",
            href=f"/bookings/{b.id}",
        ))

    # ── Air Bookings (by ref or customer name) ───────────────────────────────
    air_q = await db.execute(
        select(AirBooking)
        .where(or_(
            AirBooking.booking_ref.ilike(pattern),
            AirBooking.customer_name.ilike(pattern),
        ))
        .limit(4)
    )
    for b in air_q.scalars().all():
        results.append(SearchResultItem(
            id=b.id,
            category="booking",
            title=f"Air {b.booking_ref}",
            subtitle=f"{b.route_from} → {b.route_to}",
            href=f"/bookings/air/{b.id}",
        ))

    # ── Customers ────────────────────────────────────────────────────────────
    cust_q = await db.execute(
        select(Customer)
        .where(or_(
            Customer.name.ilike(pattern),
            Customer.phone.ilike(pattern),
            Customer.email.ilike(pattern),
        ))
        .limit(5)
    )
    for c in cust_q.scalars().all():
        results.append(SearchResultItem(
            id=c.id,
            category="customer",
            title=c.name,
            subtitle=c.phone,
            href=f"/customers/{c.id}",
        ))

    # ── Drivers ──────────────────────────────────────────────────────────────
    driver_q = await db.execute(
        select(Driver)
        .where(or_(
            Driver.name.ilike(pattern),
            Driver.phone.ilike(pattern),
        ))
        .limit(5)
    )
    for d in driver_q.scalars().all():
        results.append(SearchResultItem(
            id=d.id,
            category="driver",
            title=d.name,
            subtitle=d.phone,
            href=f"/drivers/{d.id}",
        ))

    # ── Operators ────────────────────────────────────────────────────────────
    op_q = await db.execute(
        select(Operator)
        .where(or_(
            Operator.name.ilike(pattern),
            Operator.trade_name.ilike(pattern),
        ))
        .limit(5)
    )
    for o in op_q.scalars().all():
        results.append(SearchResultItem(
            id=o.id,
            category="operator",
            title=o.trade_name or o.name,
            subtitle=o.name if o.trade_name else None,
            href=f"/operators/{o.id}",
        ))

    results = results[:limit]
    return SearchResponse(results=results, total=len(results))
