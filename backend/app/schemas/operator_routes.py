from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class RouteBase(BaseModel):
    origin_code: str
    origin_name: str
    destination_code: str
    destination_name: str
    distance_nm: int
    est_duration_min: int
    eligible_aircraft_types: list[str] = []
    airspace_notes: Optional[str] = None

    @field_validator("distance_nm", "est_duration_min")
    @classmethod
    def positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("must be greater than 0")
        return v


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None
    distance_nm: Optional[int] = None
    est_duration_min: Optional[int] = None
    eligible_aircraft_types: Optional[list[str]] = None
    airspace_notes: Optional[str] = None
    status: Optional[str] = None


class RouteOut(RouteBase):
    id: str
    operator_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RouteListItem(BaseModel):
    id: str
    origin_code: str
    origin_name: str
    destination_code: str
    destination_name: str
    distance_nm: int
    est_duration_min: int
    eligible_aircraft_types: list[str] = []
    status: str

    model_config = {"from_attributes": True}


class ScheduleBase(BaseModel):
    route_id: str
    aircraft_id: Optional[str] = None
    aircraft_registration: Optional[str] = None
    etd: datetime
    eta: datetime
    seats_total: int = 0
    recurrence: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("eta")
    @classmethod
    def eta_after_etd(cls, v: datetime, info: object) -> datetime:
        data = getattr(info, "data", {})
        if "etd" in data and v <= data["etd"]:
            raise ValueError("eta must be after etd")
        return v


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    aircraft_id: Optional[str] = None
    aircraft_registration: Optional[str] = None
    etd: Optional[datetime] = None
    eta: Optional[datetime] = None
    seats_total: Optional[int] = None
    recurrence: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ScheduleOut(ScheduleBase):
    id: str
    operator_id: str
    seats_sold: int
    published: bool
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
