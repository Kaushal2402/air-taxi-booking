from __future__ import annotations

import enum

from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class PaymentMethod(str, enum.Enum):
    upi = "upi"
    card = "card"
    wallet = "wallet"
    netbanking = "netbanking"
    corporate = "corporate"
    cash = "cash"


class PaymentStatus(str, enum.Enum):
    initiated = "initiated"
    authorized = "authorized"
    captured = "captured"
    refunded = "refunded"
    part_refund = "part-refund"
    chargeback = "chargeback"
    invoiced = "invoiced"
    pending = "pending"
    failed = "failed"
    disputed = "disputed"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(64), primary_key=True)
    booking_id = Column(String(64), nullable=True)
    customer_id = Column(String(64), nullable=False)
    customer_name = Column(String(255), nullable=False, default="")
    booking_ref = Column(String(64), nullable=False, default="")
    service = Column(String(128), nullable=False, default="")
    method = Column(Enum(PaymentMethod), nullable=False)
    vpa = Column(String(255), nullable=True)
    gross_amount = Column(Integer, nullable=False, default=0)
    gateway_fee = Column(Integer, nullable=False, default=0)
    net_amount = Column(Integer, nullable=False, default=0)
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.initiated)
    gateway_ref = Column(String(255), nullable=True)
    currency = Column(String(8), nullable=False, default="INR")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    refunds = relationship("Refund", back_populates="payment", cascade="all, delete-orphan")


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(String(64), primary_key=True)
    transaction_id = Column(String(64), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Integer, nullable=False)
    refund_type = Column(String(16), nullable=False)
    reason = Column(String(512), nullable=False, default="")
    status = Column(String(32), nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    payment = relationship("Payment", back_populates="refunds")


class ReconciliationBatch(Base):
    __tablename__ = "reconciliation_batches"

    id = Column(String(64), primary_key=True)
    gateway = Column(String(128), nullable=False)
    settlement_date = Column(DateTime, nullable=False)
    transaction_count = Column(Integer, nullable=False, default=0)
    amount = Column(BigInteger, nullable=False, default=0)
    matched_count = Column(Integer, nullable=False, default=0)
    status = Column(String(32), nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class ReconciliationUnmatched(Base):
    __tablename__ = "reconciliation_unmatched"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(255), nullable=False)
    count = Column(Integer, nullable=False, default=0)
    count_label = Column(String(64), nullable=False, default="")
    amount = Column(BigInteger, nullable=False, default=0)
    note = Column(String(512), nullable=False, default="")
    tone = Column(String(16), nullable=False, default="pending")
    cycle_date = Column(Date, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
