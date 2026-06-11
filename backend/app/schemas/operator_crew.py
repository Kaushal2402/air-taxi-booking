from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class CrewDocumentBase(BaseModel):
    doc_type: str
    doc_number: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_permanent: bool = False
    file_url: Optional[str] = None


class CrewDocumentCreate(CrewDocumentBase):
    pass


class CrewDocumentOut(CrewDocumentBase):
    id: str
    crew_member_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CrewTypeRatingBase(BaseModel):
    aircraft_type_id: Optional[str] = None
    aircraft_type_name: str
    rating_number: Optional[str] = None
    is_current: bool = True
    expiry_date: Optional[date] = None


class CrewTypeRatingCreate(CrewTypeRatingBase):
    pass


class CrewTypeRatingOut(CrewTypeRatingBase):
    id: str
    crew_member_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CrewMemberBase(BaseModel):
    name: str
    crew_role: str
    license_no: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    home_base_name: Optional[str] = None
    medical_expiry: Optional[date] = None
    joined_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_length(cls, v: str) -> str:
        if len(v) < 2 or len(v) > 80:
            raise ValueError("name must be 2–80 characters")
        return v


class CrewMemberCreate(CrewMemberBase):
    pass


class CrewMemberUpdate(BaseModel):
    name: Optional[str] = None
    crew_role: Optional[str] = None
    license_no: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    home_base_name: Optional[str] = None
    medical_expiry: Optional[date] = None
    joined_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    availability: Optional[str] = None
    total_flight_hours: Optional[int] = None
    duty_hours_month: Optional[int] = None


class CrewRatingUpdate(BaseModel):
    ratings: list[CrewTypeRatingCreate]


class CrewMemberOut(CrewMemberBase):
    id: str
    operator_id: str
    total_flight_hours: int
    duty_hours_month: int
    status: str
    availability: str
    created_at: datetime
    updated_at: datetime
    documents: list[CrewDocumentOut] = []
    type_ratings: list[CrewTypeRatingOut] = []

    model_config = {"from_attributes": True}


class CrewMemberListItem(BaseModel):
    id: str
    name: str
    crew_role: str
    license_no: Optional[str] = None
    status: str
    availability: str
    total_flight_hours: int
    duty_hours_month: int
    medical_expiry: Optional[date] = None

    model_config = {"from_attributes": True}
