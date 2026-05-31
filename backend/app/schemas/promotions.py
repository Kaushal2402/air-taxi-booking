from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


# ── Promotion schemas ─────────────────────────────────────────────────────────

class PromotionCreate(BaseModel):
    code: str
    type: str                            # flat | percent
    value: int
    cap_minor: int | None = None
    min_trip_value_minor: int | None = None
    validity_from: datetime
    validity_to: datetime
    per_customer_limit: int = 1
    total_redemption_cap: int | None = None
    total_budget_minor: int = 0
    segment: str | None = None
    service_types: List[str] | None = None
    zones: List[str] | None = None
    new_customers_only: bool = False
    notes: str | None = None


class PromotionUpdate(BaseModel):
    type: str | None = None
    value: int | None = None
    cap_minor: int | None = None
    min_trip_value_minor: int | None = None
    validity_from: datetime | None = None
    validity_to: datetime | None = None
    per_customer_limit: int | None = None
    total_redemption_cap: int | None = None
    total_budget_minor: int | None = None
    segment: str | None = None
    service_types: List[str] | None = None
    zones: List[str] | None = None
    new_customers_only: bool | None = None
    notes: str | None = None
    status: str | None = None


class PromotionResponse(BaseModel):
    id: str
    code: str
    type: str
    value: int
    cap_minor: int | None
    min_trip_value_minor: int | None
    validity_from: Any
    validity_to: Any
    per_customer_limit: int
    total_redemption_cap: int | None
    total_budget_minor: int
    budget_spent_minor: int
    redemption_count: int
    segment: str | None
    service_types: List[str] = []
    zones: List[str] = []
    new_customers_only: bool
    notes: str | None
    status: str
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj: Any, **kwargs: Any) -> "PromotionResponse":  # type: ignore[override]
        # Coerce null JSON columns to empty lists before validation
        if hasattr(obj, "__dict__") or hasattr(obj, "_sa_instance_state"):
            if getattr(obj, "service_types", None) is None:
                obj.service_types = []
            if getattr(obj, "zones", None) is None:
                obj.zones = []
        return super().model_validate(obj, **kwargs)


class PaginatedPromotions(BaseModel):
    items: List[PromotionResponse]
    total: int
    page: int
    pages: int


# ── Analytics schemas ─────────────────────────────────────────────────────────

class DailyPoint(BaseModel):
    date: str
    count: int
    spent_minor: int


class PromoBreakdown(BaseModel):
    code: str
    redemptions: int
    spent_minor: int
    pct: float


class PromotionAnalytics(BaseModel):
    total_redemptions: int
    total_budget_spent_minor: int
    avg_discount_minor: int
    new_customers: int
    blended_cpa_minor: int
    daily_series: List[DailyPoint]
    by_promo: List[PromoBreakdown]


# ── Referral program schemas ───────────────────────────────────────────────────

class ReferralProgramResponse(BaseModel):
    id: str
    is_active: bool
    referrer_reward_minor: int
    referee_reward_minor: int
    qualifying_event: str
    per_referrer_monthly_cap_minor: int
    monthly_budget_minor: int
    fraud_self_referral: bool
    fraud_device_collusion: bool
    fraud_velocity_limit: bool
    fraud_payment_instrument: bool
    fraud_manual_review_threshold_minor: int | None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class ReferralProgramUpdate(BaseModel):
    is_active: bool | None = None
    referrer_reward_minor: int | None = None
    referee_reward_minor: int | None = None
    qualifying_event: str | None = None
    per_referrer_monthly_cap_minor: int | None = None
    monthly_budget_minor: int | None = None
    fraud_self_referral: bool | None = None
    fraud_device_collusion: bool | None = None
    fraud_velocity_limit: bool | None = None
    fraud_payment_instrument: bool | None = None
    fraud_manual_review_threshold_minor: int | None = None


class TopReferrer(BaseModel):
    customer_id: str
    name: str
    converted: int
    reward_minor: int
    at_cap: bool


class ReferralStats(BaseModel):
    referrals_sent: int
    converted: int
    conversion_rate_pct: float
    reward_paid_minor: int
    new_customers: int
    cpa_minor: int
    fraud_blocked: int
    fraud_saved_minor: int
    top_referrers: List[TopReferrer]
