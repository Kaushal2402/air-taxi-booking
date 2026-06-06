from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Queue ─────────────────────────────────────────────────────────────────────

class QueueItemResponse(BaseModel):
    id: str
    booking_ref: str
    customer_name: str | None
    vehicle_class: str | None
    pickup_address: str
    pickup_lat: float | None
    pickup_lng: float | None
    drop_address: str
    drop_lat: float | None
    drop_lng: float | None
    fare_estimate_minor: int
    fare_display: str
    age_seconds: int
    dispatch_attempts: int
    current_radius_km: float
    zone_id: str | None
    zone_name: str | None
    eligible_count: int
    sla_status: str  # ok|warn|danger
    exception_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class QueueStatsResponse(BaseModel):
    total_in_queue: int
    exceptions_count: int
    online_drivers_count: int
    avg_pickup_eta_seconds: int
    auto_dispatch_rate: float
    stuck_over_timeout: int          # bookings older than driver_acceptance_timeout_sec
    no_driver_count: int
    auto_assign_enabled: bool
    ping_ttl_sec: int
    max_dispatch_retries: int
    # SLA thresholds (from platform settings — exposed so frontend can colour without a second API call)
    sla_dispatch_alert_min: int
    sla_pickup_alert_min: int
    sla_trip_overrun_alert_min: int


# ── Active-booking SLA monitor ────────────────────────────────────────────────

class ActiveBookingSlaItem(BaseModel):
    id: str
    booking_ref: str
    status: str                      # Accepted | Arrived | InProgress
    customer_name: str | None
    driver_name: str | None
    pickup_address: str
    age_seconds: int                 # seconds since status last changed
    sla_type: str                    # "pickup" | "overrun"
    sla_limit_seconds: int           # the threshold in seconds
    sla_status: str                  # "ok" | "warn" | "danger"
    created_at: datetime


class SlaMonitorResponse(BaseModel):
    pickup_breached: int             # Accepted/Arrived bookings over pickup alert
    overrun_breached: int            # InProgress bookings over trip overrun alert
    items: list[ActiveBookingSlaItem]


# ── Eligible Drivers ──────────────────────────────────────────────────────────

class EligibleDriverItem(BaseModel):
    rank: int
    driver_id: str
    name: str
    vehicle_plate: str | None
    distance_km: float
    eta_minutes: int
    rating: float | None
    acceptance_rate: float | None
    recommended: bool
    current_lat: float | None
    current_lng: float | None


class EligibleDriversResponse(BaseModel):
    booking_ref: str
    total_eligible: int
    current_radius_km: float
    ranking_weights: dict[str, int]
    drivers: list[EligibleDriverItem]


# ── Assign ────────────────────────────────────────────────────────────────────

class AssignDriverRequest(BaseModel):
    driver_id: str
    reason: str | None = None


class AssignDriverResponse(BaseModel):
    booking_id: str
    booking_ref: str
    driver_id: str
    driver_name: str
    message: str


# ── Expand Radius ─────────────────────────────────────────────────────────────

class ExpandRadiusResponse(BaseModel):
    booking_id: str
    booking_ref: str
    old_radius_km: float
    new_radius_km: float
    new_eligible_count: int
    message: str


# ── Exceptions ────────────────────────────────────────────────────────────────

class ExceptionStatsResponse(BaseModel):
    active_count: int
    no_driver_count: int
    sla_breach_risk_count: int
    resolved_last_hour: int
    avg_resolve_seconds: int


class ExceptionPatternResponse(BaseModel):
    description: str
    detail: str
    hot_zone_id: str | None
    hot_zone_name: str | None


class ExceptionItemResponse(BaseModel):
    id: str
    exception_ref: str
    kind: str
    booking_id: str | None
    booking_ref: str | None
    customer_name: str | None
    zone_id: str
    zone_name: str
    vehicle_class: str | None
    age_display: str
    age_seconds: int
    dispatch_attempts: int
    recommended_action: str | None
    severity: str
    resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ExceptionsListResponse(BaseModel):
    stats: ExceptionStatsResponse
    pattern: ExceptionPatternResponse
    exceptions: list[ExceptionItemResponse]


class ResolveExceptionRequest(BaseModel):
    action_taken: str
    resolved_by_driver_id: str | None = None


class ResolveExceptionResponse(BaseModel):
    id: str
    exception_ref: str
    resolved: bool
    resolved_at: datetime | None
    message: str


# ── Supply ────────────────────────────────────────────────────────────────────

class SupplyStatsResponse(BaseModel):
    online_drivers_total: int
    approved_drivers_total: int
    online_percentage: float
    live_demand: int
    ds_ratio: float
    zones_above_1_3: int
    active_surge_zones: int
    total_zones: int
    avg_surge_multiplier: float
    capped_zones_count: int


class ZoneSupplyItem(BaseModel):
    zone_id: str
    zone_name: str
    online_drivers: int
    demand: int
    ds_ratio: float
    surge_multiplier: float
    is_capped: bool
    tone: str  # ok|warn|danger
    active_override: dict[str, Any] | None


class SupplyResponse(BaseModel):
    stats: SupplyStatsResponse
    zones: list[ZoneSupplyItem]


# ── Surge Override ────────────────────────────────────────────────────────────

class SurgeOverrideRequest(BaseModel):
    zone_id: str
    zone_name: str
    multiplier: float = Field(..., ge=1.0, le=2.0)
    reason: str
    expires_in_minutes: int = Field(..., ge=1)
    applies_to: str = "all"


class SurgeOverrideResponse(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    multiplier: float
    reason: str
    expires_at: datetime
    applies_to: str
    created_by_name: str | None
    bookings_affected: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SurgeOverrideListItem(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    multiplier: float
    reason: str
    duration_minutes: int
    expires_at: datetime
    is_active: bool
    created_by_name: str | None
    bookings_affected: int
    created_at: datetime

    model_config = {"from_attributes": True}
