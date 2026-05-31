from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel


# ── Road (Ground) Fare Rules ──────────────────────────────────────────────────

class RoadRuleModifier(BaseModel):
    """Time-of-day or flat-fee modifier applied on top of the base fare."""
    name: str
    window_start: Optional[str] = None   # "HH:MM" or null (always-on modifier)
    window_end: Optional[str] = None     # "HH:MM" or null
    type: str                            # "pct" | "flat"
    value: float


class RoadRuleBase(BaseModel):
    zone_id: str
    vehicle_class_id: str
    effective_from: Any
    effective_to: Optional[Any] = None
    base_fare: float
    per_km: float
    per_min: float
    min_fare: float
    free_km: int = 0
    free_min: int = 0
    waiting_per_min: float = 0.0
    cancel_fee: float = 0.0
    surge_cap: float = 1.8
    modifiers: Optional[List[RoadRuleModifier]] = None


class RoadRuleCreate(RoadRuleBase):
    pass


class RoadRuleUpdate(BaseModel):
    zone_id: Optional[str] = None
    vehicle_class_id: Optional[str] = None
    effective_from: Optional[Any] = None
    effective_to: Optional[Any] = None
    base_fare: Optional[float] = None
    per_km: Optional[float] = None
    per_min: Optional[float] = None
    min_fare: Optional[float] = None
    free_km: Optional[int] = None
    free_min: Optional[int] = None
    waiting_per_min: Optional[float] = None
    cancel_fee: Optional[float] = None
    surge_cap: Optional[float] = None
    modifiers: Optional[List[RoadRuleModifier]] = None


class RoadRuleResponse(RoadRuleBase):
    id: str
    rule_code: str
    status: str
    version: int
    published_at: Optional[Any] = None
    zone_name: Optional[str] = None
    vehicle_class_name: Optional[str] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class PaginatedRoadRules(BaseModel):
    items: List[RoadRuleResponse]
    total: int
    page: int
    per_page: int


# ── Air Fare Rules ────────────────────────────────────────────────────────────

class AirRuleCreate(BaseModel):
    route_name: str
    aircraft_type: str
    category: str                        # shuttle | on-demand | charter | vip
    per_seat_base: Optional[float] = None
    min_pax: Optional[int] = None
    hourly_rate: Optional[float] = None
    baggage_per_kg: float = 0.0
    excess_baggage_cap: int = 0
    positioning_charge: Optional[float] = None
    night_halt_charge: Optional[float] = None
    fuel_surcharge_pct: float = 0.0
    tax_gst_pct: float = 5.0
    effective_from: Any
    effective_to: Optional[Any] = None


class AirRuleUpdate(BaseModel):
    route_name: Optional[str] = None
    aircraft_type: Optional[str] = None
    category: Optional[str] = None
    per_seat_base: Optional[float] = None
    min_pax: Optional[int] = None
    hourly_rate: Optional[float] = None
    baggage_per_kg: Optional[float] = None
    excess_baggage_cap: Optional[int] = None
    positioning_charge: Optional[float] = None
    night_halt_charge: Optional[float] = None
    fuel_surcharge_pct: Optional[float] = None
    tax_gst_pct: Optional[float] = None
    effective_from: Optional[Any] = None
    effective_to: Optional[Any] = None


class AirRuleResponse(BaseModel):
    id: str
    rule_code: str
    route_name: str
    aircraft_type: str
    category: str
    per_seat_base: Optional[float] = None
    min_pax: Optional[int] = None
    hourly_rate: Optional[float] = None
    baggage_per_kg: float
    excess_baggage_cap: int
    positioning_charge: Optional[float] = None
    night_halt_charge: Optional[float] = None
    fuel_surcharge_pct: float
    tax_gst_pct: float
    status: str
    version: int
    effective_from: Any
    effective_to: Optional[Any] = None
    published_at: Optional[Any] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class PaginatedAirRules(BaseModel):
    items: List[AirRuleResponse]
    total: int
    page: int
    per_page: int


# ── Tax Rules ─────────────────────────────────────────────────────────────────

class TaxRuleCreate(BaseModel):
    name: str
    hsn_code: str
    rate: float
    jurisdiction: str
    inclusive: bool = False
    in_use: Optional[str] = None
    active: bool = True


class TaxRuleUpdate(BaseModel):
    name: Optional[str] = None
    hsn_code: Optional[str] = None
    rate: Optional[float] = None
    jurisdiction: Optional[str] = None
    inclusive: Optional[bool] = None
    in_use: Optional[str] = None
    active: Optional[bool] = None


class TaxRuleResponse(BaseModel):
    id: str
    name: str
    hsn_code: str
    rate: float
    jurisdiction: str
    inclusive: bool
    in_use: Optional[str] = None
    active: bool
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class PaginatedTaxRules(BaseModel):
    items: List[TaxRuleResponse]
    total: int
    page: int
    per_page: int


# ── Fare Simulator ────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    zone_id: str
    vehicle_class_id: str
    distance_km: float
    duration_min: float
    waiting_min: float = 0.0
    toll: float = 0.0
    time_of_day: str                    # "HH:MM"
    day_type: str = "weekday"           # weekday | weekend | holiday
    demand_supply_ratio: float = 1.0
    promo_discount: float = 0.0
    rule_ids: Optional[List[str]] = None


class SimulateBreakdownItem(BaseModel):
    component: str
    rule_ref: str
    inputs: str
    amount: float


class SimulateRuleResult(BaseModel):
    rule_id: str
    rule_code: str
    version: int
    status: str
    fare_total: float
    breakdown: List[SimulateBreakdownItem]


class SimulateResponse(BaseModel):
    results: List[SimulateRuleResult]
