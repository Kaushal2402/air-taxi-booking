from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Vehicle Document Schemas ──────────────────────────────────────────────────

class VehicleDocumentCreate(BaseModel):
    doc_type: str
    doc_number: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None


class VehicleDocumentReview(BaseModel):
    action: str  # approve | reject | request_reupload
    expiry_date: Optional[date] = None
    review_note: Optional[str] = None


class VehicleDocumentResponse(BaseModel):
    id: str
    vehicle_id: str
    doc_type: str
    doc_number: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    image_url: Optional[str] = None
    status: str
    review_note: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[Any] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


# ── Vehicle Maintenance Schemas ───────────────────────────────────────────────

class VehicleMaintenanceCreate(BaseModel):
    milestone_label: str
    milestone_km: Optional[int] = None
    scheduled_date: Optional[date] = None
    service_center: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "pending"


class VehicleMaintenanceUpdate(BaseModel):
    milestone_label: Optional[str] = None
    milestone_km: Optional[int] = None
    scheduled_date: Optional[date] = None
    service_center: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class VehicleMaintenanceResponse(BaseModel):
    id: str
    vehicle_id: str
    milestone_label: str
    milestone_km: Optional[int] = None
    scheduled_date: Optional[date] = None
    service_center: Optional[str] = None
    notes: Optional[str] = None
    status: str
    completed_at: Optional[Any] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


# ── Vehicle Schemas ───────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    plate_no: str
    make: str
    model: str
    year: int
    color: Optional[str] = None
    fuel_type: Optional[str] = None
    vehicle_class_id: str
    owner_type: str = "owner_driver"
    owner_vendor_id: Optional[str] = None


class VehicleUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    fuel_type: Optional[str] = None
    vehicle_class_id: Optional[str] = None
    owner_type: Optional[str] = None
    owner_vendor_id: Optional[str] = None
    odometer_km: Optional[int] = None


class VehicleResponse(BaseModel):
    id: str
    plate_no: str
    make: str
    model: str
    year: int
    color: Optional[str] = None
    fuel_type: Optional[str] = None
    vehicle_class_id: str
    vehicle_class_name: Optional[str] = None
    vehicle_class_code: Optional[str] = None
    owner_type: str
    owner_vendor_id: Optional[str] = None
    owner_vendor_name: Optional[str] = None
    linked_driver_id: Optional[str] = None
    linked_driver_name: Optional[str] = None
    linked_driver_code: Optional[str] = None
    linked_since: Optional[Any] = None
    odometer_km: int
    status: str
    doc_status: str
    image_url: Optional[str] = None
    flag_reason: Optional[str] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class VehicleDetailResponse(VehicleResponse):
    documents: List[VehicleDocumentResponse] = []
    maintenances: List[VehicleMaintenanceResponse] = []

    model_config = {"from_attributes": True}


class VehicleListResponse(BaseModel):
    items: List[VehicleResponse]
    total: int
    page: int
    per_page: int
    status_counts: Dict[str, int]


# ── Vendor Schemas ────────────────────────────────────────────────────────────

class VendorCreate(BaseModel):
    name: str
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    commission_rate: Optional[float] = 22.0
    commission_type: Optional[str] = "percentage"
    status: Optional[str] = "review"


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    commission_rate: Optional[float] = None
    commission_type: Optional[str] = None
    status: Optional[str] = None


class VendorResponse(BaseModel):
    id: str
    name: str
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str
    commission_rate: Any
    commission_type: str
    vehicle_count: int = 0
    driver_count: int = 0
    joined_at: Any
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class VendorListResponse(BaseModel):
    items: List[VendorResponse]
    total: int
    page: int
    per_page: int


# ── Action Request Schemas ────────────────────────────────────────────────────

class LinkDriverRequest(BaseModel):
    driver_id: str


class GroundVehicleRequest(BaseModel):
    reason: str


class ReassignClassRequest(BaseModel):
    vehicle_class_id: str


class SuspendVendorRequest(BaseModel):
    reason: str
