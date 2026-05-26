from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, field_validator


# ── Vehicle Classes ───────────────────────────────────────────────────────────

class VehicleClassBase(BaseModel):
    code: str
    name: str
    sort_order: int = 0
    description: Optional[str] = None
    seats: int = 4
    luggage_large: int = 2
    ac_required: bool = True
    pet_friendly: bool = False
    airport_eligible: bool = False
    vehicle_type: Optional[str] = None
    min_year_of_make: Optional[int] = None
    min_driver_rating: Optional[float] = None
    permit_required: Optional[str] = None
    max_vehicle_age_years: Optional[int] = None
    image_url: Optional[str] = None
    is_active: bool = True


class VehicleClassCreate(VehicleClassBase):
    pass


class VehicleClassUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    description: Optional[str] = None
    seats: Optional[int] = None
    luggage_large: Optional[int] = None
    ac_required: Optional[bool] = None
    pet_friendly: Optional[bool] = None
    airport_eligible: Optional[bool] = None
    vehicle_type: Optional[str] = None
    min_year_of_make: Optional[int] = None
    min_driver_rating: Optional[float] = None
    permit_required: Optional[str] = None
    max_vehicle_age_years: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class VehicleClassResponse(VehicleClassBase):
    id: str
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


# ── Aircraft Types ────────────────────────────────────────────────────────────

class AircraftTypeBase(BaseModel):
    code: str
    name: str
    category: str                       # heli | jet
    seats: int = 4
    mtow_kg: Optional[int] = None
    range_nm: Optional[int] = None
    cruise_kts: Optional[int] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in ("heli", "jet"):
            raise ValueError("category must be 'heli' or 'jet'")
        return v


class AircraftTypeCreate(AircraftTypeBase):
    pass


class AircraftTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    seats: Optional[int] = None
    mtow_kg: Optional[int] = None
    range_nm: Optional[int] = None
    cruise_kts: Optional[int] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class AircraftTypeResponse(AircraftTypeBase):
    id: str
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


# ── Service Zones ─────────────────────────────────────────────────────────────

class ServiceZoneBase(BaseModel):
    code: str
    name: str
    polygon: List[List[float]]          # [[lat, lng], ...]  min 3 pairs
    tax_jurisdiction: str
    priority: int = 50
    surge_cap: float = 2.0
    active_service_codes: Optional[List[str]] = None
    is_active: bool = True

    @field_validator("polygon")
    @classmethod
    def validate_polygon(cls, v: List[List[float]]) -> List[List[float]]:
        if len(v) < 3:
            raise ValueError("polygon must have at least 3 vertices")
        for pair in v:
            if len(pair) != 2:
                raise ValueError("each polygon vertex must be [lat, lng]")
        return v


class ServiceZoneCreate(ServiceZoneBase):
    pass


class ServiceZoneUpdate(BaseModel):
    name: Optional[str] = None
    polygon: Optional[List[List[float]]] = None
    tax_jurisdiction: Optional[str] = None
    priority: Optional[int] = None
    surge_cap: Optional[float] = None
    active_service_codes: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ServiceZonePublish(BaseModel):
    """Bump version and mark all draft changes as live."""
    pass


class ServiceZoneResponse(ServiceZoneBase):
    id: str
    version: int
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


# ── Air Routes ────────────────────────────────────────────────────────────────

class AirRouteBase(BaseModel):
    code: str
    origin_name: str
    origin_code: str
    destination_name: str
    destination_code: str
    category: str                       # shuttle | on_demand | charter | vip
    distance_nm: float
    block_time_minutes: int
    eligible_type_codes: Optional[List[str]] = None
    authorized_operators: Optional[List[str]] = None
    is_active: bool = True

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = ("shuttle", "on_demand", "charter", "vip")
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v


class AirRouteCreate(AirRouteBase):
    pass


class AirRouteUpdate(BaseModel):
    origin_name: Optional[str] = None
    origin_code: Optional[str] = None
    destination_name: Optional[str] = None
    destination_code: Optional[str] = None
    category: Optional[str] = None
    distance_nm: Optional[float] = None
    block_time_minutes: Optional[int] = None
    eligible_type_codes: Optional[List[str]] = None
    authorized_operators: Optional[List[str]] = None
    is_active: Optional[bool] = None


class AirRouteResponse(AirRouteBase):
    id: str
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


# ── Geometry validation response ──────────────────────────────────────────────

class GeometryValidationResponse(BaseModel):
    valid: bool
    message: str
    vertex_count: int
    area_km2: Optional[float] = None
