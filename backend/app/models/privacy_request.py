from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class PrivacyRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks customer data-export and deletion requests (GDPR / privacy)."""

    __tablename__ = "privacy_requests"

    # Which customer this request belongs to
    customer_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    customer_email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # "export" | "deletion"
    request_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # "pending" | "processing" | "completed" | "rejected"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)

    # Stamped from platform settings when the request is created
    sla_due_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    sla_breached: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Set when auto-processed by the nightly purge job
    auto_processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Admin who approved / rejected (null when auto-processed)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Optional notes from the customer
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
