from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_routes import (
    RouteCreate,
    RouteListItem,
    RouteOut,
    RouteUpdate,
    ScheduleCreate,
    ScheduleOut,
    ScheduleUpdate,
)
from app.services import operator_routes_service

router = APIRouter(tags=["operator-routes"])


@router.get("/routes", response_model=list[RouteListItem])
async def list_routes(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.list_routes(db, current_user.operator_id)


@router.post("/routes", response_model=RouteOut, status_code=201)
async def create_route(
    payload: RouteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.create_route(db, current_user.operator_id, payload)


@router.get("/routes/{route_id}", response_model=RouteOut)
async def get_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.get_route(db, current_user.operator_id, route_id)


@router.patch("/routes/{route_id}", response_model=RouteOut)
async def update_route(
    route_id: str,
    payload: RouteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.update_route(db, current_user.operator_id, route_id, payload)


@router.get("/schedules", response_model=list[ScheduleOut])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.list_schedules(db, current_user.operator_id)


@router.post("/schedules", response_model=ScheduleOut, status_code=201)
async def create_schedule(
    payload: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.create_schedule(db, current_user.operator_id, payload)


@router.patch("/schedules/{schedule_id}", response_model=ScheduleOut)
async def update_schedule(
    schedule_id: str,
    payload: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.update_schedule(db, current_user.operator_id, schedule_id, payload)


@router.post("/schedules/{schedule_id}/publish", response_model=ScheduleOut)
async def publish_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.publish_schedule(db, current_user.operator_id, schedule_id)


@router.post("/schedules/{schedule_id}/unpublish", response_model=ScheduleOut)
async def unpublish_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_routes_service.unpublish_schedule(db, current_user.operator_id, schedule_id)
