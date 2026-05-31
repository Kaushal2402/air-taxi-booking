from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class RoadBooking(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Road booking record — one per trip."""

    __tablename__ = "road_bookings"

    # Reference
    booking_ref: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)

    # Participants (FKs + denormalized snapshots)
    customer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=True, index=True
    )
    driver_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("drivers.id"), nullable=True, index=True
    )

    # Service info
    service_type: Mapped[str] = mapped_column(String(30), nullable=False)
    vehicle_class: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    # Addresses
    pickup_address: Mapped[str] = mapped_column(String(500), nullable=False)
    pickup_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pickup_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    drop_address: Mapped[str] = mapped_column(String(500), nullable=False)
    drop_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    drop_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Status & lifecycle
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Requested")

    # Fare
    fare_estimate_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fare_final_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Trip metrics
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    duration_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    surge_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # Payment & promo
    payment_method: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    promo_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    promo_discount_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Admin fields
    internal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Scheduling
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Denormalized driver snapshot
    driver_vehicle_plate: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    driver_vehicle_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Denormalized customer snapshot
    customer_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    customer_ride_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    customer_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    timeline_events: Mapped[list[BookingTimelineEvent]] = relationship(
        "BookingTimelineEvent",
        back_populates="booking",
        lazy="noload",
        order_by="BookingTimelineEvent.created_at.desc()",
    )
    fare_components: Mapped[list[BookingFareComponent]] = relationship(
        "BookingFareComponent",
        back_populates="booking",
        lazy="noload",
    )
    admin_notes: Mapped[list[BookingAdminNote]] = relationship(
        "BookingAdminNote",
        back_populates="booking",
        lazy="noload",
        order_by="BookingAdminNote.created_at.desc()",
    )
    dispute: Mapped[Optional[Dispute]] = relationship(
        "Dispute",
        back_populates="booking",
        uselist=False,
        lazy="noload",
    )


class BookingTimelineEvent(Base, UUIDPrimaryKeyMixin):
    """Ordered audit trail of status transitions and admin actions for a booking."""

    __tablename__ = "booking_timeline_events"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("road_bookings.id"), nullable=False, index=True
    )
    event: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tone: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    # Relationship
    booking: Mapped[RoadBooking] = relationship("RoadBooking", back_populates="timeline_events")


class BookingFareComponent(Base, UUIDPrimaryKeyMixin):
    """Individual line items that make up a booking fare."""

    __tablename__ = "booking_fare_components"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("road_bookings.id"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    rule_ref: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    # Relationship
    booking: Mapped[RoadBooking] = relationship("RoadBooking", back_populates="fare_components")


class BookingAdminNote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Internal admin notes attached to a booking."""

    __tablename__ = "booking_admin_notes"

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("road_bookings.id"), nullable=False, index=True
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationship
    booking: Mapped[RoadBooking] = relationship("RoadBooking", back_populates="admin_notes")


class Dispute(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Dispute raised against a booking."""

    __tablename__ = "disputes"

    dispute_ref: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("road_bookings.id"), unique=True, nullable=False, index=True
    )

    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")
    stage: Mapped[str] = mapped_column(String(30), nullable=False, default="open")

    # Resolution fields
    action: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    refund_amount_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    driver_clawback_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    booking: Mapped[RoadBooking] = relationship("RoadBooking", back_populates="dispute")
