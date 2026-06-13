from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CrewAssignment(BaseModel):
    flight_id: str
    booking_ref: str
    route_from: str
    route_to: str
    aircraft_reg: Optional[str]
    aircraft_type: Optional[str]
    etd: Optional[datetime]
    eta: Optional[datetime]
    status: str
    role: str  # Captain / First Officer / Cabin Crew
    co_crew: list[str]

    model_config = {"from_attributes": True}


class FlightBrief(BaseModel):
    flight_id: str
    booking_ref: str
    route_from: str
    route_to: str
    etd: Optional[datetime]
    eta: Optional[datetime]
    aircraft_reg: Optional[str]
    status: str
    pax_count: int
    total_baggage_kg: int
    mtow_kg: Optional[int]
    special_assistance_flags: list[str]
    crew: list[str]

    model_config = {"from_attributes": True}


class StatusUpdatePayload(BaseModel):
    new_status: str  # boarding | departed | arrived
    notes: Optional[str] = None
