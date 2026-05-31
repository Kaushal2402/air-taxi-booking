from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel


# ── Timeline ──────────────────────────────────────────────────────────────────

class AirBookingTimelineResponse(BaseModel):
    id: str
    booking_id: str
    event: str
    message: Optional[str] = None
    tone: str
    created_at: Any

    model_config = {"from_attributes": True}


# ── Admin Notes ───────────────────────────────────────────────────────────────

class AirBookingNoteResponse(BaseModel):
    id: str
    booking_id: str
    note: str
    created_at: Any

    model_config = {"from_attributes": True}


# ── Manifest Passenger ────────────────────────────────────────────────────────

class ManifestPassengerResponse(BaseModel):
    id: str
    booking_id: str
    seq: int
    name: str
    age: Optional[int] = None
    id_number: Optional[str] = None
    body_weight_kg: float
    baggage_weight_kg: float
    special_notes: Optional[str] = None
    is_minor: bool

    model_config = {"from_attributes": True}


class ManifestPassengerInput(BaseModel):
    id: Optional[str] = None
    name: str
    age: Optional[int] = None
    id_number: Optional[str] = None
    body_weight_kg: float
    baggage_weight_kg: float = 0
    special_notes: Optional[str] = None
    is_minor: bool = False


class ManifestUpdateBody(BaseModel):
    passengers: List[ManifestPassengerInput]


class ManifestResponse(BaseModel):
    booking_id: str
    passengers: List[ManifestPassengerResponse]
    total_pax_weight_kg: float
    total_baggage_weight_kg: float
    aircraft_empty_weight_kg: float
    fuel_weight_kg: float
    total_weight_kg: float
    mtow_kg: float
    utilization_pct: float
    is_within_limits: bool
    is_locked: bool


# ── Charter Quotes ────────────────────────────────────────────────────────────

class CharterQuoteResponse(BaseModel):
    id: str
    booking_id: str
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    aircraft_registration: Optional[str] = None
    aircraft_model: Optional[str] = None
    pax_capacity: Optional[int] = None
    range_nm: Optional[int] = None
    depart_icao: Optional[str] = None
    arrive_icao: Optional[str] = None
    etd: Any = None
    eta: Any = None
    base_fare_minor: int
    positioning_minor: int
    night_halt_minor: int
    catering_minor: int
    fuel_surcharge_minor: int
    taxes_minor: int
    total_minor: int
    conditions: Optional[str] = None
    otp_30d_pct: Optional[float] = None
    score: Optional[int] = None
    status: str
    is_recommended: bool
    created_at: Any

    model_config = {"from_attributes": True}


class CharterQuoteCreate(BaseModel):
    operator_id: Optional[str] = None
    aircraft_id: Optional[str] = None
    aircraft_registration: Optional[str] = None
    aircraft_model: Optional[str] = None
    pax_capacity: Optional[int] = None
    range_nm: Optional[int] = None
    depart_icao: Optional[str] = None
    arrive_icao: Optional[str] = None
    etd: Optional[Any] = None
    eta: Optional[Any] = None
    base_fare_minor: int = 0
    positioning_minor: int = 0
    night_halt_minor: int = 0
    catering_minor: int = 0
    fuel_surcharge_minor: int = 0
    taxes_minor: int = 0
    conditions: Optional[str] = None
    otp_30d_pct: Optional[float] = None
    score: Optional[int] = None


class QuotesListResponse(BaseModel):
    booking_id: str
    quotes: List[CharterQuoteResponse]


# ── List item & detail ────────────────────────────────────────────────────────

class AirBookingListItem(BaseModel):
    id: str
    booking_ref: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    aircraft_id: Optional[str] = None
    aircraft_registration: Optional[str] = None
    service_subtype: str
    service_label: str
    route_from: str
    route_to: str
    pax_count: int
    etd: Any = None
    scheduled_date: Optional[str] = None
    status: str
    fare_estimate_minor: int
    fare_final_minor: Optional[int] = None
    payment_method: Optional[str] = None
    flagged: bool
    flag_reason: Optional[str] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class AirBookingDetail(AirBookingListItem):
    eta: Any = None
    distance_nm: Optional[float] = None
    flight_time_min: Optional[int] = None
    fuel_weight_kg: Optional[float] = None
    notes: Optional[str] = None
    internal_reason: Optional[str] = None
    reschedule_ref: Optional[str] = None
    timeline: List[AirBookingTimelineResponse] = []
    admin_notes: List[AirBookingNoteResponse] = []
    manifest_locked: bool = False
    manifest_locked_at: Any = None
    # Operator info (denormalized)
    operator_otp_pct: Optional[float] = None
    operator_fleet_count: Optional[int] = None
    # Aircraft info (denormalized)
    aircraft_model: Optional[str] = None
    aircraft_seats: Optional[int] = None
    aircraft_mtow_kg: Optional[float] = None
    aircraft_airworthy_until: Any = None
    # Pilot info
    pilot_name: Optional[str] = None
    pilot_license: Optional[str] = None
    copilot_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────────────────────

class AirBookingStats(BaseModel):
    in_air_count: int
    quote_pending_count: int
    manifest_open_count: int
    cancelled_7d_count: int
    refund_queue_count: int
    gross_revenue_minor: int


class AirBookingListResponse(BaseModel):
    items: List[AirBookingListItem]
    total: int
    page: int
    pages: int
    stats: AirBookingStats


# ── Action request bodies ─────────────────────────────────────────────────────

class AssignOperatorBody(BaseModel):
    operator_id: str
    aircraft_id: Optional[str] = None
    note: Optional[str] = None


class CancelAirBookingBody(BaseModel):
    reason: str
    note: Optional[str] = None
    force_majeure: bool = False
    refund_destination: str = "original"   # original | wallet | wire


class RescheduleBody(BaseModel):
    new_etd: Any   # ISO datetime string
    reason: str


class RefundAirBookingBody(BaseModel):
    amount_minor: int
    destination: str   # original | wallet | wire
    reason: str


class FlagAirBookingBody(BaseModel):
    flagged: bool
    flag_reason: Optional[str] = None


class AddAirNoteBody(BaseModel):
    note: str


class AdvanceAirStatusBody(BaseModel):
    status: str    # Confirmed | Manifest locked | Boarding | Departed | Arrived | Completed
    note: Optional[str] = None


class PushQuoteBody(BaseModel):
    """Empty body — booking_id and quote_id come from path params."""
    pass
