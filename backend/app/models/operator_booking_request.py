from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class OperatorBookingRequest(Base):
    """Tracks booking requests routed to an operator with TTL and action state."""
    __tablename__ = "operator_booking_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    booking_ref: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    service_subtype: Mapped[str] = mapped_column(String(20), nullable=False)
    passenger_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    passenger_org: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    origin_name: Mapped[str] = mapped_column(String(200), nullable=False)
    destination_name: Mapped[str] = mapped_column(String(200), nullable=False)
    flight_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    pax_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    baggage_kg: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    special_requests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_vip: Mapped[bool] = mapped_column(default=False, nullable=False)
    ttl_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quote_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    actioned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actioned_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
