from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.common import MessageResponse
from app.schemas.payouts import (
    ApproveRunRequest,
    AdjustmentCreate,
    AdjustmentResponse,
    PayoutPayeeCreate,
    PayoutPayeeListResponse,
    PayoutPayeeResponse,
    PayoutPayeeUpdate,
    PayoutRunCreate,
    PayoutRunListResponse,
    PayoutRunResponse,
    PayoutRunUpdate,
    RejectRunRequest,
)
from app.services import payouts_service

router = APIRouter()


# ── Payout Runs ────────────────────────────────────────────────────────────────

@router.get("/runs", response_model=PayoutRunListResponse)
async def list_runs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    run_type: str | None = Query(None),
    search: str | None = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.list_runs(db, page, page_size, status, run_type, search)


@router.post("/runs", response_model=PayoutRunResponse, status_code=201)
async def create_run(
    body: PayoutRunCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.create_run(db, body.model_dump())


@router.get("/runs/{run_id}", response_model=PayoutRunResponse)
async def get_run(
    run_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.get_run(db, run_id)


@router.patch("/runs/{run_id}", response_model=PayoutRunResponse)
async def update_run(
    run_id: str,
    body: PayoutRunUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.update_run(db, run_id, body.model_dump(exclude_unset=True))


@router.post("/runs/{run_id}/approve", response_model=PayoutRunResponse)
async def approve_run(
    run_id: str,
    body: ApproveRunRequest,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.approve_run(db, run_id, current_user.id, body.notes)


@router.post("/runs/{run_id}/reject", response_model=PayoutRunResponse)
async def reject_run(
    run_id: str,
    body: RejectRunRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.reject_run(db, run_id, body.reason)


@router.delete("/runs/{run_id}", response_model=MessageResponse)
async def delete_run(
    run_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await payouts_service.delete_run(db, run_id)
    return MessageResponse(message="Payout run deleted")


# ── Payees ─────────────────────────────────────────────────────────────────────

@router.get("/runs/{run_id}/payees", response_model=PayoutPayeeListResponse)
async def list_payees(
    run_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    search: str | None = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.list_payees(db, run_id, page, page_size, status, search)


@router.post("/runs/{run_id}/payees", response_model=PayoutPayeeResponse, status_code=201)
async def add_payee(
    run_id: str,
    body: PayoutPayeeCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.add_payee(db, run_id, body.model_dump())


@router.get("/payees/{payee_id}", response_model=PayoutPayeeResponse)
async def get_payee(
    payee_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.get_payee(db, payee_id)


@router.patch("/payees/{payee_id}", response_model=PayoutPayeeResponse)
async def update_payee(
    payee_id: str,
    body: PayoutPayeeUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.update_payee(db, payee_id, body.model_dump(exclude_unset=True))


@router.post("/payees/{payee_id}/adjustments", response_model=AdjustmentResponse, status_code=201)
async def add_adjustment(
    payee_id: str,
    body: AdjustmentCreate,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await payouts_service.add_adjustment(db, payee_id, body.model_dump(), current_user.id)
