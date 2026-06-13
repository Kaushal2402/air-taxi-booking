from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class SettlementStatus(str, Enum):
    computed = "computed"
    statement_issued = "statement_issued"
    pending = "pending"
    approved = "approved"
    paid = "paid"
    failed = "failed"


class QueryStatus(str, Enum):
    open = "open"
    resolved = "resolved"


class SettlementSummary(BaseModel):
    id: str
    period_start: date
    period_end: date
    gross_minor: int
    commission_minor: int
    deductions_minor: int
    net_minor: int
    currency: str
    status: SettlementStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class SettlementLineItem(BaseModel):
    id: str
    flight_id: str
    booking_ref: str
    route_summary: str
    flight_date: date
    gross_minor: int
    commission_minor: int
    deduction_minor: int
    net_minor: int
    description: str

    model_config = {"from_attributes": True}


class SettlementDetail(SettlementSummary):
    line_items: list[SettlementLineItem]
    payout_ref: Optional[str] = None
    bank_masked: Optional[str] = None


class SettlementQuery(BaseModel):
    query_text: str


class SettlementQueryOut(BaseModel):
    id: str
    settlement_id: str
    query_text: str
    status: QueryStatus
    created_at: datetime

    model_config = {"from_attributes": True}
