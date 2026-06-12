from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.operator_aircraft import OperatorAircraft
from app.models.operator_crew import OperatorCrewMember
from app.models.operator_flight_assignment import FlightCrewAssignment, OperatorFlight
from app.schemas.operator_assignment import (
    AssignResourcesPayload,
    EligibleAircraft,
    EligibleCrew,
    EligibleResourcesOut,
    FlightCreate,
)


async def list_assignment_board(db: AsyncSession, operator_id: str) -> list[OperatorFlight]:
    result = await db.execute(
        select(OperatorFlight)
        .options(selectinload(OperatorFlight.crew_assignments))
        .where(
            OperatorFlight.operator_id == operator_id,
            OperatorFlight.status.in_(["accepted", "confirmed", "manifest_locked"]),
        )
        .order_by(OperatorFlight.etd.asc().nullslast())
    )
    return list(result.scalars().all())


async def get_flight(db: AsyncSession, operator_id: str, flight_id: str) -> OperatorFlight:
    result = await db.execute(
        select(OperatorFlight)
        .options(selectinload(OperatorFlight.crew_assignments))
        .where(OperatorFlight.id == flight_id, OperatorFlight.operator_id == operator_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight


async def create_flight(db: AsyncSession, operator_id: str, payload: FlightCreate) -> OperatorFlight:
    flight = OperatorFlight(operator_id=operator_id, **payload.model_dump())
    db.add(flight)
    await db.commit()
    await db.refresh(flight)
    return flight


async def get_eligible_resources(
    db: AsyncSession, operator_id: str, flight_id: str
) -> EligibleResourcesOut:
    flight = await get_flight(db, operator_id, flight_id)

    aircraft_result = await db.execute(
        select(OperatorAircraft)
        .where(
            OperatorAircraft.operator_id == operator_id,
            OperatorAircraft.status.in_(["active", "approved"]),
        )
    )
    all_aircraft = list(aircraft_result.scalars().all())
    eligible_aircraft = [
        EligibleAircraft(
            id=a.id,
            registration_mark=a.registration_mark,
            aircraft_type_name=a.aircraft_type_name,
            seat_capacity=a.seat_capacity,
            range_nm=a.range_nm,
            mtow_kg=a.mtow_kg,
            status=a.status,
            eligibility_note="Available" if a.seat_capacity >= flight.pax_count else "Capacity insufficient",
        )
        for a in all_aircraft
    ]

    crew_result = await db.execute(
        select(OperatorCrewMember)
        .where(OperatorCrewMember.operator_id == operator_id, OperatorCrewMember.status == "active")
    )
    all_crew = list(crew_result.scalars().all())
    pilots = [
        EligibleCrew(
            id=c.id,
            full_name=c.full_name,
            license_type=getattr(c, "license_type", None),
            total_hours=getattr(c, "total_flight_hours", 0),
            status=c.status,
        )
        for c in all_crew
        if getattr(c, "role", "").lower() in ("pilot", "captain", "first_officer", "co-pilot")
    ]
    cabin_crew = [
        EligibleCrew(
            id=c.id,
            full_name=c.full_name,
            license_type=getattr(c, "license_type", None),
            total_hours=getattr(c, "total_flight_hours", 0),
            status=c.status,
        )
        for c in all_crew
        if getattr(c, "role", "").lower() not in ("pilot", "captain", "first_officer", "co-pilot")
    ]

    return EligibleResourcesOut(aircraft=eligible_aircraft, pilots=pilots, crew=cabin_crew)


async def assign_resources(
    db: AsyncSession, operator_id: str, flight_id: str, payload: AssignResourcesPayload
) -> OperatorFlight:
    flight = await get_flight(db, operator_id, flight_id)
    if flight.status not in ("accepted", "confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot assign resources in status '{flight.status}'")

    flight.aircraft_id = payload.aircraft_id
    flight.aircraft_reg = payload.aircraft_reg
    flight.aircraft_type = payload.aircraft_type
    flight.pilot_id = payload.pilot_id
    flight.pilot_name = payload.pilot_name
    flight.copilot_id = payload.copilot_id
    flight.copilot_name = payload.copilot_name
    if payload.etd:
        flight.etd = payload.etd
    if payload.eta:
        flight.eta = payload.eta

    for existing in list(flight.crew_assignments):
        await db.delete(existing)

    for crew_item in payload.crew:
        assignment = FlightCrewAssignment(
            flight_id=flight.id,
            crew_member_id=crew_item.crew_member_id,
            crew_member_name=crew_item.crew_member_name,
            role=crew_item.role,
        )
        db.add(assignment)

    await db.commit()
    await db.refresh(flight)
    return flight


async def confirm_flight(db: AsyncSession, operator_id: str, flight_id: str) -> OperatorFlight:
    flight = await get_flight(db, operator_id, flight_id)
    if not (flight.aircraft_id and flight.pilot_id):
        raise HTTPException(status_code=400, detail="Aircraft and pilot must be assigned before confirming")
    if flight.status not in ("accepted",):
        raise HTTPException(status_code=400, detail=f"Cannot confirm flight in status '{flight.status}'")
    flight.status = "confirmed"
    await db.commit()
    await db.refresh(flight)
    return flight
