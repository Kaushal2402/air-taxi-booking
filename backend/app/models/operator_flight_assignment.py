from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class OperatorFlight(Base):
    """A flight record linking a booking request to assigned resources."""
    __tablename__ = "operator_flights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    booking_ref: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    booking_request_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    origin_name: Mapped[str] = mapped_column(String(200), nullable=False)
    destination_name: Mapped[str] = mapped_column(String(200), nullable=False)
    etd: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    eta: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    pax_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    baggage_kg: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    aircraft_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    aircraft_reg: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    aircraft_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    pilot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    pilot_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    copilot_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    copilot_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="accepted", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    crew_assignments: Mapped[list[FlightCrewAssignment]] = relationship(
        "FlightCrewAssignment", back_populates="flight", cascade="all, delete-orphan"
    )


class FlightCrewAssignment(Base):
    __tablename__ = "flight_crew_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    flight_id: Mapped[str] = mapped_column(String(36), ForeignKey("operator_flights.id"), nullable=False, index=True)
    crew_member_id: Mapped[str] = mapped_column(String(36), nullable=False)
    crew_member_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    flight: Mapped[OperatorFlight] = relationship("OperatorFlight", back_populates="crew_assignments")
