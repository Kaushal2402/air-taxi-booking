from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_day_of_flight import (
    ArrivePayload,
    DayBoardOut,
    DelayPayload,
    DepartPayload,
    EventLogPayload,
    FlightDetailOut,
)
from app.services import operator_day_of_flight_service

router = APIRouter(prefix="/day-of-flight", tags=["operator-day-of-flight"])


@router.get("/board", response_model=DayBoardOut)
async def get_day_board(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_day_of_flight_service.get_day_board(db, current_user.operator_id)


@router.get("/{flight_id}", response_model=FlightDetailOut)
async def get_flight_detail(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_day_of_flight_service.get_flight_detail(db, current_user.operator_id, flight_id)


@router.post("/{flight_id}/depart")
async def mark_depart(
    flight_id: str,
    payload: DepartPayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_day_of_flight_service.mark_depart(db, current_user.operator_id, flight_id, payload)


@router.post("/{flight_id}/arrive")
async def mark_arrive(
    flight_id: str,
    payload: ArrivePayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_day_of_flight_service.mark_arrive(db, current_user.operator_id, flight_id, payload)


@router.post("/{flight_id}/delay")
async def log_delay(
    flight_id: str,
    payload: DelayPayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_day_of_flight_service.log_delay(db, current_user.operator_id, flight_id, payload)


@router.post("/{flight_id}/close")
async def close_flight(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_day_of_flight_service.close_flight(db, current_user.operator_id, flight_id)


@router.post("/{flight_id}/log")
async def add_event_log(
    flight_id: str,
    payload: EventLogPayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_day_of_flight_service.add_event_log(db, current_user.operator_id, flight_id, payload)
