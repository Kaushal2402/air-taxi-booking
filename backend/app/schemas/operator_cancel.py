from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class BookingCancelItem(BaseModel):
    booking_id: str
    booking_ref: str
    route_from: str
    route_to: str
    aircraft_reg: str
    etd: str
    pax_count: int
    status: str
    cancel_fee_minor: int
    can_cancel: bool
    can_reschedule: bool


class CancelPreviewOut(BaseModel):
    booking_id: str
    booking_ref: str
    cancel_tier: str
    fee_minor: int
    refund_minor: int
    compensation_minor: int
    time_to_departure_hours: float
    policy_desc: str


class CancelPayload(BaseModel):
    reason: str
    force_majeure: bool = False
    notes: Optional[str] = None


class ReschedulePayload(BaseModel):
    new_etd: str
    new_eta: str
    new_aircraft_id: Optional[str] = None
    reason: str


class ReschedulePreviewOut(BaseModel):
    booking_id: str
    new_etd: str
    new_eta: str
    aircraft_reg: str
    fee_minor: int
    policy_desc: str


class CancelActionOut(BaseModel):
    booking_id: str
    booking_ref: str
    new_status: str
    fee_applied_minor: int
    refund_minor: int
    message: str
