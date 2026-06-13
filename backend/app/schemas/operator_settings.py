from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class OperatorSettings(BaseModel):
    operator_id: str
    default_manifest_cutoff_min: Optional[int] = 60
    default_checklist_template: Optional[list[str]] = None
    locale: Optional[str] = "en"
    timezone: Optional[str] = "Asia/Kolkata"
    public_contact_email: Optional[str] = None
    public_contact_phone: Optional[str] = None
    public_contact_name: Optional[str] = None

    model_config = {"from_attributes": True}


class OperatorSettingsUpdate(BaseModel):
    default_manifest_cutoff_min: Optional[int] = None
    default_checklist_template: Optional[list[str]] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    public_contact_email: Optional[str] = None
    public_contact_phone: Optional[str] = None
    public_contact_name: Optional[str] = None
