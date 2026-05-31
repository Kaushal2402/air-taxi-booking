from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class VehicleMaintenance(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "vehicle_maintenances"

    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id"), nullable=False, index=True)
    milestone_label: Mapped[str] = mapped_column(String(200), nullable=False)
    milestone_km: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    scheduled_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    service_center: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending | done | skipped
    completed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
