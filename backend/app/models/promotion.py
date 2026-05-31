from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class Promotion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Promotion / coupon entity."""

    __tablename__ = "promotions"

    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # flat | percent
    value: Mapped[int] = mapped_column(Integer, nullable=False)

    cap_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    min_trip_value_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    validity_from: Mapped[Any] = mapped_column(UTCDateTime(), nullable=False)
    validity_to: Mapped[Any] = mapped_column(UTCDateTime(), nullable=False)

    per_customer_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_redemption_cap: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    total_budget_minor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    budget_spent_minor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    redemption_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Targeting
    segment: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # first_ride | all | frequent | corporate | loyalist | first_air_ride

    service_types: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)  # list of strings
    zones: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)           # list of strings
    new_customers_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    # draft | active | paused | expired | depleted


class CouponRedemption(Base, UUIDPrimaryKeyMixin):
    """Record of each coupon redemption by a customer."""

    __tablename__ = "coupon_redemptions"

    promotion_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("promotions.id"), nullable=False, index=True
    )
    customer_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    booking_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[Any] = mapped_column(
        UTCDateTime(), nullable=False
    )
