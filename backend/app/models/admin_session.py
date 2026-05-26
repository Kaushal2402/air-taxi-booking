from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class AdminSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "admin_sessions"

    admin_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("admin_users.id"), nullable=False, index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    device_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    device_os: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    two_fa_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
