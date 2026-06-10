from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel


# ── Enums / Literals ──────────────────────────────────────────────────────────

# AirBookingStatus values (stored as str in DB)
# Requested | Quote shared | Confirmed | Manifest locked | Boarding |
# Departed | Arrived | Completed | Cancelled | Refunded | Rescheduled


# ── Sub-schemas ───────────────────────────────────────────────────────────────

class ManifestPassenger(BaseModel):
    id: str
    booking_id: str
    seq: int
    name: str
    age: int | None
    id_number: str | None
    body_weight_kg: float
    baggage_weight_kg: float
    special_notes: str | None
    is_minor: bool

    model_config = {"from_attributes": True}


class CharterQuote(BaseModel):
    id: str
    booking_id: str
    operator_id: str
    operator_name: str | None
    aircraft_id: str | None = None
    aircraft_registration: str | None
    aircraft_model: str | None
    pax_capacity: int | None
    range_nm: int | None
    depart_icao: str | None
    arrive_icao: str | None
    etd: datetime | None
    eta: datetime | None
    base_fare_minor: int
    positioning_minor: int
    night_halt_minor: int
    catering_minor: int
    fuel_surcharge_minor: int
    taxes_minor: int
    total_minor: int
    conditions: str | None
    otp_30d_pct: float | None
    score: int | None
    status: str
    is_recommended: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AirBookingNote(BaseModel):
    id: str
    booking_id: str
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AirBookingTimelineEvent(BaseModel):
    id: str
    booking_id: str
    event: str
    message: str | None
    tone: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── List item ─────────────────────────────────────────────────────────────────

class AirBookingListItem(BaseModel):
    id: str
    booking_ref: str
    customer_id: str | None
    customer_name: str | None
    customer_phone: str | None
    operator_id: str | None
    operator_name: str | None
    aircraft_id: str | None
    aircraft_registration: str | None
    service_subtype: str
    service_label: str | None
    route_from: str
    route_to: str
    pax_count: int
    etd: datetime
    scheduled_date: str | None
    status: str
    fare_estimate_minor: int
    fare_final_minor: int | None
    payment_method: str | None
    flagged: bool
    flag_reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Detail ────────────────────────────────────────────────────────────────────

class AirBookingDetail(AirBookingListItem):
    eta: datetime | None
    distance_nm: float | None
    flight_time_min: int | None
    fuel_weight_kg: float | None
    notes: str | None
    internal_reason: str | None
    reschedule_ref: str | None
    timeline: List[AirBookingTimelineEvent]
    admin_notes: List[AirBookingNote]
    manifest_locked: bool
    manifest_locked_at: datetime | None
    # operator info
    operator_otp_pct: float | None
    operator_fleet_count: int | None
    # aircraft info
    aircraft_model: str | None
    aircraft_seats: int | None
    aircraft_mtow_kg: float | None
    aircraft_airworthy_until: datetime | None
    # pilot info
    pilot_name: str | None
    pilot_license: str | None
    copilot_name: str | None


# ── Manifest ──────────────────────────────────────────────────────────────────

class ManifestResponse(BaseModel):
    booking_id: str
    passengers: List[ManifestPassenger]
    total_pax_weight_kg: float
    total_baggage_weight_kg: float
    aircraft_empty_weight_kg: float | None
    fuel_weight_kg: float | None
    total_weight_kg: float | None
    mtow_kg: float | None
    utilization_pct: float | None
    is_within_limits: bool | None
    is_locked: bool


# ── Quotes list ───────────────────────────────────────────────────────────────

class QuotesListResponse(BaseModel):
    booking_id: str
    quotes: List[CharterQuote]


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


# ── Cancel preview ────────────────────────────────────────────────────────────

class CancelTierInfo(BaseModel):
    label: str        # ">48h", "24-48h", "4-24h", "<4h"
    fee_pct: int      # actual computed pct of fare (NOT of base_fee_pct)


class CancelPreviewResponse(BaseModel):
    booking_id: str
    fare_minor: int
    tier: str
    fee_pct: int
    cancel_fee_minor: int
    net_refund_minor: int
    hours_to_etd: float
    is_force_majeure_eligible: bool
    all_tiers: List[CancelTierInfo]  # all 4 tiers with configured fee_pcts


# ── Request bodies ────────────────────────────────────────────────────────────

class AssignOperatorRequest(BaseModel):
    operator_id: str
    aircraft_id: str | None = None
    note: str | None = None


class CancelRequest(BaseModel):
    reason: str
    note: str | None = None
    force_majeure: bool = False
    refund_destination: str = "original"


class RescheduleRequest(BaseModel):
    new_etd: datetime
    reason: str | None = None


class RefundRequest(BaseModel):
    amount_minor: int
    destination: str = "original"
    reason: str | None = None


class ManifestPassengerInput(BaseModel):
    id: str | None = None
    name: str
    age: int | None = None
    id_number: str | None = None
    body_weight_kg: float = 0.0
    baggage_weight_kg: float = 0.0
    special_notes: str | None = None
    is_minor: bool = False


class ManifestUpdateRequest(BaseModel):
    passengers: List[ManifestPassengerInput]


class AddQuoteRequest(BaseModel):
    operator_id: str
    aircraft_id: str | None = None
    aircraft_registration: str | None = None
    aircraft_model: str | None = None
    pax_capacity: int | None = None
    range_nm: int | None = None
    depart_icao: str | None = None
    arrive_icao: str | None = None
    etd: datetime | None = None
    eta: datetime | None = None
    base_fare_minor: int = 0
    positioning_minor: int = 0
    night_halt_minor: int = 0
    catering_minor: int = 0
    fuel_surcharge_minor: int = 0
    taxes_minor: int = 0
    conditions: str | None = None
    otp_30d_pct: float | None = None
    score: int | None = None


class AddNoteRequest(BaseModel):
    note: str


class AdvanceStatusRequest(BaseModel):
    status: str
    note: str | None = None


class FlagRequest(BaseModel):
    flagged: bool
    flag_reason: str | None = None


class QuoteRequestRequest(BaseModel):
    operator_ids: List[str] | None = None  # if None, platform notifies all eligible operators
    note: str | None = None                # optional context for the operator


class CreateAirBookingRequest(BaseModel):
    customer_id: str | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    service_subtype: str                  # helicopter_shuttle | helicopter_on_demand | charter | vip
    route_from: str
    route_to: str
    pax_count: int = 1
    etd: str                              # ISO datetime
    fare_estimate_minor: int = 0
    payment_method: str | None = None     # card | wire | corporate_po | upi | wallet
    operator_id: str | None = None
    aircraft_id: str | None = None
    internal_reason: str | None = None    # required for assisted bookings
    notes: str | None = None
    region_name: str | None = None  # city/region for maintenance window check


# ── Note response ─────────────────────────────────────────────────────────────

class AirBookingNoteResponse(BaseModel):
    id: str
    booking_id: str
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}
