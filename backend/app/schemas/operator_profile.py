from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr


class OperatorProfileResponse(BaseModel):
    id: str
    name: str
    trade_name: Optional[str] = None
    company_registration_no: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    hq_city: Optional[str] = None
    cert_type: Optional[str] = None
    status: str
    onboarding_status: str
    rejection_reason: Optional[str] = None
    payout_account_ref: Optional[str] = None
    insurance_expiry: Optional[date] = None
    cert_expiry: Optional[date] = None

    model_config = {"from_attributes": True}


class OperatorProfileUpdate(BaseModel):
    trade_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    hq_city: Optional[str] = None


class OnboardingSubmitRequest(BaseModel):
    name: str
    company_registration_no: str
    trade_name: Optional[str] = None
    contact_email: EmailStr
    contact_phone: str
    hq_city: Optional[str] = None
    cert_type: Optional[str] = None


class OnboardingStatusResponse(BaseModel):
    status: str
    onboarding_status: str
    rejection_reason: Optional[str] = None


class CertificationUploadRequest(BaseModel):
    doc_type: str
    file_url: str
    expires_at: Optional[date] = None


class InsuranceUploadRequest(BaseModel):
    file_url: str
    expires_at: Optional[date] = None


class PayoutDetailsUpdate(BaseModel):
    payout_account_ref: str


class DocumentResponse(BaseModel):
    id: str
    doc_type: str
    file_url: str
    expires_at: Optional[date] = None
    status: str
    review_notes: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}
