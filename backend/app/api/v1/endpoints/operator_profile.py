"""Operator company profile and onboarding endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_profile import (
    CertificationUploadRequest,
    DocumentResponse,
    InsuranceUploadRequest,
    OnboardingStatusResponse,
    OnboardingSubmitRequest,
    OperatorProfileResponse,
    OperatorProfileUpdate,
    PayoutDetailsUpdate,
)
from app.services import operator_profile_service

router = APIRouter()


@router.get("/profile", response_model=OperatorProfileResponse)
async def get_profile(
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    op = await operator_profile_service.get_profile(db, current_user.operator_id)
    return op


@router.patch("/profile", response_model=OperatorProfileResponse)
async def update_profile(
    body: OperatorProfileUpdate,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    op = await operator_profile_service.update_profile(db, current_user.operator_id, changes)
    return op


@router.post("/onboarding/submit", response_model=OperatorProfileResponse)
async def submit_onboarding(
    body: OnboardingSubmitRequest,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    op = await operator_profile_service.submit_onboarding(
        db, current_user.operator_id, body.model_dump()
    )
    return op


@router.get("/onboarding/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    result = await operator_profile_service.get_onboarding_status(db, current_user.operator_id)
    return result


@router.post("/profile/certifications", response_model=DocumentResponse, status_code=201)
async def upload_certification(
    body: CertificationUploadRequest,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await operator_profile_service.upload_certification(
        db, current_user.operator_id, body.doc_type, body.file_url, body.expires_at
    )
    return doc


@router.post("/profile/insurance", response_model=DocumentResponse, status_code=201)
async def upload_insurance(
    body: InsuranceUploadRequest,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await operator_profile_service.upload_insurance(
        db, current_user.operator_id, body.file_url, body.expires_at
    )
    return doc


@router.patch("/payout-details", response_model=OperatorProfileResponse)
async def update_payout_details(
    body: PayoutDetailsUpdate,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    op = await operator_profile_service.update_payout_details(
        db, current_user.operator_id, body.payout_account_ref
    )
    return op


@router.get("/profile/documents", response_model=list[DocumentResponse])
async def list_documents(
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    docs = await operator_profile_service.list_documents(db, current_user.operator_id)
    return docs
