from __future__ import annotations

from typing import Optional

from sqlalchemy import Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class DeviceToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """FCM device token for a logged-in user on a specific device.

    One row per (user, device). Deleted on logout or when FCM reports the
    token as unregistered/invalid.
    """

    __tablename__ = "device_tokens"

    # 'admin' | 'operator' | 'customer' | 'driver'
    user_type: Mapped[str] = mapped_column(String(20), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # FCM registration token (up to ~512 chars in practice)
    token: Mapped[str] = mapped_column(String(512), nullable=False)

    # 'ios' | 'android' | 'web'
    platform: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Human-readable label sent by the app, e.g. "iPhone 14 Pro"
    device_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Updated each time the token is used successfully
    last_seen_at: Mapped[Optional[str]] = mapped_column(UTCDateTime(), nullable=True)  # type: ignore[assignment]

    __table_args__ = (
        UniqueConstraint("token", name="uq_device_tokens_token"),
        Index("ix_device_tokens_user", "user_type", "user_id"),
    )
