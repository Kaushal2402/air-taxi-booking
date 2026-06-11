from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class AircraftDocumentBase(BaseModel):
    doc_type: str
    doc_number: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_permanent: bool = False
    file_url: Optional[str] = None


class AircraftDocumentCreate(AircraftDocumentBase):
    pass


class AircraftDocumentOut(AircraftDocumentBase):
    id: str
    aircraft_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceWindowBase(BaseModel):
    task: str
    start_dt: datetime
    end_dt: datetime
    status: str = "upcoming"
    notes: Optional[str] = None

    @field_validator("end_dt")
    @classmethod
    def end_after_start(cls, v: datetime, info: object) -> datetime:
        data = getattr(info, "data", {})
        if "start_dt" in data and v <= data["start_dt"]:
            raise ValueError("end_dt must be after start_dt")
        return v


class MaintenanceWindowCreate(MaintenanceWindowBase):
    pass


class MaintenanceWindowOut(MaintenanceWindowBase):
    id: str
    aircraft_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AircraftBase(BaseModel):
    registration_mark: str
    aircraft_type_id: Optional[str] = None
    aircraft_type_name: str
    serial_number: Optional[str] = None
    year_of_manufacture: Optional[int] = None
    seat_capacity: int
    mtow_kg: int
    range_nm: int
    endurance_hours: Optional[str] = None
    home_base_id: Optional[str] = None
    home_base_name: Optional[str] = None
    notes: Optional[str] = None


class AircraftCreate(AircraftBase):
    pass


class AircraftUpdate(BaseModel):
    aircraft_type_name: Optional[str] = None
    seat_capacity: Optional[int] = None
    mtow_kg: Optional[int] = None
    range_nm: Optional[int] = None
    endurance_hours: Optional[str] = None
    home_base_id: Optional[str] = None
    home_base_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    total_flight_hours: Optional[int] = None
    total_cycles: Optional[int] = None


class AircraftOut(AircraftBase):
    id: str
    operator_id: str
    status: str
    total_flight_hours: int
    total_cycles: int
    created_at: datetime
    updated_at: datetime
    documents: list[AircraftDocumentOut] = []
    maintenance_windows: list[MaintenanceWindowOut] = []

    model_config = {"from_attributes": True}


class AircraftListItem(BaseModel):
    id: str
    registration_mark: str
    aircraft_type_name: str
    seat_capacity: int
    range_nm: int
    status: str
    total_flight_hours: int
    total_cycles: int
    home_base_name: Optional[str] = None

    model_config = {"from_attributes": True}
