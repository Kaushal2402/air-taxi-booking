from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
    FlagRequest,
    SuspendRequest,
    WalletAdjustRequest,
    WalletAdjustResponse,
    WalletTransactionListResponse,
)
from app.services import audit_service, customer_service

router = APIRouter()


# ── List customers ────────────────────────────────────────────────────────────

@router.get("", response_model=CustomerListResponse)
async def list_customers_endpoint(
    search: str | None = Query(None),
    segment: str | None = Query(None),
    status: str | None = Query(None),
    city: str | None = Query(None),
    include_inactive: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(require_permission("customers.view")),
    db=Depends(get_db),
):
    return await customer_service.list_customers(
        db,
        search=search,
        segment=segment,
        status=status,
        city=city,
        include_inactive=include_inactive,
        page=page,
        per_page=per_page,
    )


# ── Create customer ───────────────────────────────────────────────────────────

@router.post("", response_model=CustomerResponse, status_code=201)
async def create_customer_endpoint(
    body: CustomerCreate,
    current_user: AdminUser = Depends(require_permission("customers.edit")),
    db=Depends(get_db),
):
    return await customer_service.create_customer(db, body, created_by=current_user.name)


# ── Get customer ──────────────────────────────────────────────────────────────

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer_endpoint(
    customer_id: str,
    _: AdminUser = Depends(require_permission("customers.view")),
    db=Depends(get_db),
):
    return await customer_service.get_customer(db, customer_id)


# ── Update customer ───────────────────────────────────────────────────────────

@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer_endpoint(
    customer_id: str,
    body: CustomerUpdate,
    _: AdminUser = Depends(require_permission("customers.edit")),
    db=Depends(get_db),
):
    return await customer_service.update_customer(db, customer_id, body)


# ── Suspend customer ──────────────────────────────────────────────────────────

@router.post("/{customer_id}/suspend", response_model=CustomerResponse)
async def suspend_customer_endpoint(
    customer_id: str,
    body: SuspendRequest,
    request: Request,
    admin: AdminUser = Depends(require_permission("customers.suspend")),
    db=Depends(get_db),
):
    result = await customer_service.suspend_customer(db, customer_id, reason=body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="customer.suspend",
            target=f"customer:{customer_id}",
            category="Support",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── Reactivate customer ───────────────────────────────────────────────────────

@router.post("/{customer_id}/reactivate", response_model=CustomerResponse)
async def reactivate_customer_endpoint(
    customer_id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("customers.suspend")),
    db=Depends(get_db),
):
    result = await customer_service.reactivate_customer(db, customer_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="customer.reactivate",
            target=f"customer:{customer_id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── Flag customer ─────────────────────────────────────────────────────────────

@router.post("/{customer_id}/flag", response_model=CustomerResponse)
async def flag_customer_endpoint(
    customer_id: str,
    body: FlagRequest,
    request: Request,
    admin: AdminUser = Depends(require_permission("customers.edit")),
    db=Depends(get_db),
):
    result = await customer_service.flag_customer(db, customer_id, reason=body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="customer.flag",
            target=f"customer:{customer_id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── Unflag customer ───────────────────────────────────────────────────────────

@router.post("/{customer_id}/unflag", response_model=CustomerResponse)
async def unflag_customer_endpoint(
    customer_id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("customers.edit")),
    db=Depends(get_db),
):
    result = await customer_service.unflag_customer(db, customer_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="customer.unflag",
            target=f"customer:{customer_id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── Wallet: adjust balance ────────────────────────────────────────────────────

@router.post("/{customer_id}/wallet/adjust", response_model=WalletAdjustResponse)
async def adjust_wallet_endpoint(
    customer_id: str,
    body: WalletAdjustRequest,
    request: Request,
    current_user: AdminUser = Depends(require_permission("customers.wallet.adjust")),
    db=Depends(get_db),
):
    result = await customer_service.adjust_wallet(
        db, customer_id, body, created_by=current_user.name
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="customer.wallet.adjust",
            target=f"customer:{customer_id}",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


# ── Wallet: list transactions ─────────────────────────────────────────────────

@router.get("/{customer_id}/wallet/transactions", response_model=WalletTransactionListResponse)
async def list_wallet_transactions_endpoint(
    customer_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(require_permission("customers.wallet.view")),
    db=Depends(get_db),
):
    return await customer_service.list_wallet_transactions(
        db, customer_id, page=page, per_page=per_page
    )
