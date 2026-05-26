from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class AdminInviteToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "admin_invite_tokens"

    admin_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
