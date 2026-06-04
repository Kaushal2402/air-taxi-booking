from __future__ import annotations

import enum

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class PermissionState(str, enum.Enum):
    none = "none"
    scoped = "scoped"
    granted = "granted"


class Role(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    scope: Mapped[str] = mapped_column(String(200), nullable=False, default="Global")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class PermissionCatalog(Base):
    __tablename__ = "permission_catalog"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    domain: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    is_scopeable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class RolePermission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "role_permissions"

    role_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission_key: Mapped[str] = mapped_column(
        String(100), ForeignKey("permission_catalog.key", ondelete="CASCADE"),
        nullable=False, index=True
    )
    state: Mapped[str] = mapped_column(String(20), nullable=False, default=PermissionState.none)
    scope_data: Mapped[str | None] = mapped_column(Text, nullable=True)
