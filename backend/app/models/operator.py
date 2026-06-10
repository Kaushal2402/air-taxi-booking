from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Date, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class Operator(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Air operator / charter company."""

    __tablename__ = "operators"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    trade_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    company_registration_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    hq_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cert_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g. NSOP

    # Operator platform status: pending | review | approved | active | paused | deactivated | suspended
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)

    # Onboarding workflow: draft | submitted | in_review | approved | rejected | re_review
    onboarding_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="draft")

    commission_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payout_account_ref: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Site visit: scheduled | done | waived
    site_visit_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    insurance_expiry: Mapped[Optional[Any]] = mapped_column(Date, nullable=True)
    cert_expiry: Mapped[Optional[Any]] = mapped_column(Date, nullable=True)

    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    documents: Mapped[list[OperatorDocument]] = relationship(
        "OperatorDocument", back_populates="operator", lazy="select"
    )
    aircraft: Mapped[list[Aircraft]] = relationship(
        "Aircraft", back_populates="operator", lazy="select"
    )
    pilots: Mapped[list[Pilot]] = relationship(
        "Pilot", back_populates="operator", lazy="select"
    )


class OperatorDocument(Base, UUIDPrimaryKeyMixin):
    """Supporting document uploaded by or on behalf of an operator."""

    __tablename__ = "operator_documents"

    operator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # doc_type: company_registration | nsop_cert | insurance | other
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    expires_at: Mapped[Optional[Any]] = mapped_column(Date, nullable=True)

    # status: pending | approved | rejected | expired
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[Any] = mapped_column(UTCDateTime(), nullable=False)

    # Relationship
    operator: Mapped[Operator] = relationship("Operator", back_populates="documents")


class Aircraft(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Aircraft registered under an operator."""

    __tablename__ = "aircraft"

    operator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Plain string, no FK — catalog module owns type definitions
    aircraft_type_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    registration_mark: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    seat_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    mtow_kg: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    range_nm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # status: ready | maintenance | grounded | pending_review
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending_review", index=True)

    # airworthiness_status: ok | expiring | expired
    airworthiness_status: Mapped[str] = mapped_column(String(20), nullable=False, default="ok")
    airworthiness_expiry: Mapped[Optional[Any]] = mapped_column(Date, nullable=True)
    airworthiness_doc_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # JSON: [{starts_at, ends_at, notes}]
    maintenance_windows: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    operator: Mapped[Operator] = relationship("Operator", back_populates="aircraft")


class Pilot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Pilot registered under an operator."""

    __tablename__ = "pilots"

    operator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    license_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    license_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # CPL | ATPL | PPL

    # JSON: [str] — aircraft type names they're rated for
    type_ratings: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    medical_expiry: Mapped[Optional[Any]] = mapped_column(Date, nullable=True)

    # status: active | grounded | pending_review | inactive
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending_review", index=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    operator: Mapped[Operator] = relationship("Operator", back_populates="pilots")
