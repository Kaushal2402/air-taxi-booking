from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class ReferralProgram(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Singleton referral program configuration."""

    __tablename__ = "referral_programs"

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    referrer_reward_minor: Mapped[int] = mapped_column(Integer, default=10000, nullable=False)
    referee_reward_minor: Mapped[int] = mapped_column(Integer, default=7500, nullable=False)

    qualifying_event: Mapped[str] = mapped_column(
        String(50), default="first_ride_complete", nullable=False
    )

    per_referrer_monthly_cap_minor: Mapped[int] = mapped_column(
        Integer, default=100000, nullable=False
    )
    monthly_budget_minor: Mapped[int] = mapped_column(
        Integer, default=40000000, nullable=False
    )

    # Fraud controls
    fraud_self_referral: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fraud_device_collusion: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fraud_velocity_limit: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fraud_payment_instrument: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fraud_manual_review_threshold_minor: Mapped[Optional[int]] = mapped_column(
        Integer, default=500000, nullable=True
    )


class Referral(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Individual referral record linking referrer → referee."""

    __tablename__ = "referrals"

    referrer_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    referee_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    referral_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    # pending | converted | rewarded | flagged

    reward_minor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
