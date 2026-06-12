from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class OperatorNotificationPref(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "operator_notification_prefs"

    operator_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operator_users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    alert_type: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    push: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("operator_user_id", "alert_type", name="uq_op_notif_pref"),
    )
