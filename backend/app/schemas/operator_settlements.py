from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class SettlementStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    on_hold = "on_hold"
    disputed = "disputed"
    paid = "paid"
    cancelled = "cancelled"


class QueryStatus(str, Enum):
    open = "open"
    resolved = "resolved"


class SettlementSummary(BaseModel):
    id: str
    period_label: str
    period_start: date
    period_end: date
    gross_amount: float
    commission_amount: float
    deduction_amount: float
    net_amount: float
    status: SettlementStatus
    payout_date: Optional[datetime] = None
    payout_ref: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SettlementLineItem(BaseModel):
    id: str
    flight_id: str
    booking_ref: str
    route: str
    flight_date: Any  # date or str
    gross_amount: float
    commission_amount: float
    deduction_amount: float
    net_amount: float

    model_config = {"from_attributes": True}


class SettlementQueryOut(BaseModel):
    id: str
    settlement_id: str
    query_text: str
    status: QueryStatus
    response: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SettlementDetail(SettlementSummary):
    line_items: list[SettlementLineItem] = []
    bank_last4: Optional[str] = None
    bank_account_name: Optional[str] = None
    queries: list[SettlementQueryOut] = []


class SettlementsKPI(BaseModel):
    total_earned: float
    pending_payout: float
    disputed: float
    next_payout_date: Optional[datetime] = None


class SettlementsListResponse(BaseModel):
    kpi: SettlementsKPI
    settlements: list[SettlementSummary]


# Input schema for raising a query
class SettlementQuery(BaseModel):
    query_text: str
