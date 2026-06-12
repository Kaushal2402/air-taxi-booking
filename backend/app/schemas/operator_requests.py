from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BookingRequestOut(BaseModel):
    id: str
    operator_id: str
    booking_ref: str
    service_subtype: str
    passenger_name: Optional[str]
    passenger_org: Optional[str]
    origin_name: str
    destination_name: str
    flight_date: Optional[datetime]
    pax_count: int
    baggage_kg: int
    special_requests: Optional[str]
    is_vip: bool
    ttl_expires_at: Optional[datetime]
    status: str
    reject_reason: Optional[str]
    quote_id: Optional[str]
    received_at: datetime
    actioned_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RejectRequest(BaseModel):
    reason: str


class QuoteRequest(BaseModel):
    quote_id: str


class BookingRequestCreate(BaseModel):
    booking_ref: str
    service_subtype: str
    passenger_name: Optional[str] = None
    passenger_org: Optional[str] = None
    origin_name: str
    destination_name: str
    flight_date: Optional[datetime] = None
    pax_count: int = 1
    baggage_kg: int = 0
    special_requests: Optional[str] = None
    is_vip: bool = False
    ttl_expires_at: Optional[datetime] = None
