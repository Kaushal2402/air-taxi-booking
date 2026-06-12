from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class OperatorAircraft(Base):
    __tablename__ = "operator_aircraft"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    registration_mark: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    aircraft_type_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    aircraft_type_name: Mapped[str] = mapped_column(String(100), nullable=False)
    serial_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    year_of_manufacture: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    seat_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    mtow_kg: Mapped[int] = mapped_column(Integer, nullable=False)
    range_nm: Mapped[int] = mapped_column(Integer, nullable=False)
    endurance_hours: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    home_base_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    home_base_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")
    total_flight_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_cycles: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents: Mapped[list[AircraftDocument]] = relationship("AircraftDocument", back_populates="aircraft", cascade="all, delete-orphan")
    maintenance_windows: Mapped[list[AircraftMaintenanceWindow]] = relationship("AircraftMaintenanceWindow", back_populates="aircraft", cascade="all, delete-orphan")


class AircraftDocument(Base):
    __tablename__ = "aircraft_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    aircraft_id: Mapped[str] = mapped_column(String(36), ForeignKey("operator_aircraft.id"), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(80), nullable=False)
    doc_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    issued_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_permanent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    aircraft: Mapped[OperatorAircraft] = relationship("OperatorAircraft", back_populates="documents")


class AircraftMaintenanceWindow(Base):
    __tablename__ = "aircraft_maintenance_windows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    aircraft_id: Mapped[str] = mapped_column(String(36), ForeignKey("operator_aircraft.id"), nullable=False, index=True)
    task: Mapped[str] = mapped_column(String(200), nullable=False)
    start_dt: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_dt: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="upcoming")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    aircraft: Mapped[OperatorAircraft] = relationship("OperatorAircraft", back_populates="maintenance_windows")
