from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.operator_aircraft import AircraftDocument, AircraftMaintenanceWindow, OperatorAircraft
from app.schemas.operator_aircraft import (
    AircraftCreate,
    AircraftDocumentCreate,
    AircraftUpdate,
    MaintenanceWindowCreate,
)


async def list_aircraft(db: AsyncSession, operator_id: str) -> list[OperatorAircraft]:
    result = await db.execute(
        select(OperatorAircraft)
        .where(OperatorAircraft.operator_id == operator_id)
        .order_by(OperatorAircraft.created_at.desc())
    )
    return list(result.scalars().all())


async def get_aircraft(db: AsyncSession, operator_id: str, aircraft_id: str) -> OperatorAircraft:
    result = await db.execute(
        select(OperatorAircraft)
        .options(
            selectinload(OperatorAircraft.documents),
            selectinload(OperatorAircraft.maintenance_windows),
        )
        .where(OperatorAircraft.id == aircraft_id, OperatorAircraft.operator_id == operator_id)
    )
    aircraft = result.scalar_one_or_none()
    if not aircraft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aircraft not found")
    return aircraft


async def create_aircraft(db: AsyncSession, operator_id: str, payload: AircraftCreate) -> OperatorAircraft:
    existing = await db.execute(
        select(OperatorAircraft).where(OperatorAircraft.registration_mark == payload.registration_mark)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Registration mark already exists")

    aircraft = OperatorAircraft(
        operator_id=operator_id,
        **payload.model_dump(),
    )
    db.add(aircraft)
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def update_aircraft(
    db: AsyncSession, operator_id: str, aircraft_id: str, payload: AircraftUpdate
) -> OperatorAircraft:
    aircraft = await get_aircraft(db, operator_id, aircraft_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(aircraft, field, value)
    aircraft.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def submit_aircraft(db: AsyncSession, operator_id: str, aircraft_id: str) -> OperatorAircraft:
    aircraft = await get_aircraft(db, operator_id, aircraft_id)
    if aircraft.status not in ("submitted", "grounded"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aircraft cannot be submitted in current status")
    aircraft.status = "submitted"
    aircraft.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def add_document(
    db: AsyncSession, operator_id: str, aircraft_id: str, payload: AircraftDocumentCreate
) -> AircraftDocument:
    await get_aircraft(db, operator_id, aircraft_id)
    doc = AircraftDocument(aircraft_id=aircraft_id, **payload.model_dump())
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def add_maintenance_window(
    db: AsyncSession, operator_id: str, aircraft_id: str, payload: MaintenanceWindowCreate
) -> AircraftMaintenanceWindow:
    await get_aircraft(db, operator_id, aircraft_id)
    window = AircraftMaintenanceWindow(aircraft_id=aircraft_id, **payload.model_dump())
    db.add(window)
    await db.commit()
    await db.refresh(window)
    return window
