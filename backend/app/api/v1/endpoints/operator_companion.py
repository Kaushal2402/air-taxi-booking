from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_companion import CrewAssignment, FlightBrief, StatusUpdatePayload
from app.services import operator_companion_service

router = APIRouter(prefix="/companion", tags=["operator-companion"])


@router.get("/assignments", response_model=list[CrewAssignment])
async def get_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_companion_service.get_assignments(
        db, current_user.id, current_user.operator_id
    )


@router.get("/flights/{flight_id}/brief", response_model=FlightBrief)
async def get_flight_brief(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_companion_service.get_flight_brief(
        db, current_user.id, current_user.operator_id, flight_id
    )


@router.post("/flights/{flight_id}/status")
async def update_flight_status(
    flight_id: str,
    payload: StatusUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_companion_service.update_flight_status(
        db, current_user.id, current_user.operator_id, flight_id, payload
    )
