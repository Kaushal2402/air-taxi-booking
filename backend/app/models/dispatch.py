from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class DispatchException(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Active dispatch exception raised for a booking."""

    __tablename__ = "dispatch_exceptions"

    exception_ref: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # no-driver|rejected|stuck-pickup|sla-breach|route-blocked

    booking_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("road_bookings.id"), nullable=True, index=True
    )
    zone_id: Mapped[str] = mapped_column(String(20), nullable=False)
    zone_name: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_class: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    dispatch_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)  # danger|warn|info
    recommended_action: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    action_taken: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by_driver_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)


class SurgeOverride(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Manual surge multiplier override applied to a zone."""

    __tablename__ = "surge_overrides"

    zone_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    zone_name: Mapped[str] = mapped_column(String(100), nullable=False)
    multiplier: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    applies_to: Mapped[str] = mapped_column(String(20), nullable=False, default="all")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    bookings_affected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("admin_users.id"), nullable=True
    )

    # Relationships
    creator: Mapped[Optional[object]] = relationship(
        "AdminUser",
        foreign_keys=[created_by],
        lazy="noload",
    )
