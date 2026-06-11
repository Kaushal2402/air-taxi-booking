from __future__ import annotations

import json
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.operator_routes import OperatorRoute, OperatorSchedule
from app.schemas.operator_routes import RouteCreate, RouteUpdate, ScheduleCreate, ScheduleUpdate


def _encode_types(route: OperatorRoute, types: list[str]) -> None:
    route.eligible_aircraft_types = json.dumps(types)


def _decode_types(route: OperatorRoute) -> list[str]:
    try:
        return json.loads(route.eligible_aircraft_types or "[]")
    except (ValueError, TypeError):
        return []


async def list_routes(db: AsyncSession, operator_id: str) -> list[OperatorRoute]:
    result = await db.execute(
        select(OperatorRoute)
        .where(OperatorRoute.operator_id == operator_id)
        .order_by(OperatorRoute.created_at.desc())
    )
    routes = list(result.scalars().all())
    for r in routes:
        r.eligible_aircraft_types = _decode_types(r)  # type: ignore[assignment]
    return routes


async def get_route(db: AsyncSession, operator_id: str, route_id: str) -> OperatorRoute:
    result = await db.execute(
        select(OperatorRoute)
        .options(selectinload(OperatorRoute.schedules))
        .where(OperatorRoute.id == route_id, OperatorRoute.operator_id == operator_id)
    )
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    route.eligible_aircraft_types = _decode_types(route)  # type: ignore[assignment]
    return route


async def create_route(db: AsyncSession, operator_id: str, payload: RouteCreate) -> OperatorRoute:
    data = payload.model_dump()
    aircraft_types = data.pop("eligible_aircraft_types", [])
    route = OperatorRoute(operator_id=operator_id, **data)
    _encode_types(route, aircraft_types)
    db.add(route)
    await db.commit()
    await db.refresh(route)
    route.eligible_aircraft_types = aircraft_types  # type: ignore[assignment]
    return route


async def update_route(
    db: AsyncSession, operator_id: str, route_id: str, payload: RouteUpdate
) -> OperatorRoute:
    route = await get_route(db, operator_id, route_id)
    data = payload.model_dump(exclude_unset=True)
    if "eligible_aircraft_types" in data:
        _encode_types(route, data.pop("eligible_aircraft_types"))
    for field, value in data.items():
        setattr(route, field, value)
    route.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(route)
    route.eligible_aircraft_types = _decode_types(route)  # type: ignore[assignment]
    return route


async def list_schedules(db: AsyncSession, operator_id: str) -> list[OperatorSchedule]:
    result = await db.execute(
        select(OperatorSchedule)
        .where(OperatorSchedule.operator_id == operator_id)
        .order_by(OperatorSchedule.etd)
    )
    return list(result.scalars().all())


async def get_schedule(db: AsyncSession, operator_id: str, schedule_id: str) -> OperatorSchedule:
    result = await db.execute(
        select(OperatorSchedule).where(
            OperatorSchedule.id == schedule_id,
            OperatorSchedule.operator_id == operator_id,
        )
    )
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return sched


async def create_schedule(db: AsyncSession, operator_id: str, payload: ScheduleCreate) -> OperatorSchedule:
    sched = OperatorSchedule(operator_id=operator_id, **payload.model_dump())
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return sched


async def update_schedule(
    db: AsyncSession, operator_id: str, schedule_id: str, payload: ScheduleUpdate
) -> OperatorSchedule:
    sched = await get_schedule(db, operator_id, schedule_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sched, field, value)
    sched.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(sched)
    return sched


async def publish_schedule(db: AsyncSession, operator_id: str, schedule_id: str) -> OperatorSchedule:
    sched = await get_schedule(db, operator_id, schedule_id)
    sched.published = True
    sched.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(sched)
    return sched


async def unpublish_schedule(db: AsyncSession, operator_id: str, schedule_id: str) -> OperatorSchedule:
    sched = await get_schedule(db, operator_id, schedule_id)
    sched.published = False
    sched.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(sched)
    return sched
