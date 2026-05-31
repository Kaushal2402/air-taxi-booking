from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Boolean, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class VehicleClass(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Road / ground vehicle class catalog (Sedan, XL, Bike, Rental…)."""

    __tablename__ = "vehicle_classes"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Capacity
    seats: Mapped[int] = mapped_column(Integer, default=4)
    luggage_large: Mapped[int] = mapped_column(Integer, default=2)

    # Features
    ac_required: Mapped[bool] = mapped_column(Boolean, default=True)
    pet_friendly: Mapped[bool] = mapped_column(Boolean, default=False)
    airport_eligible: Mapped[bool] = mapped_column(Boolean, default=False)

    # Dispatch eligibility
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    min_year_of_make: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    min_driver_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    permit_required: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    max_vehicle_age_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AircraftType(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Air vehicle type catalog (Bell 407, Phenom 300…)."""

    __tablename__ = "aircraft_types"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(10), nullable=False)   # heli | jet
    seats: Mapped[int] = mapped_column(Integer, default=4)

    # Performance specs
    mtow_kg: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    range_nm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cruise_kts: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ServiceZone(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Geographic service zone defined by a polygon.

    `polygon` is stored as a JSON array of [lat, lng] pairs:
        [[12.97, 77.59], [12.98, 77.60], ...]
    At least 3 vertices required; the frontend closes the polygon automatically.

    `active_service_codes` is a JSON list of VehicleClass.code strings that are
    enabled in this zone, e.g. ["SEDAN_STD", "SEDAN_XL", "BIKE_STD"].
    """

    __tablename__ = "service_zones"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    polygon: Mapped[Any] = mapped_column(JSON, nullable=False)
    tax_jurisdiction: Mapped[str] = mapped_column(String(100), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=50)
    surge_cap: Mapped[float] = mapped_column(Float, default=2.0)
    active_service_codes: Mapped[Any] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    operational_status: Mapped[str] = mapped_column(String(20), default="operational", nullable=False)
    status_note: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)


class AirRoute(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Air route between two helipads / airports.

    `eligible_type_codes` — list of AircraftType.code values allowed on this route.
    `authorized_operators` — list of operator names (Operators module not built yet;
                              stored as plain strings for now).
    """

    __tablename__ = "air_routes"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)

    # Origin
    origin_name: Mapped[str] = mapped_column(String(100), nullable=False)
    origin_code: Mapped[str] = mapped_column(String(20), nullable=False)

    # Destination
    destination_name: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_code: Mapped[str] = mapped_column(String(20), nullable=False)

    # Classification
    category: Mapped[str] = mapped_column(String(20), nullable=False)   # shuttle | on_demand | charter | vip

    # Performance
    distance_nm: Mapped[float] = mapped_column(Float, nullable=False)
    block_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    eligible_type_codes: Mapped[Any] = mapped_column(JSON, nullable=True)
    authorized_operators: Mapped[Any] = mapped_column(JSON, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
