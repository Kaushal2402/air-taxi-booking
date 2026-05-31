from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class Vehicle(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "vehicles"

    plate_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    make: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    fuel_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    vehicle_class_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicle_classes.id"), nullable=False, index=True)
    owner_type: Mapped[str] = mapped_column(String(20), nullable=False, default="owner_driver")  # owner_driver | vendor
    owner_vendor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("vendors.id"), nullable=True, index=True)

    linked_driver_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("drivers.id"), nullable=True, index=True)
    linked_since: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    odometer_km: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending | active | suspended | retired
    doc_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # ok | expiring | expired | pending

    # Ground reason stored here (set when vehicle is grounded/suspended)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class VehicleDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "vehicle_documents"

    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id"), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(20), nullable=False)  # rc | insurance | permit | fitness | puc
    doc_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    issued_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending | ok | expiring | rejected | expired
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
