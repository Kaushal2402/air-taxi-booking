from __future__ import annotations

import enum

from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin
from sqlalchemy import func


class NotificationStatus(str, enum.Enum):
    draft = "draft"
    live = "live"
    paused = "paused"


class NotificationCategory(str, enum.Enum):
    transactional = "Transactional"
    marketing = "Marketing"
    operational = "Operational"


class NotificationDeliveryStatus(str, enum.Enum):
    delivered = "delivered"
    read = "read"
    failed = "failed"
    suppressed = "suppressed"
    pending = "pending"


class NotificationTemplate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notification_templates"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    template_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    event_trigger: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    channels: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON array
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=NotificationStatus.draft)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default=NotificationCategory.transactional)

    push_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    push_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sms_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email_subject: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    email_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wa_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="normal")
    quiet_hours_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sms_fallback_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    dedup_window_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=120)

    sent_30d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    open_rate: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)


class NotificationLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "notification_logs"

    template_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("notification_templates.id", ondelete="SET NULL"), nullable=True, index=True
    )
    template_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    recipient: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=NotificationDeliveryStatus.pending)
    created_at: Mapped[str] = mapped_column(
        UTCDateTime(), server_default=func.now(), nullable=False
    )


class NotificationBroadcast(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notification_broadcasts"

    audience_description: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    channel: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    scheduled_at: Mapped[Optional[str]] = mapped_column(UTCDateTime(), nullable=True)
    estimated_reach: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
