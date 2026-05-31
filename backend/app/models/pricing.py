from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class PricingRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Road fare rule — versioned pricing configuration for a zone + vehicle class combo."""

    __tablename__ = "pricing_rules"

    rule_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    zone_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("service_zones.id"), nullable=False, index=True
    )
    vehicle_class_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicle_classes.id"), nullable=False, index=True
    )

    # Versioning
    status: Mapped[str] = mapped_column(String(10), default="draft", nullable=False)  # live | draft | past
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Fare components
    base_fare: Mapped[Any] = mapped_column(Numeric(10, 2), nullable=False)
    per_km: Mapped[Any] = mapped_column(Numeric(10, 4), nullable=False)
    per_min: Mapped[Any] = mapped_column(Numeric(10, 4), nullable=False)
    min_fare: Mapped[Any] = mapped_column(Numeric(10, 2), nullable=False)
    free_km: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    free_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    waiting_per_min: Mapped[Any] = mapped_column(Numeric(10, 4), default=0, nullable=False)
    cancel_fee: Mapped[Any] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    surge_cap: Mapped[Any] = mapped_column(Numeric(5, 2), default=1.8, nullable=False)

    # Time-of-day modifiers: [{"name": str, "window_start": "HH:MM"|null, "window_end": "HH:MM"|null, "type": "pct"|"flat", "value": float}]
    modifiers: Mapped[Any] = mapped_column(JSON, nullable=True)

    # Validity window
    effective_from: Mapped[Any] = mapped_column(DateTime, nullable=False)
    effective_to: Mapped[Optional[Any]] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[Optional[Any]] = mapped_column(DateTime, nullable=True)

    # Relationships
    zone: Mapped[Any] = relationship("ServiceZone", foreign_keys=[zone_id], lazy="select")
    vehicle_class: Mapped[Any] = relationship("VehicleClass", foreign_keys=[vehicle_class_id], lazy="select")


class AirFareRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Air fare rule — versioned pricing configuration for a route / aircraft category."""

    __tablename__ = "air_fare_rules"

    rule_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    route_name: Mapped[str] = mapped_column(String(100), nullable=False)
    aircraft_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)  # shuttle | on-demand | charter | vip

    # Fare components
    per_seat_base: Mapped[Optional[Any]] = mapped_column(Numeric(12, 2), nullable=True)
    min_pax: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hourly_rate: Mapped[Optional[Any]] = mapped_column(Numeric(12, 2), nullable=True)
    baggage_per_kg: Mapped[Any] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    excess_baggage_cap: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    positioning_charge: Mapped[Optional[Any]] = mapped_column(Numeric(12, 2), nullable=True)
    night_halt_charge: Mapped[Optional[Any]] = mapped_column(Numeric(12, 2), nullable=True)
    fuel_surcharge_pct: Mapped[Any] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    tax_gst_pct: Mapped[Any] = mapped_column(Numeric(5, 2), default=5, nullable=False)

    # Versioning
    status: Mapped[str] = mapped_column(String(10), default="draft", nullable=False)  # live | draft | past
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Validity window
    effective_from: Mapped[Any] = mapped_column(DateTime, nullable=False)
    effective_to: Mapped[Optional[Any]] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[Optional[Any]] = mapped_column(DateTime, nullable=True)


class TaxRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tax rule applied to bookings (GST, TDS, etc.)."""

    __tablename__ = "tax_rules"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    hsn_code: Mapped[str] = mapped_column(String(20), nullable=False)
    rate: Mapped[Any] = mapped_column(Numeric(6, 3), nullable=False)  # 0–100
    jurisdiction: Mapped[str] = mapped_column(String(100), nullable=False)
    inclusive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    in_use: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
