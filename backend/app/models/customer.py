from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UTCDateTime, UUIDPrimaryKeyMixin


class Customer(Base, UUIDPrimaryKeyMixin):
    """Customer profile with wallet balance and cached trip statistics."""

    __tablename__ = "customers"

    seq_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, nullable=True)

    # Identity
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    # Status & segmentation
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    computed_segment: Mapped[str] = mapped_column(String(20), nullable=False, default="regular")
    segment_override: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Wallet
    wallet_balance_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Cached trip metrics (populated by bookings module later)
    trips_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ltv_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_fare_minor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Quality metrics
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cancellation_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Consent preferences (per-customer, inherits platform default at creation)
    marketing_opt_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Activity
    last_active_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Timestamps
    joined_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    wallet_transactions: Mapped[list[WalletTransaction]] = relationship(
        "WalletTransaction", back_populates="customer", lazy="noload"
    )

    @hybrid_property
    def customer_code(self) -> str | None:
        if self.seq_id is None:
            return None
        return f"C-{self.seq_id:04d}"

    @property
    def segment(self) -> str:
        """Returns segment_override if set, otherwise computed_segment."""
        return self.segment_override or self.computed_segment


class WalletTransaction(Base, UUIDPrimaryKeyMixin):
    """Audit record for every wallet credit or debit."""

    __tablename__ = "wallet_transactions"

    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    direction: Mapped[str] = mapped_column(String(10), nullable=False)   # credit | debit
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    audit_note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Notification flags
    notify_push: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notify_sms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notify_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    # Relationship
    customer: Mapped[Customer] = relationship("Customer", back_populates="wallet_transactions")
