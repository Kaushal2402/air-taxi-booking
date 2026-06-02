from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.payments import (
    BatchListResponse,
    PaymentDetail,
    PaymentListResponse,
    ReconciliationSummaryResponse,
    RefundRequest,
    RefundResponse,
    UnmatchedResponse,
)
from app.services import payments_service

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
    _: AdminUser = Depends(get_current_admin_user),
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


# ── Reconciliation — these MUST be defined before /{txn_id} ───────────────────

@router.get("/reconciliation/summary", response_model=ReconciliationSummaryResponse)
async def get_reconciliation_summary(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payments_service.get_reconciliation_summary(db)


@router.get("/reconciliation/batches", response_model=BatchListResponse)
async def list_settlement_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    hours: int = Query(48, ge=1),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payments_service.list_settlement_batches(db, page=page, page_size=page_size, hours=hours)


@router.get("/reconciliation/unmatched", response_model=UnmatchedResponse)
async def list_unmatched_items(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payments_service.list_unmatched_items(db)


# ── Single transaction (must be AFTER /reconciliation/* routes) ───────────────

@router.get("/{txn_id}", response_model=PaymentDetail)
async def get_transaction(
    txn_id: str,
    _: AdminUser = Depends(get_current_admin_user),
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
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await payments_service.issue_refund(db, txn_id, body)
    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return result
