from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel


# ── Timeline Events ───────────────────────────────────────────────────────────

class TimelineEventResponse(BaseModel):
    id: str
    booking_id: str
    event: str
    message: Optional[str] = None
    tone: str
    created_at: Any

    model_config = {"from_attributes": True}


# ── Fare Components ───────────────────────────────────────────────────────────

class FareComponentResponse(BaseModel):
    id: str
    booking_id: str
    label: str
    rule_ref: Optional[str] = None
    amount_minor: int

    model_config = {"from_attributes": True}


# ── Admin Notes ───────────────────────────────────────────────────────────────

class AdminNoteResponse(BaseModel):
    id: str
    booking_id: str
    note: str
    created_at: Any

    model_config = {"from_attributes": True}


# ── Dispute ───────────────────────────────────────────────────────────────────

class DisputeResponse(BaseModel):
    id: str
    dispute_ref: str
    booking_id: str
    reason: str
    note: Optional[str] = None
    priority: str
    stage: str
    action: Optional[str] = None
    refund_amount_minor: Optional[int] = None
    driver_clawback_minor: Optional[int] = None
    resolution_note: Optional[str] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class DisputeListItem(BaseModel):
    id: str
    dispute_ref: str
    booking_id: str
    booking_ref: str
    customer_name: Optional[str] = None
    reason: str
    disputed_amount_minor: int
    priority: str
    stage: str
    created_at: Any

    model_config = {"from_attributes": True}


class DisputeListResponse(BaseModel):
    items: List[DisputeListItem]
    total: int
    page: int
    pages: int


# ── Booking list & detail ─────────────────────────────────────────────────────

class RoadBookingListItem(BaseModel):
    id: str
    booking_ref: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    service_type: str
    vehicle_class: Optional[str] = None
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_address: str
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    status: str
    fare_estimate_minor: int
    fare_final_minor: Optional[int] = None
    payment_method: Optional[str] = None
    flagged: bool
    flag_reason: Optional[str] = None
    scheduled_at: Any
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class RoadBookingDetail(RoadBookingListItem):
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    distance_km: Optional[float] = None
    duration_min: Optional[int] = None
    surge_multiplier: float
    promo_code: Optional[str] = None
    promo_discount_minor: int
    internal_reason: Optional[str] = None
    admin_notes: List[AdminNoteResponse] = []
    timeline: List[TimelineEventResponse] = []
    fare_components: List[FareComponentResponse] = []
    dispute: Optional[DisputeResponse] = None
    driver_vehicle_plate: Optional[str] = None
    driver_vehicle_model: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_ride_count: int
    customer_rating: Optional[float] = None

    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────────────────────

class BookingStats(BaseModel):
    live_count: int
    scheduled_count: int
    cancelled_today: int
    disputed_count: int
    refund_pending_count: int
    gross_revenue_minor: int


class BookingListResponse(BaseModel):
    items: List[RoadBookingListItem]
    total: int
    page: int
    pages: int
    stats: BookingStats


# ── Request bodies ────────────────────────────────────────────────────────────

class AssistedBookingCreate(BaseModel):
    customer_id: Optional[str] = None
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_address: str
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    service_type: str
    vehicle_class: Optional[str] = None
    scheduled_at: Optional[Any] = None
    payment_method: Optional[str] = None
    promo_code: Optional[str] = None
    promo_discount_minor: int = 0    # computed on frontend; stored as fare component
    fare_estimate_minor: int = 0
    internal_reason: Optional[str] = None
    admin_note: Optional[str] = None
    region_name: Optional[str] = None  # city/region for maintenance window check


class CancelBookingBody(BaseModel):
    reason: str
    note: Optional[str] = None
    refund_destination: str = "none"       # original | wallet | none
    override_fee_minor: Optional[int] = None


class ReassignBody(BaseModel):
    driver_id: str
    reason: str


class AdjustFareBody(BaseModel):
    new_fare_minor: int
    reason: str


class RefundBody(BaseModel):
    amount_minor: int
    destination: str                        # original | wallet
    reason: str


class OpenDisputeBody(BaseModel):
    reason: str
    note: Optional[str] = None


class ResolveDisputeBody(BaseModel):
    action: str                             # uphold_fare | partial_refund | full_refund | goodwill_credit
    refund_amount_minor: Optional[int] = None
    driver_clawback_minor: Optional[int] = None
    resolution_note: Optional[str] = None


class FlagBookingBody(BaseModel):
    flagged: bool
    flag_reason: Optional[str] = None


class AddNoteBody(BaseModel):
    note: str


class AdvanceStatusBody(BaseModel):
    status: str    # Accepted | Arrived | InProgress | Completed | Cancelled
    note: Optional[str] = None
