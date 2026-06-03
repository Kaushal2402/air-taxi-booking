from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class PayoutRunStatus(str, enum.Enum):
    draft = "draft"
    review = "review"
    approved = "approved"
    scheduled = "scheduled"
    processing = "processing"
    paid = "paid"
    failed = "failed"
    cancelled = "cancelled"


class PayoutRunType(str, enum.Enum):
    driver_weekly = "driver_weekly"
    operator_monthly = "operator_monthly"
    referral = "referral"
    vendor = "vendor"


class PayeeStatus(str, enum.Enum):
    pending = "pending"
    ready = "ready"
    hold = "hold"
    bank_fail = "bank_fail"
    paid = "paid"
    cancelled = "cancelled"


class PayoutRun(Base):
    __tablename__ = "payout_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_ref = Column(String(32), unique=True, nullable=False)
    run_type = Column(Enum(PayoutRunType), nullable=False)
    status = Column(Enum(PayoutRunStatus), nullable=False, default=PayoutRunStatus.draft)
    period_label = Column(String(64), nullable=False)
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    payee_count = Column(Integer, nullable=False, default=0)
    gross_amount = Column(Numeric(18, 2), nullable=False, default=0)
    deduction_amount = Column(Numeric(18, 2), nullable=False, default=0)
    hold_amount = Column(Numeric(18, 2), nullable=False, default=0)
    net_amount = Column(Numeric(18, 2), nullable=False, default=0)
    scheduled_at = Column(DateTime, nullable=True)
    approved_by = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    payees = relationship("PayoutPayee", back_populates="run", cascade="all, delete-orphan")


class PayoutPayee(Base):
    __tablename__ = "payout_payees"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("payout_runs.id"), nullable=False)
    entity_type = Column(String(32), nullable=False)  # driver, operator, vendor
    entity_id = Column(String(36), nullable=False)
    entity_name = Column(String(128), nullable=False)
    entity_ref = Column(String(32), nullable=True)
    trip_count = Column(Integer, nullable=False, default=0)
    gross_amount = Column(Numeric(18, 2), nullable=False, default=0)
    incentive_amount = Column(Numeric(18, 2), nullable=False, default=0)
    deduction_amount = Column(Numeric(18, 2), nullable=False, default=0)
    hold_amount = Column(Numeric(18, 2), nullable=False, default=0)
    net_amount = Column(Numeric(18, 2), nullable=False, default=0)
    status = Column(Enum(PayeeStatus), nullable=False, default=PayeeStatus.pending)
    bank_account_ref = Column(String(64), nullable=True)
    utr_number = Column(String(64), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    hold_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    run = relationship("PayoutRun", back_populates="payees")
    adjustments = relationship("PayoutAdjustment", back_populates="payee", cascade="all, delete-orphan")


class AdjustmentType(str, enum.Enum):
    deduction = "deduction"
    addition = "addition"
    clawback = "clawback"
    penalty = "penalty"


class PayoutAdjustment(Base):
    __tablename__ = "payout_adjustments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payee_id = Column(String(36), ForeignKey("payout_payees.id"), nullable=False)
    adjustment_type = Column(Enum(AdjustmentType), nullable=False)
    description = Column(String(256), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    reference = Column(String(128), nullable=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    payee = relationship("PayoutPayee", back_populates="adjustments")
