from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class OperatorRoute(Base):
    __tablename__ = "operator_routes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    origin_code: Mapped[str] = mapped_column(String(10), nullable=False)
    origin_name: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_code: Mapped[str] = mapped_column(String(10), nullable=False)
    destination_name: Mapped[str] = mapped_column(String(100), nullable=False)
    distance_nm: Mapped[int] = mapped_column(Integer, nullable=False)
    est_duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    eligible_aircraft_types: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    airspace_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    schedules: Mapped[list[OperatorSchedule]] = relationship("OperatorSchedule", back_populates="route", cascade="all, delete-orphan")


class OperatorSchedule(Base):
    __tablename__ = "operator_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    route_id: Mapped[str] = mapped_column(String(36), ForeignKey("operator_routes.id"), nullable=False, index=True)
    aircraft_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    aircraft_registration: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    etd: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    eta: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    seats_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    seats_sold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    recurrence: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    route: Mapped[OperatorRoute] = relationship("OperatorRoute", back_populates="schedules")
