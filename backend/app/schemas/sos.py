from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SosTriggerRequest(BaseModel):
    booking_id: Optional[str] = None
    booking_type: Optional[str] = Field(None, pattern="^(road|air)$")
    triggered_by: str = Field(..., pattern="^(rider|driver)$")
    triggered_by_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None


class SosResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None


class SosEventResponse(BaseModel):
    id: str
    booking_id: Optional[str]
    booking_type: Optional[str]
    triggered_by: str
    triggered_by_id: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    contact_number_dialled: Optional[str]
    location_shared: Optional[bool]
    ops_alerted: Optional[bool]
    notes: Optional[str]
    status: str
    resolved_by: Optional[str]
    resolution_notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
