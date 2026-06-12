from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class OperatorCrewMember(Base):
    __tablename__ = "operator_crew_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    crew_role: Mapped[str] = mapped_column(String(20), nullable=False)
    license_no: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    employee_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    home_base_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    medical_expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_flight_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duty_hours_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")
    availability: Mapped[str] = mapped_column(String(30), nullable=False, default="Available")
    joined_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents: Mapped[list[CrewDocument]] = relationship("CrewDocument", back_populates="crew_member", cascade="all, delete-orphan")
    type_ratings: Mapped[list[CrewTypeRating]] = relationship("CrewTypeRating", back_populates="crew_member", cascade="all, delete-orphan")


class CrewDocument(Base):
    __tablename__ = "crew_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    crew_member_id: Mapped[str] = mapped_column(String(36), ForeignKey("operator_crew_members.id"), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(80), nullable=False)
    doc_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    issued_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_permanent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    crew_member: Mapped[OperatorCrewMember] = relationship("OperatorCrewMember", back_populates="documents")


class CrewTypeRating(Base):
    __tablename__ = "crew_type_ratings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    crew_member_id: Mapped[str] = mapped_column(String(36), ForeignKey("operator_crew_members.id"), nullable=False, index=True)
    aircraft_type_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    aircraft_type_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rating_number: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    crew_member: Mapped[OperatorCrewMember] = relationship("OperatorCrewMember", back_populates="type_ratings")
