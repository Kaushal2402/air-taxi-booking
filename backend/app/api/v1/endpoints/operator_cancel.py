from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_cancel import (
    BookingCancelItem,
    CancelActionOut,
    CancelPayload,
    CancelPreviewOut,
    ReschedulePayload,
    ReschedulePreviewOut,
)
from app.services import operator_cancel_service

router = APIRouter(prefix="/cancel", tags=["operator-cancel"])


@router.get("/bookings", response_model=list[BookingCancelItem])
async def list_cancellable_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_cancel_service.list_cancellable_bookings(db, current_user.operator_id)


@router.get("/bookings/{booking_id}/preview", response_model=CancelPreviewOut)
async def get_cancel_preview(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_cancel_service.get_cancel_preview(db, current_user.operator_id, booking_id)


@router.post("/bookings/{booking_id}/cancel", response_model=CancelActionOut)
async def cancel_booking(
    booking_id: str,
    payload: CancelPayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_cancel_service.cancel_booking(db, current_user.operator_id, booking_id, payload)


@router.get("/bookings/{booking_id}/reschedule-preview", response_model=ReschedulePreviewOut)
async def get_reschedule_preview(
    booking_id: str,
    new_etd: str = Query(..., description="New ETD in ISO format or YYYY-MM-DD HH:MM"),
    new_eta: str = Query(..., description="New ETA in ISO format or YYYY-MM-DD HH:MM"),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_cancel_service.get_reschedule_preview(
        db, current_user.operator_id, booking_id, new_etd, new_eta
    )


@router.post("/bookings/{booking_id}/reschedule", response_model=CancelActionOut)
async def reschedule_booking(
    booking_id: str,
    payload: ReschedulePayload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_cancel_service.reschedule_booking(
        db, current_user.operator_id, booking_id, payload
    )
