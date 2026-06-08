from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field


# ── Customer schemas ──────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    phone: str
    email: str
    city: str | None = None
    segment_override: str | None = None


class CustomerCreate(CustomerBase):
    """phone + email required; inherited from CustomerBase (both non-optional)."""
    marketing_opt_in: bool | None = None  # None → inherit from platform consent_marketing_opt_in


class CustomerUpdate(BaseModel):
    """All fields optional for PATCH semantics."""
    name: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    email: str | None = Field(default=None)
    city: str | None = Field(default=None)
    segment_override: str | None = Field(default=None)
    marketing_opt_in: bool | None = Field(default=None)


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    seq_id: int | None
    customer_code: str | None

    name: str
    phone: str
    email: str
    city: str | None
    status: str

    computed_segment: str
    segment_override: str | None

    wallet_balance_minor: int
    trips_count: int
    ltv_minor: int
    avg_fare_minor: int | None

    rating: float | None
    cancellation_rate: float
    marketing_opt_in: bool
    last_active_at: Any
    flag_reason: str | None
    joined_at: Any
    created_at: Any
    updated_at: Any

    @computed_field  # type: ignore[misc]
    @property
    def segment(self) -> str:
        return self.segment_override or self.computed_segment


class CustomerListResponse(BaseModel):
    items: List[CustomerResponse]
    total: int
    page: int
    per_page: int
    segment_counts: Dict[str, int]


# ── Wallet schemas ────────────────────────────────────────────────────────────

class WalletAdjustRequest(BaseModel):
    direction: str          # "credit" | "debit"
    amount_minor: int       # must be > 0
    reason: str
    audit_note: str | None = None
    notify_push: bool = False
    notify_sms: bool = False
    notify_email: bool = False


class WalletTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    customer_id: str
    direction: str
    amount_minor: int
    reason: str
    audit_note: str | None
    notify_push: bool
    notify_sms: bool
    notify_email: bool
    created_by: str
    created_at: Any


class WalletAdjustResponse(BaseModel):
    customer: CustomerResponse
    transaction: WalletTransactionResponse


class WalletTransactionListResponse(BaseModel):
    items: List[WalletTransactionResponse]
    total: int
    page: int
    per_page: int


# ── Action request schemas ────────────────────────────────────────────────────

class SuspendRequest(BaseModel):
    reason: str


class FlagRequest(BaseModel):
    reason: str


class BanRequest(BaseModel):
    reason: str
