from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class AdminEmailOTP(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Single-use 6-digit OTP emailed to the user as a TOTP fallback during 2FA."""
    __tablename__ = "admin_email_otps"

    admin_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    # SHA-256 of the partial token that started this login attempt — scopes the OTP.
    partial_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Delivery channel: 'email' | 'sms'
    channel: Mapped[str] = mapped_column(String(5), nullable=False, default="email")
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
