from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class AirBooking(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Air booking record — helicopter, charter, or VIP flight."""

    __tablename__ = "air_bookings"

    # Reference
    booking_ref: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)

    # Participants
    customer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=True, index=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Operator & aircraft (assigned)
    operator_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    operator_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    operator_otp_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    operator_fleet_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    aircraft_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    aircraft_registration: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    aircraft_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    aircraft_seats: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    aircraft_mtow_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    aircraft_airworthy_until: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Pilot info (denormalized)
    pilot_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    pilot_license: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    copilot_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Service type
    service_subtype: Mapped[str] = mapped_column(String(40), nullable=False)
    service_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Route
    route_from: Mapped[str] = mapped_column(String(100), nullable=False)
    route_to: Mapped[str] = mapped_column(String(100), nullable=False)
    depart_icao: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    arrive_icao: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    distance_nm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    flight_time_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Schedule
    etd: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, index=True)
    eta: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    scheduled_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Passengers
    pax_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Weights (from manifest)
    fuel_weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="Requested", index=True)

    # Fare
    fare_estimate_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fare_final_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Admin / ops fields
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    internal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reschedule_ref: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Manifest lock
    manifest_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    manifest_locked_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Relationships
    passengers: Mapped[list[AirBookingPassenger]] = relationship(
        "AirBookingPassenger",
        back_populates="booking",
        lazy="noload",
        order_by="AirBookingPassenger.seq",
    )
    quotes: Mapped[list[CharterQuote]] = relationship(
        "CharterQuote",
        back_populates="booking",
        lazy="noload",
        order_by="CharterQuote.created_at.desc()",
    )
    admin_notes: Mapped[list[AirBookingNote]] = relationship(
        "AirBookingNote",
        back_populates="booking",
        lazy="noload",
        order_by="AirBookingNote.created_at.desc()",
    )
    timeline: Mapped[list[AirBookingTimeline]] = relationship(
        "AirBookingTimeline",
        back_populates="booking",
        lazy="noload",
        order_by="AirBookingTimeline.created_at.desc()",
    )


class AirBookingPassenger(Base, UUIDPrimaryKeyMixin):
    """Passenger manifest entry for an air booking."""

    __tablename__ = "air_booking_passengers"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("air_bookings.id"), nullable=False, index=True
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    id_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    body_weight_kg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    baggage_weight_kg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    special_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_minor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    booking: Mapped[AirBooking] = relationship("AirBooking", back_populates="passengers")


class CharterQuote(Base, UUIDPrimaryKeyMixin):
    """Quote from an operator for a charter booking."""

    __tablename__ = "charter_quotes"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("air_bookings.id"), nullable=False, index=True
    )
    operator_id: Mapped[str] = mapped_column(String(36), nullable=False)
    operator_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    aircraft_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    aircraft_registration: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    aircraft_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pax_capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    range_nm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    depart_icao: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    arrive_icao: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    etd: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    eta: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    base_fare_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    positioning_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    night_halt_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    catering_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fuel_surcharge_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    taxes_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    otp_30d_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    is_recommended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    booking: Mapped[AirBooking] = relationship("AirBooking", back_populates="quotes")


class AirBookingNote(Base, UUIDPrimaryKeyMixin):
    """Admin notes attached to an air booking."""

    __tablename__ = "air_booking_notes"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("air_bookings.id"), nullable=False, index=True
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    booking: Mapped[AirBooking] = relationship("AirBooking", back_populates="admin_notes")


class AirBookingTimeline(Base, UUIDPrimaryKeyMixin):
    """Timeline events for an air booking."""

    __tablename__ = "air_booking_timeline"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("air_bookings.id"), nullable=False, index=True
    )
    event: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tone: Mapped[str] = mapped_column(String(20), nullable=False, default="info")

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    booking: Mapped[AirBooking] = relationship("AirBooking", back_populates="timeline")
