from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class Ticket(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Support ticket raised by a customer, driver, or operator."""

    __tablename__ = "tickets"

    ticket_ref: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    requester_type: Mapped[str] = mapped_column(String(20), nullable=False)  # customer|driver|operator
    requester_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    requester_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="med")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="open", index=True)

    assignee_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("admin_users.id"), nullable=True, index=True
    )

    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    sla_due_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    sla_breached: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    linked_booking_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    linked_transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    resolution_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    escalated_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)

    # Relationships
    assignee: Mapped[Optional[object]] = relationship(
        "AdminUser",
        foreign_keys=[assignee_id],
        lazy="noload",
    )
    messages: Mapped[list[TicketMessage]] = relationship(
        "TicketMessage",
        back_populates="ticket",
        lazy="noload",
        order_by="TicketMessage.created_at",
    )


class TicketMessage(Base, UUIDPrimaryKeyMixin):
    """A reply or internal note on a support ticket."""

    __tablename__ = "ticket_messages"

    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # reply|internal_note
    author_id: Mapped[str] = mapped_column(String(36), nullable=False)
    author_name: Mapped[str] = mapped_column(String(200), nullable=False)
    author_role: Mapped[str] = mapped_column(String(100), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), server_default=func.now(), nullable=False)

    # Relationships
    ticket: Mapped[Ticket] = relationship("Ticket", back_populates="messages", lazy="noload")


class SlaPolicy(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """SLA response and resolution time targets per ticket category."""

    __tablename__ = "sla_policies"

    category: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    urgent_first_response_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    urgent_resolution_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)

    high_first_response_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    high_resolution_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=180)

    med_first_response_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    med_resolution_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=480)

    low_first_response_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=480)
    low_resolution_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=2880)
