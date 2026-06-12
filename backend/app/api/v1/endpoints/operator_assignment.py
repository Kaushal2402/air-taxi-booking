from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_assignment import (
    AssignResourcesPayload,
    EligibleResourcesOut,
    FlightCreate,
    FlightOut,
)
from app.services import operator_assignment_service

router = APIRouter(prefix="/flights", tags=["operator-assignment"])


@router.get("/assignment-board", response_model=list[FlightOut])
async def get_assignment_board(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_assignment_service.list_assignment_board(db, current_user.operator_id)


@router.post("", response_model=FlightOut, status_code=201)
async def create_flight(
    payload: FlightCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_assignment_service.create_flight(db, current_user.operator_id, payload)


@router.get("/{flight_id}", response_model=FlightOut)
async def get_flight(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_assignment_service.get_flight(db, current_user.operator_id, flight_id)


@router.get("/{flight_id}/eligible-resources", response_model=EligibleResourcesOut)
async def get_eligible_resources(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_assignment_service.get_eligible_resources(db, current_user.operator_id, flight_id)


@router.post("/{flight_id}/assign", response_model=FlightOut)
async def assign_resources(
    flight_id: str,
    payload: AssignResourcesPayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_assignment_service.assign_resources(
        db, current_user.operator_id, flight_id, payload
    )


@router.post("/{flight_id}/reassign", response_model=FlightOut)
async def reassign_resources(
    flight_id: str,
    payload: AssignResourcesPayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_assignment_service.assign_resources(
        db, current_user.operator_id, flight_id, payload
    )


@router.post("/{flight_id}/confirm", response_model=FlightOut)
async def confirm_flight(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_assignment_service.confirm_flight(db, current_user.operator_id, flight_id)
