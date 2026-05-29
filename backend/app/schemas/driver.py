from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field, computed_field


# ── Document schemas ──────────────────────────────────────────────────────────

class DriverDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    driver_id: str
    doc_type: str
    status: str
    doc_number: str | None
    expiry_date: Any
    image_url: str | None
    review_note: str | None
    reviewed_by: str | None
    reviewed_at: Any
    created_at: Any
    updated_at: Any


class DriverDocumentCreate(BaseModel):
    doc_type: str
    doc_number: str | None = None
    expiry_date: str | None = None


class DriverDocumentListResponse(BaseModel):
    items: List[DriverDocumentResponse]


# ── Driver schemas ────────────────────────────────────────────────────────────

class DriverBase(BaseModel):
    name: str
    phone: str
    email: str | None = None
    city: str | None = None
    zone_code: str | None = None
    vehicle_class: str | None = None
    vehicle_plate: str | None = None


class DriverCreate(DriverBase):
    """name + phone required; inherited from DriverBase."""
    pass


class DriverUpdate(BaseModel):
    """All fields optional for PATCH semantics."""
    name: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    email: str | None = Field(default=None)
    city: str | None = Field(default=None)
    zone_code: str | None = Field(default=None)
    vehicle_class: str | None = Field(default=None)
    vehicle_plate: str | None = Field(default=None)


class DriverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    seq_id: int | None

    name: str
    phone: str
    email: str | None
    city: str | None
    zone_code: str | None
    vehicle_class: str | None
    vehicle_plate: str | None

    status: str
    online_status: str
    kyc_status: str
    stage: str

    rating: float | None
    acceptance_rate: float | None
    cancellation_rate: float
    trips_count: int
    wallet_balance_minor: int

    flag_reason: str | None
    joined_at: Any
    created_at: Any
    updated_at: Any

    @computed_field  # type: ignore[misc]
    @property
    def driver_code(self) -> str | None:
        if self.seq_id is None:
            return None
        return f"D-{self.seq_id:05d}"


class DriverListResponse(BaseModel):
    items: List[DriverResponse]
    total: int
    page: int
    per_page: int
    status_counts: Dict[str, int]


# ── Onboarding schemas ────────────────────────────────────────────────────────

class OnboardingDriverResponse(DriverResponse):
    documents: List[DriverDocumentResponse] = Field(default_factory=list)
    doc_progress: int
    sla_status: str
    submitted_at: Any


class OnboardingQueueResponse(BaseModel):
    items: List[OnboardingDriverResponse]
    total: int
    stats: Dict[str, int]


# ── Document review schemas ───────────────────────────────────────────────────

class DriverDocumentReviewRequest(BaseModel):
    action: str                          # approve | reject | request_reupload
    expiry_date: str | None = None
    review_note: str | None = None


# ── Action schemas ────────────────────────────────────────────────────────────

class DriverActionRequest(BaseModel):
    reason: str


# ── Wallet schemas ────────────────────────────────────────────────────────────

class DriverWalletAdjustRequest(BaseModel):
    direction: str          # credit | debit
    amount_minor: int       # must be > 0
    reason: str
    audit_note: str | None = None


class DriverWalletTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    driver_id: str
    direction: str
    amount_minor: int
    reason: str
    audit_note: str | None
    created_by: str
    created_at: Any


class DriverWalletAdjustResponse(BaseModel):
    driver: DriverResponse
    transaction: DriverWalletTransactionResponse


class DriverWalletTransactionListResponse(BaseModel):
    items: List[DriverWalletTransactionResponse]
    total: int
    page: int
    per_page: int


# ── Stub response ─────────────────────────────────────────────────────────────

class StubResponse(BaseModel):
    items: list
    total: int
    message: str
