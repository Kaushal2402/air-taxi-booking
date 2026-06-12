from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CrewAssignmentItem(BaseModel):
    crew_member_id: str
    crew_member_name: str
    role: str

    model_config = {"from_attributes": True}


class FlightOut(BaseModel):
    id: str
    operator_id: str
    booking_ref: str
    booking_request_id: Optional[str]
    origin_name: str
    destination_name: str
    etd: Optional[datetime]
    eta: Optional[datetime]
    pax_count: int
    baggage_kg: int
    aircraft_id: Optional[str]
    aircraft_reg: Optional[str]
    aircraft_type: Optional[str]
    pilot_id: Optional[str]
    pilot_name: Optional[str]
    copilot_id: Optional[str]
    copilot_name: Optional[str]
    status: str
    notes: Optional[str]
    crew_assignments: list[CrewAssignmentItem]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FlightCreate(BaseModel):
    booking_ref: str
    booking_request_id: Optional[str] = None
    origin_name: str
    destination_name: str
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    pax_count: int = 1
    baggage_kg: int = 0
    notes: Optional[str] = None


class AssignResourcesPayload(BaseModel):
    aircraft_id: str
    aircraft_reg: str
    aircraft_type: str
    pilot_id: str
    pilot_name: str
    copilot_id: Optional[str] = None
    copilot_name: Optional[str] = None
    crew: list[CrewAssignmentItem] = []
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None


class EligibleAircraft(BaseModel):
    id: str
    registration_mark: str
    aircraft_type_name: str
    seat_capacity: int
    range_nm: int
    mtow_kg: int
    status: str
    eligibility_note: Optional[str] = None

    model_config = {"from_attributes": True}


class EligibleCrew(BaseModel):
    id: str
    full_name: str
    license_type: Optional[str]
    total_hours: int
    status: str
    availability_note: Optional[str] = None

    model_config = {"from_attributes": True}


class EligibleResourcesOut(BaseModel):
    aircraft: list[EligibleAircraft]
    pilots: list[EligibleCrew]
    crew: list[EligibleCrew]
