from __future__ import annotations

from typing import Any

from pydantic import BaseModel


# ── Operator ──────────────────────────────────────────────────────────────────

class OperatorResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    company_registration_no: str | None
    hq_city: str | None
    cert_type: str | None
    status: str
    commission_pct: float | None
    payout_account_ref: str | None
    site_visit_status: str | None
    insurance_expiry: Any
    cert_expiry: Any
    rejection_reason: str | None
    notes: str | None
    created_at: Any
    updated_at: Any


class OperatorCreate(BaseModel):
    name: str
    company_registration_no: str | None = None
    hq_city: str | None = None
    cert_type: str | None = None
    notes: str | None = None


class OperatorUpdate(BaseModel):
    name: str | None = None
    company_registration_no: str | None = None
    hq_city: str | None = None
    cert_type: str | None = None
    insurance_expiry: Any = None
    cert_expiry: Any = None
    notes: str | None = None
    payout_account_ref: str | None = None
    site_visit_status: str | None = None
    commission_pct: float | None = None


class OperatorDocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    operator_id: str
    doc_type: str
    file_url: str
    expires_at: Any
    status: str
    review_notes: str | None
    created_at: Any


class OperatorDetail(OperatorResponse):
    fleet_count: int
    pilot_count: int
    docs: list[OperatorDocumentResponse]


# ── OperatorDocument ──────────────────────────────────────────────────────────

class OperatorDocumentCreate(BaseModel):
    doc_type: str
    file_url: str
    expires_at: Any = None


class OperatorDocumentUpdate(BaseModel):
    status: str
    review_notes: str | None = None


# ── Aircraft ──────────────────────────────────────────────────────────────────

class AircraftResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    operator_id: str
    aircraft_type_id: str | None
    registration_mark: str
    seat_capacity: int
    mtow_kg: int | None
    range_nm: int | None
    total_hours: int | None
    status: str
    airworthiness_status: str
    airworthiness_expiry: Any
    airworthiness_doc_url: str | None
    maintenance_windows: Any
    notes: str | None
    created_at: Any
    updated_at: Any


class AircraftCreate(BaseModel):
    operator_id: str
    registration_mark: str
    seat_capacity: int
    aircraft_type_id: str | None = None
    mtow_kg: int | None = None
    range_nm: int | None = None
    airworthiness_expiry: Any = None
    airworthiness_doc_url: str | None = None
    notes: str | None = None


class AircraftUpdate(BaseModel):
    registration_mark: str | None = None
    seat_capacity: int | None = None
    mtow_kg: int | None = None
    range_nm: int | None = None
    airworthiness_expiry: Any = None
    airworthiness_doc_url: str | None = None
    maintenance_windows: Any = None
    total_hours: int | None = None
    notes: str | None = None


# ── Pilot ─────────────────────────────────────────────────────────────────────

class PilotResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    operator_id: str
    name: str
    license_no: str | None
    license_type: str | None
    type_ratings: Any
    medical_expiry: Any
    status: str
    notes: str | None
    created_at: Any
    updated_at: Any


class PilotCreate(BaseModel):
    operator_id: str
    name: str
    license_no: str | None = None
    license_type: str | None = None
    type_ratings: Any = None
    medical_expiry: Any = None
    notes: str | None = None


class PilotUpdate(BaseModel):
    name: str | None = None
    license_no: str | None = None
    license_type: str | None = None
    type_ratings: Any = None
    medical_expiry: Any = None
    notes: str | None = None


# ── List responses ────────────────────────────────────────────────────────────

class OperatorListResponse(BaseModel):
    items: list[OperatorResponse]
    total: int


class AircraftListResponse(BaseModel):
    items: list[AircraftResponse]
    total: int


class PilotListResponse(BaseModel):
    items: list[PilotResponse]
    total: int


# ── Performance ───────────────────────────────────────────────────────────────

class OperatorPerformanceResponse(BaseModel):
    otp_pct: float
    load_factor_pct: float
    booking_count_mtd: int
    cancellation_rate_pct: float
    payouts_mtd_amount: float


# ── Action bodies ─────────────────────────────────────────────────────────────

class RejectBody(BaseModel):
    reason: str


class PauseBody(BaseModel):
    reason: str | None = None


class CommissionBody(BaseModel):
    commission_pct: float


class GroundBody(BaseModel):
    reason: str


class MaintenanceBody(BaseModel):
    starts_at: Any
    ends_at: Any
    notes: str | None = None
