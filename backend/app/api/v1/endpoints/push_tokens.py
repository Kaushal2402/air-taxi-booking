from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.models.operator_user import OperatorUser
from app.services import push_token_service

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    token: str
    platform: Optional[str] = None    # 'ios' | 'android' | 'web'
    device_name: Optional[str] = None


class DeregisterBody(BaseModel):
    token: str


class TokenResponse(BaseModel):
    registered: bool


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.post("/admin/register", response_model=TokenResponse)
async def admin_register(
    body: RegisterBody,
    current_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    await push_token_service.register(
        db, "admin", current_user.id, body.token, body.platform, body.device_name
    )
    return TokenResponse(registered=True)


@router.post("/admin/deregister", status_code=200)
async def admin_deregister(
    body: DeregisterBody,
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await push_token_service.deregister(db, body.token)
    return {}


# ── Operator ──────────────────────────────────────────────────────────────────

@router.post("/operator/register", response_model=TokenResponse)
async def operator_register(
    body: RegisterBody,
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    await push_token_service.register(
        db, "operator", current_user.id, body.token, body.platform, body.device_name
    )
    return TokenResponse(registered=True)


@router.post("/operator/deregister", status_code=200)
async def operator_deregister(
    body: DeregisterBody,
    _: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await push_token_service.deregister(db, body.token)
    return {}


# ── Customer (mobile — no admin auth, token-based) ───────────────────────────

@router.post("/customer/register", response_model=TokenResponse)
async def customer_register(
    body: RegisterBody,
    customer_id: str,          # passed as query param from mobile app after login
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    await push_token_service.register(
        db, "customer", customer_id, body.token, body.platform, body.device_name
    )
    return TokenResponse(registered=True)


@router.post("/customer/deregister", status_code=200)
async def customer_deregister(
    body: DeregisterBody,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await push_token_service.deregister(db, body.token)
    return {}


# ── Driver (mobile — no admin auth, token-based) ─────────────────────────────

@router.post("/driver/register", response_model=TokenResponse)
async def driver_register(
    body: RegisterBody,
    driver_id: str,            # passed as query param from mobile app after login
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    await push_token_service.register(
        db, "driver", driver_id, body.token, body.platform, body.device_name
    )
    return TokenResponse(registered=True)


@router.post("/driver/deregister", status_code=200)
async def driver_deregister(
    body: DeregisterBody,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await push_token_service.deregister(db, body.token)
    return {}
