from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class OperatorPricingRule(Base):
    __tablename__ = "operator_pricing_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    route_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    aircraft_type_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rate_type: Mapped[str] = mapped_column(String(50), nullable=False)
    per_seat_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hourly_rate_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    positioning_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    baggage_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    night_halt_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fuel_surcharge_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    effective_from: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OperatorSurcharge(Base):
    __tablename__ = "operator_surcharges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    value_text: Mapped[str] = mapped_column(String(50), nullable=False)
    basis: Mapped[str] = mapped_column(String(200), nullable=False)
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OperatorCorporateAgreement(Base):
    __tablename__ = "operator_corporate_agreements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    client_name: Mapped[str] = mapped_column(String(200), nullable=False)
    discount_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    routes_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bookings_ytd: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    agreement_since: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OperatorCharterQuote(Base):
    __tablename__ = "operator_charter_quotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    operator_id: Mapped[str] = mapped_column(String(36), ForeignKey("operators.id"), nullable=False, index=True)
    booking_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    line_items_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    validity_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    note_to_requestor: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
