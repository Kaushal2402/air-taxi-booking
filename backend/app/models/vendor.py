from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class Vendor(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "vendors"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="review")  # active | review | suspended
    commission_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=22.0)
    commission_type: Mapped[str] = mapped_column(String(20), nullable=False, default="percentage")  # percentage | flat
    joined_at: Mapped[datetime] = mapped_column(UTCDateTime(), server_default=func.now(), nullable=False)

    # Suspension reason
    flag_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
