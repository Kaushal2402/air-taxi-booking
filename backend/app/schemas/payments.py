from __future__ import annotations

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel


# ── List item ──────────────────────────────────────────────────────────────────

class PaymentListItem(BaseModel):
    id: str
    created_at: datetime
    customer_name: str
    customer_id: str
    booking_ref: str
    service: str
    method: str
    vpa: str | None
    gross_amount: int
    gateway_fee: int
    net_amount: int
    status: str
    gateway_ref: str | None
    currency: str

    class Config:
        from_attributes = True


# ── KPIs ───────────────────────────────────────────────────────────────────────

class PaymentKPIs(BaseModel):
    gross_volume: int
    net_revenue: int
    refunds_total: int
    chargebacks_total: int
    success_rate: float


# ── List response ──────────────────────────────────────────────────────────────

class PaymentListResponse(BaseModel):
    items: List[PaymentListItem]
    total: int
    page: int
    page_size: int
    kpis: PaymentKPIs


# ── Detail sub-objects ─────────────────────────────────────────────────────────

class BreakdownItem(BaseModel):
    label: str
    amount: int
    kind: str  # line / total / fee / net


class InstrumentDetail(BaseModel):
    method: str
    display: str
    bank: str
    sub_type: str
    verified: bool
    risk_score: int
    avs_status: str
    three_ds: str


class TimelineEvent(BaseModel):
    event: str
    timestamp: str
    note: str
    status: str  # ok / pending / failed


class RefundSummary(BaseModel):
    id: str
    amount: int
    status: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Payment detail ─────────────────────────────────────────────────────────────

class PaymentDetail(PaymentListItem):
    breakdown: List[BreakdownItem] = []
    instrument: InstrumentDetail | None = None
    timeline: List[TimelineEvent] = []
    refunds: List[RefundSummary] = []


# ── Refund request / response ──────────────────────────────────────────────────

class RefundRequest(BaseModel):
    refund_type: Literal["full", "partial"]
    amount: int | None = None
    reason: str


class RefundResponse(BaseModel):
    refund_id: str
    transaction_id: str
    amount: int
    status: str
    message: str
    created_at: datetime


# ── Reconciliation summary ─────────────────────────────────────────────────────

class GatewaySummary(BaseModel):
    name: str
    ref: str
    expected_amount: int
    settled_amount: int
    variance: int
    match_pct: float
    status: str  # matched / variance / pending


class ReconciliationSummaryResponse(BaseModel):
    cycle_date: str
    total_variance: int
    unmatched_count: int
    gateways: List[GatewaySummary]


# ── Settlement batches ─────────────────────────────────────────────────────────

class BatchItem(BaseModel):
    id: str
    gateway: str
    settlement_date: datetime
    transaction_count: int
    amount: int
    matched_count: int
    status: str

    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    items: List[BatchItem]
    total: int
    page: int
    page_size: int


# ── Unmatched items ────────────────────────────────────────────────────────────

class UnmatchedItem(BaseModel):
    category: str
    count: int
    count_label: str
    amount: int
    note: str
    tone: str  # danger / warn / pending

    class Config:
        from_attributes = True


class UnmatchedResponse(BaseModel):
    items: List[UnmatchedItem]
