from __future__ import annotations

from fastapi import APIRouter, Depends, Query, UploadFile, File

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.driver import (
    DriverActionRequest,
    DriverCreate,
    DriverDocumentCreate,
    DriverDocumentListResponse,
    DriverDocumentReviewRequest,
    DriverDocumentResponse,
    DriverListResponse,
    DriverResponse,
    DriverWalletAdjustRequest,
    DriverWalletAdjustResponse,
    DriverWalletTransactionListResponse,
    DriverUpdate,
    OnboardingQueueResponse,
    StubResponse,
)
from app.services import driver_service

router = APIRouter()


# ── Driver directory ──────────────────────────────────────────────────────────

@router.get("", response_model=DriverListResponse)
async def list_drivers(
    search: str | None = Query(None),
    status: str | None = Query(None),
    online_status: str | None = Query(None),
    vehicle_class: str | None = Query(None),
    zone_code: str | None = Query(None),
    kyc_status: str | None = Query(None),
    min_rating: float | None = Query(None),
    include_inactive: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.list_drivers(
        db,
        search=search,
        status=status,
        online_status=online_status,
        vehicle_class=vehicle_class,
        zone_code=zone_code,
        kyc_status=kyc_status,
        min_rating=min_rating,
        include_inactive=include_inactive,
        page=page,
        per_page=per_page,
    )


# ── Create driver (manual onboard) ───────────────────────────────────────────

@router.post("", response_model=DriverResponse, status_code=201)
async def create_driver(
    body: DriverCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.create_driver(db, body.model_dump())


# ── Onboarding queue — MUST be defined BEFORE /{id} to avoid route conflict ──

@router.get("/onboarding", response_model=OnboardingQueueResponse)
async def get_onboarding_queue(
    search: str | None = Query(None),
    stage: str | None = Query(None),
    vehicle_class: str | None = Query(None),
    zone_code: str | None = Query(None),
    missing_doc: str | None = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.get_onboarding_queue(
        db,
        search=search,
        stage=stage,
        vehicle_class=vehicle_class,
        zone_code=zone_code,
        missing_doc=missing_doc,
    )


# ── Single driver ─────────────────────────────────────────────────────────────

@router.get("/{id}", response_model=DriverResponse)
async def get_driver(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.get_driver(db, id)


@router.patch("/{id}", response_model=DriverResponse)
async def update_driver(
    id: str,
    body: DriverUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.update_driver(db, id, body.model_dump(exclude_unset=True))


# ── Driver status actions ─────────────────────────────────────────────────────

@router.post("/{id}/approve", response_model=DriverResponse)
async def approve_driver(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.approve_driver(db, id)


@router.post("/{id}/reject", response_model=DriverResponse)
async def reject_driver(
    id: str,
    body: DriverActionRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.reject_driver(db, id, body.reason)


@router.post("/{id}/suspend", response_model=DriverResponse)
async def suspend_driver(
    id: str,
    body: DriverActionRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.suspend_driver(db, id, body.reason)


@router.post("/{id}/reactivate", response_model=DriverResponse)
async def reactivate_driver(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.reactivate_driver(db, id)


@router.post("/{id}/deactivate", response_model=DriverResponse)
async def deactivate_driver(
    id: str,
    body: DriverActionRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.deactivate_driver(db, id, body.reason)


@router.post("/{id}/force-offline", response_model=DriverResponse)
async def force_offline(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.force_offline(db, id)


# ── Driver documents ──────────────────────────────────────────────────────────

@router.get("/{id}/documents", response_model=DriverDocumentListResponse)
async def get_documents(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.get_documents(db, id)


@router.post("/{id}/documents", response_model=DriverDocumentResponse, status_code=201)
async def create_document(
    id: str,
    body: DriverDocumentCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.create_document(db, id, body.model_dump())


@router.patch("/{id}/documents/{doc_id}", response_model=DriverDocumentResponse)
async def review_document(
    id: str,
    doc_id: str,
    body: DriverDocumentReviewRequest,
    admin_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.review_document(db, id, doc_id, body, reviewed_by=admin_user.email)


@router.post("/{id}/documents/{doc_id}/upload", response_model=DriverDocumentResponse)
async def upload_document_image(
    id: str,
    doc_id: str,
    file: UploadFile = File(...),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.upload_document_image(db, id, doc_id, file)


# ── Driver stubs ──────────────────────────────────────────────────────────────

@router.get("/{id}/trips", response_model=StubResponse)
async def get_driver_trips(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return StubResponse(
        items=[],
        total=0,
        message="Trips will be available after Module 4 integration.",
    )


@router.get("/{id}/earnings", response_model=StubResponse)
async def get_driver_earnings(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return StubResponse(
        items=[],
        total=0,
        message="Earnings will be available after Module 16 integration.",
    )


# ── Driver wallet ─────────────────────────────────────────────────────────────

@router.get("/{id}/wallet/transactions", response_model=DriverWalletTransactionListResponse)
async def get_wallet_transactions(
    id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.get_wallet_transactions(db, id, page=page, per_page=per_page)


@router.post("/{id}/wallet/adjust", response_model=DriverWalletAdjustResponse)
async def adjust_wallet(
    id: str,
    body: DriverWalletAdjustRequest,
    admin_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await driver_service.adjust_wallet(db, id, body, created_by=admin_user.email)
