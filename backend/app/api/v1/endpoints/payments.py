from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.schemas.payments import (
    BatchListResponse,
    BookingSearchResult,
    ManualEntryRequest,
    ManualEntryResponse,
    PaymentDetail,
    PaymentListResponse,
    ReconciliationSummaryResponse,
    RefundRequest,
    RefundResponse,
    RerunMatchResponse,
    ResolveAllResponse,
    UnmatchedResponse,
)
from app.services import payments_service, audit_service

router = APIRouter()


# ── Transactions ───────────────────────────────────────────────────────────────

@router.get("", response_model=PaymentListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: str | None = Query(None),
    method: str | None = Query(None),
    status: str | None = Query(None),
    gateway: str | None = Query(None),
    service: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    _: AdminUser = Depends(require_permission("payments.view")),
    db=Depends(get_db),
):
    return await payments_service.list_transactions(
        db,
        page=page,
        page_size=page_size,
        search=search,
        method=method,
        status=status,
        gateway=gateway,
        service=service,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", response_model=ManualEntryResponse, status_code=201)
async def create_manual_entry(
    body: ManualEntryRequest,
    request: Request,
    current_user: AdminUser = Depends(require_permission("payments.view")),
    db=Depends(get_db),
):
    result = await payments_service.create_manual_entry(db, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="payment.manual_entry_created",
            target=f"payment:{result.id}",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(),
        )
    except Exception:
        pass
    return result


# ── Booking search (for manual entry auto-fill) — BEFORE /{txn_id} ───────────

@router.get("/booking-search", response_model=BookingSearchResult)
async def search_booking(
    ref: str = Query(..., description="Booking reference e.g. BK-RD-88421"),
    _: AdminUser = Depends(require_permission("payments.view")),
    db=Depends(get_db),
):
    result = await payments_service.search_booking(db, ref)
    if not result:
        raise HTTPException(status_code=404, detail=f"Booking '{ref}' not found")
    return result


# ── Reconciliation — these MUST be defined before /{txn_id} ───────────────────

@router.get("/reconciliation/summary", response_model=ReconciliationSummaryResponse)
async def get_reconciliation_summary(
    _: AdminUser = Depends(require_permission("payments.reconcile")),
    db=Depends(get_db),
):
    return await payments_service.get_reconciliation_summary(db)


@router.get("/reconciliation/batches", response_model=BatchListResponse)
async def list_settlement_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    hours: int = Query(48, ge=1),
    _: AdminUser = Depends(require_permission("payments.reconcile")),
    db=Depends(get_db),
):
    return await payments_service.list_settlement_batches(db, page=page, page_size=page_size, hours=hours)


@router.get("/reconciliation/unmatched", response_model=UnmatchedResponse)
async def list_unmatched_items(
    _: AdminUser = Depends(require_permission("payments.reconcile")),
    db=Depends(get_db),
):
    return await payments_service.list_unmatched_items(db)


@router.post("/reconciliation/rerun", response_model=RerunMatchResponse)
async def rerun_match(
    request: Request,
    current_user: AdminUser = Depends(require_permission("payments.reconcile")),
    db=Depends(get_db),
):
    result = await payments_service.rerun_match(db)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="payment.reconciliation_rerun",
            target="reconciliation:all",
            category="Finance",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@router.post("/reconciliation/resolve-all", response_model=ResolveAllResponse)
async def resolve_all_unmatched(
    request: Request,
    current_user: AdminUser = Depends(require_permission("payments.reconcile")),
    db=Depends(get_db),
):
    result = await payments_service.resolve_all_unmatched(db)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="payment.resolve_all_unmatched",
            target="reconciliation:unmatched",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── Single transaction (must be AFTER /reconciliation/* routes) ───────────────

@router.get("/{txn_id}", response_model=PaymentDetail)
async def get_transaction(
    txn_id: str,
    _: AdminUser = Depends(require_permission("payments.view")),
    db=Depends(get_db),
):
    detail = await payments_service.get_transaction(db, txn_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return detail


@router.post("/{txn_id}/refund", response_model=RefundResponse, status_code=201)
async def issue_refund(
    txn_id: str,
    body: RefundRequest,
    request: Request,
    current_user: AdminUser = Depends(require_permission("payments.refund.initiate")),
    db=Depends(get_db),
):
    result = await payments_service.issue_refund(db, txn_id, body)
    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="payment.refund_issued",
            target=f"payment:{txn_id}",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data=body.model_dump(),
        )
    except Exception:
        pass
    return result
