from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_aircraft import (
    AircraftCreate,
    AircraftDocumentCreate,
    AircraftDocumentOut,
    AircraftListItem,
    AircraftOut,
    AircraftUpdate,
    MaintenanceWindowCreate,
    MaintenanceWindowOut,
)
from app.services import operator_aircraft_service

router = APIRouter(prefix="/aircraft", tags=["operator-aircraft"])


@router.get("", response_model=list[AircraftListItem])
async def list_aircraft(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_aircraft_service.list_aircraft(db, current_user.operator_id)


@router.post("", response_model=AircraftOut, status_code=201)
async def create_aircraft(
    payload: AircraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_aircraft_service.create_aircraft(db, current_user.operator_id, payload)


@router.get("/{aircraft_id}", response_model=AircraftOut)
async def get_aircraft(
    aircraft_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_aircraft_service.get_aircraft(db, current_user.operator_id, aircraft_id)


@router.patch("/{aircraft_id}", response_model=AircraftOut)
async def update_aircraft(
    aircraft_id: str,
    payload: AircraftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_aircraft_service.update_aircraft(db, current_user.operator_id, aircraft_id, payload)


@router.post("/{aircraft_id}/submit", response_model=AircraftOut)
async def submit_aircraft(
    aircraft_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_aircraft_service.submit_aircraft(db, current_user.operator_id, aircraft_id)


@router.post("/{aircraft_id}/documents", response_model=AircraftDocumentOut, status_code=201)
async def add_document(
    aircraft_id: str,
    payload: AircraftDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_aircraft_service.add_document(db, current_user.operator_id, aircraft_id, payload)


@router.post("/{aircraft_id}/maintenance", response_model=MaintenanceWindowOut, status_code=201)
async def add_maintenance_window(
    aircraft_id: str,
    payload: MaintenanceWindowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_aircraft_service.add_maintenance_window(db, current_user.operator_id, aircraft_id, payload)
