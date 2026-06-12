from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class OperatorUser(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User belonging to an operator organisation."""

    __tablename__ = "operator_users"

    operator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Intra-org role slug (kept for fast lookups): operator_admin | ops_manager | dispatcher | finance | crew_coordinator | viewer
    operator_role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer")
    # FK to operator_roles (nullable for backwards compat — resolved by role slug)
    operator_role_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    # Status: invited | active | suspended
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="invited", index=True)

    twofa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    twofa_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    twofa_enrolled_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Display preferences
    timezone: Mapped[str] = mapped_column(String(60), nullable=False, default="Asia/Kolkata")
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="en")
    date_format: Mapped[str] = mapped_column(String(30), nullable=False, default="DD MMM YYYY")
    time_format: Mapped[str] = mapped_column(String(10), nullable=False, default="24h")

    last_login_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Relationships
    sessions: Mapped[list[OperatorSession]] = relationship(
        "OperatorSession", back_populates="user", cascade="all, delete-orphan"
    )


class OperatorSession(Base, UUIDPrimaryKeyMixin):
    """Persistent refresh-token sessions for operator users."""

    __tablename__ = "operator_sessions"

    operator_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operator_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    user: Mapped[OperatorUser] = relationship("OperatorUser", back_populates="sessions")


class OperatorLoginAttempt(Base, UUIDPrimaryKeyMixin):
    """Audit log for operator authentication events."""

    __tablename__ = "operator_login_attempts"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # event_type: sign_in | sign_in_failed | 2fa_verified | 2fa_failed |
    #             password_changed | 2fa_enrolled | 2fa_disabled |
    #             recovery_code_used | email_code_verified
    event_type: Mapped[str] = mapped_column(String(40), nullable=False, default="sign_in")
    attempted_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
