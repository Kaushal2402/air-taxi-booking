from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, Float, ForeignKey, Integer, String, func
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UTCDateTime, UUIDPrimaryKeyMixin


class Driver(Base, UUIDPrimaryKeyMixin):
    """Driver profile with KYC status, vehicle info, and wallet balance."""

    __tablename__ = "drivers"

    seq_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, nullable=True)

    # Identity
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), unique=True, nullable=True, index=True)
    city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    # Assignment
    zone_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    vehicle_class: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    vehicle_plate: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Status fields
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    online_status: Mapped[str] = mapped_column(String(10), nullable=False, default="offline")
    kyc_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    stage: Mapped[str] = mapped_column(String(20), nullable=False, default="signup")

    # Quality metrics
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    acceptance_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cancellation_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Cached stats
    trips_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wallet_balance_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Flag
    flag_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Document grace period (set when approved despite expired/expiring docs)
    doc_grace_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Location (Module 06 — live dispatch)
    current_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

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
    documents: Mapped[list[DriverDocument]] = relationship(
        "DriverDocument", back_populates="driver", lazy="noload"
    )
    wallet_transactions: Mapped[list[DriverWalletTransaction]] = relationship(
        "DriverWalletTransaction", back_populates="driver", lazy="noload"
    )

    @hybrid_property
    def driver_code(self) -> str | None:
        if self.seq_id is None:
            return None
        return f"D-{self.seq_id:05d}"


class DriverDocument(Base, UUIDPrimaryKeyMixin):
    """KYC document uploaded by or for a driver."""

    __tablename__ = "driver_documents"

    driver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("drivers.id"), nullable=False, index=True
    )

    # Document fields
    doc_type: Mapped[str] = mapped_column(String(20), nullable=False)   # pan|license|rc|insurance|permit|photo
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending|ok|rejected|expired
    doc_number: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Uploaded file
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Review metadata
    review_note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship
    driver: Mapped[Driver] = relationship("Driver", back_populates="documents")


class DriverWalletTransaction(Base, UUIDPrimaryKeyMixin):
    """Audit record for every driver wallet credit or debit."""

    __tablename__ = "driver_wallet_transactions"

    driver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("drivers.id"), nullable=False, index=True
    )

    direction: Mapped[str] = mapped_column(String(10), nullable=False)   # credit | debit
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    audit_note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )

    # Relationship
    driver: Mapped[Driver] = relationship("Driver", back_populates="wallet_transactions")
