from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_notifications import (
    NotificationOut,
    NotificationPrefs,
    NotificationPrefsUpdate,
)
from app.services import operator_notifications_service

router = APIRouter(prefix="/notification-center", tags=["operator-notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = Query(False, alias="unread_only"),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    """List operator inbox notifications, optionally filtered to unread only."""
    return await operator_notifications_service.list_notifications(
        db, current_user.id, unread_only=unread_only
    )


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    """Mark a single notification as read."""
    updated = await operator_notifications_service.mark_read(
        db, current_user.id, notification_id
    )
    return {"updated": updated}


@router.post("/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    """Mark all unread notifications as read. Returns count of rows updated."""
    count = await operator_notifications_service.mark_all_read(db, current_user.id)
    return {"updated_count": count}


@router.get("/preferences", response_model=NotificationPrefs)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    """Retrieve notification preferences for the authenticated operator user."""
    return await operator_notifications_service.get_preferences(db, current_user.id)


@router.patch("/preferences", response_model=NotificationPrefs)
async def update_notification_preferences(
    payload: NotificationPrefsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    """Update notification preferences (partial update — only supplied fields are changed)."""
    return await operator_notifications_service.update_preferences(
        db, current_user.id, payload
    )
