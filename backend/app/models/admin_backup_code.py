from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class AdminBackupCode(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "admin_backup_codes"

    admin_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
