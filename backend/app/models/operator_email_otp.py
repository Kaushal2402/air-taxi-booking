from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import UTCDateTime, UUIDPrimaryKeyMixin


class OperatorEmailOTP(Base, UUIDPrimaryKeyMixin):
    """Single-use 6-digit OTP emailed to an operator user as a TOTP fallback during 2FA."""

    __tablename__ = "operator_email_otps"

    operator_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operator_users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
