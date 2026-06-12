from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class AdminAlert(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """System-generated alerts shown in the admin notification tray."""

    __tablename__ = "admin_alerts"

    # Who it's for — NULL means broadcast to all admins
    admin_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )

    # Category drives the icon colour in the UI
    # booking | driver | operator | dispute | sos | system
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="system")

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Frontend route to navigate on click, e.g. /bookings/abc-123
    href: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    read_at: Mapped[Optional[str]] = mapped_column(UTCDateTime(), nullable=True)  # type: ignore[assignment]

    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("ix_admin_alerts_user_read", "admin_user_id", "is_read"),
    )
