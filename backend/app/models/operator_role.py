from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UUIDPrimaryKeyMixin


class OperatorRole(Base, UUIDPrimaryKeyMixin):
    """Intra-org role definition for an operator organisation."""

    __tablename__ = "operator_roles"

    operator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    permissions: Mapped[list[OperatorRolePermission]] = relationship(
        "OperatorRolePermission", back_populates="role", cascade="all, delete-orphan"
    )


class OperatorRolePermission(Base, UUIDPrimaryKeyMixin):
    """A single permission granted to an operator role."""

    __tablename__ = "operator_role_permissions"

    operator_role_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("operator_roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission: Mapped[str] = mapped_column(String(120), nullable=False)

    role: Mapped[OperatorRole] = relationship("OperatorRole", back_populates="permissions")
