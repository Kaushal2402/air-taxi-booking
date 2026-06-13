from __future__ import annotations

from datetime import datetime
from typing import Optional
from enum import Enum

from pydantic import BaseModel


class BoardingStatus(str, Enum):
    not_boarded = "not_boarded"
    boarded = "boarded"
    no_show = "no_show"


class ManifestPassenger(BaseModel):
    id: str
    flight_id: str
    seat_label: Optional[str] = None
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    baggage_kg: Optional[float] = None
    special_assistance: Optional[str] = None
    verified: Optional[bool] = False
    boarding_status: Optional[BoardingStatus] = BoardingStatus.not_boarded

    class Config:
        from_attributes = True


class ManifestOut(BaseModel):
    flight_id: str
    booking_ref: Optional[str] = None
    route_summary: Optional[str] = None
    aircraft_reg: Optional[str] = None
    etd: Optional[datetime] = None
    passengers: list[ManifestPassenger] = []
    crew_count: Optional[int] = 0
    total_weight_kg: Optional[float] = None
    mtow_kg: Optional[float] = None
    locked: Optional[bool] = False
    submitted: Optional[bool] = False
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ManifestSummary(BaseModel):
    flight_id: str
    booking_ref: Optional[str] = None
    route_summary: Optional[str] = None
    aircraft_reg: Optional[str] = None
    etd: Optional[datetime] = None
    passenger_count: Optional[int] = 0
    locked: Optional[bool] = False
    submitted: Optional[bool] = False
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ManifestPassengerUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    baggage_kg: Optional[float] = None
    special_assistance: Optional[str] = None
    verified: Optional[bool] = None
    boarding_status: Optional[BoardingStatus] = None


class ManifestLockPayload(BaseModel):
    reason: Optional[str] = None


class ManifestSubmitPayload(BaseModel):
    remarks: Optional[str] = None
