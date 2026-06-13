from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.operator_aircraft import OperatorAircraft
from app.models.operator_crew import OperatorCrewMember
from app.models.operator_flight_assignment import FlightCrewAssignment, OperatorFlight
from app.schemas.operator_companion import CrewAssignment, FlightBrief, StatusUpdatePayload

ALLOWED_STATUSES = {"boarding", "departed", "arrived"}


async def _resolve_crew_member_id(
    db: AsyncSession, operator_user_id: str, operator_id: str
) -> str | None:
    """
    Resolve the OperatorCrewMember.id for a given OperatorUser by matching on email.
    The crew record stores an email field that should match the operator user's email.
    Falls back to returning operator_user_id directly for direct pilot_id matches.
    """
    from app.models.operator_user import OperatorUser

    user_result = await db.execute(
        select(OperatorUser).where(OperatorUser.id == operator_user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        return None

    crew_result = await db.execute(
        select(OperatorCrewMember).where(
            OperatorCrewMember.operator_id == operator_id,
            OperatorCrewMember.email == user.email,
        )
    )
    crew = crew_result.scalar_one_or_none()
    return crew.id if crew else operator_user_id


def _determine_role(
    flight: OperatorFlight,
    crew_assignments: list[FlightCrewAssignment],
    crew_member_id: str,
    operator_user_id: str,
) -> str:
    """Derive the calling user's role on this flight."""
    if flight.pilot_id in (crew_member_id, operator_user_id):
        return "Captain"
    if flight.copilot_id in (crew_member_id, operator_user_id):
        return "First Officer"
    for assignment in crew_assignments:
        if assignment.crew_member_id in (crew_member_id, operator_user_id):
            return assignment.role or "Cabin Crew"
    return "Cabin Crew"


def _co_crew_names(
    flight: OperatorFlight,
    crew_assignments: list[FlightCrewAssignment],
    exclude_ids: set[str],
) -> list[str]:
    """Collect names of all other crew members on the flight."""
    names: list[str] = []
    if flight.pilot_name and flight.pilot_id not in exclude_ids:
        names.append(flight.pilot_name)
    if flight.copilot_name and flight.copilot_id not in exclude_ids:
        names.append(flight.copilot_name)
    for a in crew_assignments:
        if a.crew_member_id not in exclude_ids:
            names.append(a.crew_member_name)
    return names


async def get_assignments(
    db: AsyncSession, operator_user_id: str, operator_id: str
) -> list[CrewAssignment]:
    crew_member_id = await _resolve_crew_member_id(db, operator_user_id, operator_id)
    ids_to_match = {i for i in (crew_member_id, operator_user_id) if i}

    result = await db.execute(
        select(OperatorFlight)
        .options(selectinload(OperatorFlight.crew_assignments))
        .where(
            OperatorFlight.operator_id == operator_id,
            or_(
                OperatorFlight.pilot_id.in_(ids_to_match),
                OperatorFlight.copilot_id.in_(ids_to_match),
            ),
        )
        .order_by(OperatorFlight.etd.asc().nullslast())
    )
    flights = list(result.scalars().all())

    # Also include flights where user appears as a crew assignment
    crew_flight_result = await db.execute(
        select(OperatorFlight)
        .options(selectinload(OperatorFlight.crew_assignments))
        .where(
            OperatorFlight.operator_id == operator_id,
            OperatorFlight.id.in_(
                select(FlightCrewAssignment.flight_id).where(
                    FlightCrewAssignment.crew_member_id.in_(ids_to_match)
                )
            ),
        )
        .order_by(OperatorFlight.etd.asc().nullslast())
    )
    crew_flights = list(crew_flight_result.scalars().all())

    # Merge deduplicated
    seen: set[str] = set()
    all_flights: list[OperatorFlight] = []
    for f in flights + crew_flights:
        if f.id not in seen:
            seen.add(f.id)
            all_flights.append(f)

    output: list[CrewAssignment] = []
    for f in all_flights:
        role = _determine_role(f, f.crew_assignments, crew_member_id or "", operator_user_id)
        co_crew = _co_crew_names(f, f.crew_assignments, ids_to_match)
        output.append(
            CrewAssignment(
                flight_id=f.id,
                booking_ref=f.booking_ref,
                route_from=f.origin_name,
                route_to=f.destination_name,
                aircraft_reg=f.aircraft_reg,
                aircraft_type=f.aircraft_type,
                etd=f.etd,
                eta=f.eta,
                status=f.status,
                role=role,
                co_crew=co_crew,
            )
        )
    return output


async def get_flight_brief(
    db: AsyncSession, operator_user_id: str, operator_id: str, flight_id: str
) -> FlightBrief:
    crew_member_id = await _resolve_crew_member_id(db, operator_user_id, operator_id)
    ids_to_match = {i for i in (crew_member_id, operator_user_id) if i}

    result = await db.execute(
        select(OperatorFlight)
        .options(selectinload(OperatorFlight.crew_assignments))
        .where(OperatorFlight.id == flight_id, OperatorFlight.operator_id == operator_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    # Verify the calling user is part of this flight's crew
    is_crew = (
        flight.pilot_id in ids_to_match
        or flight.copilot_id in ids_to_match
        or any(a.crew_member_id in ids_to_match for a in flight.crew_assignments)
    )
    if not is_crew:
        raise HTTPException(status_code=403, detail="Not assigned to this flight")

    # Resolve MTOW from aircraft record
    mtow_kg: int | None = None
    if flight.aircraft_id:
        ac_result = await db.execute(
            select(OperatorAircraft).where(OperatorAircraft.id == flight.aircraft_id)
        )
        ac = ac_result.scalar_one_or_none()
        if ac:
            mtow_kg = ac.mtow_kg

    # Build crew name list (no PII beyond names)
    crew_names: list[str] = []
    if flight.pilot_name:
        crew_names.append(flight.pilot_name)
    if flight.copilot_name:
        crew_names.append(flight.copilot_name)
    for a in flight.crew_assignments:
        crew_names.append(a.crew_member_name)

    # Special assistance flags — derive from notes if present; no PII
    special_flags: list[str] = []
    if flight.notes:
        lower_notes = flight.notes.lower()
        if "wheelchair" in lower_notes:
            special_flags.append("wheelchair")
        if "oxygen" in lower_notes:
            special_flags.append("oxygen")
        if "stretcher" in lower_notes:
            special_flags.append("stretcher")
        if "unaccompanied minor" in lower_notes or "umnr" in lower_notes:
            special_flags.append("unaccompanied_minor")
        if "vip" in lower_notes:
            special_flags.append("vip")

    return FlightBrief(
        flight_id=flight.id,
        booking_ref=flight.booking_ref,
        route_from=flight.origin_name,
        route_to=flight.destination_name,
        etd=flight.etd,
        eta=flight.eta,
        aircraft_reg=flight.aircraft_reg,
        status=flight.status,
        pax_count=flight.pax_count,
        total_baggage_kg=flight.baggage_kg,
        mtow_kg=mtow_kg,
        special_assistance_flags=special_flags,
        crew=crew_names,
    )


async def update_flight_status(
    db: AsyncSession,
    operator_user_id: str,
    operator_id: str,
    flight_id: str,
    payload: StatusUpdatePayload,
) -> dict:
    if payload.new_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Crew may only set status to one of: {', '.join(sorted(ALLOWED_STATUSES))}",
        )

    crew_member_id = await _resolve_crew_member_id(db, operator_user_id, operator_id)
    ids_to_match = {i for i in (crew_member_id, operator_user_id) if i}

    result = await db.execute(
        select(OperatorFlight)
        .options(selectinload(OperatorFlight.crew_assignments))
        .where(OperatorFlight.id == flight_id, OperatorFlight.operator_id == operator_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    is_crew = (
        flight.pilot_id in ids_to_match
        or flight.copilot_id in ids_to_match
        or any(a.crew_member_id in ids_to_match for a in flight.crew_assignments)
    )
    if not is_crew:
        raise HTTPException(status_code=403, detail="Not assigned to this flight")

    flight.status = payload.new_status
    if payload.notes:
        existing = flight.notes or ""
        flight.notes = (existing + "\n" + payload.notes).strip()

    await db.commit()
    await db.refresh(flight)

    return {"flight_id": flight.id, "status": flight.status, "message": "Flight status updated"}
