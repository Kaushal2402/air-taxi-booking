from __future__ import annotations

from typing import Optional

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class SosEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Logged whenever a rider or driver triggers the SOS button."""

    __tablename__ = "sos_events"

    booking_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    booking_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "road" | "air"
    triggered_by: Mapped[str] = mapped_column(String(10), nullable=False)           # "rider" | "driver"
    triggered_by_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    contact_number_dialled: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    location_shared: Mapped[Optional[bool]] = mapped_column(nullable=True)
    ops_alerted: Mapped[Optional[bool]] = mapped_column(nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open | resolved
    resolved_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
