from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PricingRuleBase(BaseModel):
    route_id: Optional[str] = None
    aircraft_type_name: str
    rate_type: str
    per_seat_minor: Optional[int] = None
    hourly_rate_minor: Optional[int] = None
    positioning_minor: Optional[int] = None
    baggage_minor: Optional[int] = None
    night_halt_minor: Optional[int] = None
    fuel_surcharge_minor: Optional[int] = None
    currency: str = "INR"
    effective_from: datetime
    effective_to: Optional[datetime] = None
    notes: Optional[str] = None


class PricingRuleCreate(PricingRuleBase):
    pass


class PricingRuleUpdate(BaseModel):
    rate_type: Optional[str] = None
    per_seat_minor: Optional[int] = None
    hourly_rate_minor: Optional[int] = None
    positioning_minor: Optional[int] = None
    baggage_minor: Optional[int] = None
    night_halt_minor: Optional[int] = None
    fuel_surcharge_minor: Optional[int] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    notes: Optional[str] = None


class PricingRuleOut(PricingRuleBase):
    id: str
    operator_id: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SurchargeBase(BaseModel):
    label: str
    value_text: str
    basis: str
    enabled: bool = True


class SurchargeCreate(SurchargeBase):
    pass


class SurchargeUpdate(BaseModel):
    label: Optional[str] = None
    value_text: Optional[str] = None
    basis: Optional[str] = None
    enabled: Optional[bool] = None


class SurchargeOut(SurchargeBase):
    id: str
    operator_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CorporateAgreementBase(BaseModel):
    client_name: str
    discount_percent: int = 0
    routes_json: Optional[str] = None
    agreement_since: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    status: str = "active"


class CorporateAgreementCreate(CorporateAgreementBase):
    pass


class CorporateAgreementUpdate(BaseModel):
    client_name: Optional[str] = None
    discount_percent: Optional[int] = None
    routes_json: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None


class CorporateAgreementOut(CorporateAgreementBase):
    id: str
    operator_id: str
    bookings_ytd: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuoteLineItem(BaseModel):
    label: str
    sub: Optional[str] = None
    amount_minor: int


class CharterQuoteCreate(BaseModel):
    booking_id: Optional[str] = None
    line_items_json: Optional[str] = None
    total_minor: int
    currency: str = "INR"
    validity_hours: int = 4
    payment_terms: Optional[str] = None
    note_to_requestor: Optional[str] = None


class CharterQuoteUpdate(BaseModel):
    line_items_json: Optional[str] = None
    total_minor: Optional[int] = None
    validity_hours: Optional[int] = None
    payment_terms: Optional[str] = None
    note_to_requestor: Optional[str] = None


class CharterQuoteOut(BaseModel):
    id: str
    operator_id: str
    booking_id: Optional[str]
    version: int
    line_items_json: Optional[str]
    total_minor: int
    currency: str
    validity_hours: int
    payment_terms: Optional[str]
    note_to_requestor: Optional[str]
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
