from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class FlightDayCard(BaseModel):
    flight_id: str
    booking_ref: str
    route_from: str
    route_to: str
    aircraft_reg: str
    aircraft_type: str
    status: str
    etd: Optional[str] = None
    eta: Optional[str] = None
    atd: Optional[str] = None
    ata: Optional[str] = None
    pax_count: int = 0
    crew_names: list[str] = []
    progress_pct: int = 0
    alert_message: Optional[str] = None


class FlightEvent(BaseModel):
    time: str
    flight_ref: str
    event_type: str  # OPS / ACARS / ATC
    message: str
    tone: str  # info / ok / warn / danger / neutral


class DayBoardOut(BaseModel):
    flights: list[FlightDayCard]
    events: list[FlightEvent]


class FlightDetailOut(BaseModel):
    flight_id: str
    booking_ref: str
    route_from: str
    route_to: str
    aircraft_reg: str
    aircraft_type: str
    status: str
    etd: Optional[str] = None
    eta: Optional[str] = None
    atd: Optional[str] = None
    ata: Optional[str] = None
    altitude: Optional[int] = None
    speed: Optional[int] = None
    heading: Optional[int] = None
    last_acars: Optional[str] = None
    captain: Optional[str] = None
    first_officer: Optional[str] = None
    passengers: list[dict] = []
    baggage_kg: Optional[float] = None
    crew_comms: list[dict] = []


class DepartPayload(BaseModel):
    atd: str
    notes: Optional[str] = None


class ArrivePayload(BaseModel):
    ata: str
    notes: Optional[str] = None


class DelayPayload(BaseModel):
    new_eta: str
    reason: str


class EventLogPayload(BaseModel):
    message: str
