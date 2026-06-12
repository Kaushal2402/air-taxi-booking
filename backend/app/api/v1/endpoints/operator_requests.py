from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_requests import (
    BookingRequestCreate,
    BookingRequestOut,
    QuoteRequest,
    RejectRequest,
)
from app.services import operator_requests_service

router = APIRouter(prefix="/requests", tags=["operator-requests"])


@router.get("", response_model=list[BookingRequestOut])
async def list_requests(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_requests_service.list_requests(db, current_user.operator_id, status)


@router.get("/{request_id}", response_model=BookingRequestOut)
async def get_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_requests_service.get_request(db, current_user.operator_id, request_id)


@router.post("", response_model=BookingRequestOut, status_code=201)
async def create_request(
    payload: BookingRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_requests_service.create_request(db, current_user.operator_id, payload)


@router.post("/{request_id}/accept", response_model=BookingRequestOut)
async def accept_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_requests_service.accept_request(
        db, current_user.operator_id, request_id, current_user.id
    )


@router.post("/{request_id}/reject", response_model=BookingRequestOut)
async def reject_request(
    request_id: str,
    payload: RejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_requests_service.reject_request(
        db, current_user.operator_id, request_id, current_user.id, payload
    )


@router.post("/{request_id}/quote", response_model=BookingRequestOut)
async def attach_quote(
    request_id: str,
    payload: QuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_requests_service.attach_quote(
        db, current_user.operator_id, request_id, current_user.id, payload.quote_id
    )
