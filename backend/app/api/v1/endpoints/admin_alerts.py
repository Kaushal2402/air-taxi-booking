from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_alert import AdminAlert
from app.models.admin_user import AdminUser

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class AlertItem(BaseModel):
    id: str
    category: str
    title: str
    body: Optional[str] = None
    href: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    items: List[AlertItem]
    total: int
    unread: int


class UnreadCountResponse(BaseModel):
    unread: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_filter(user_id: str):
    """Match alerts addressed to this admin OR broadcast (admin_user_id IS NULL)."""
    return or_(AdminAlert.admin_user_id == user_id, AdminAlert.admin_user_id.is_(None))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=AlertListResponse)
async def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user),
) -> AlertListResponse:
    filt = _user_filter(current_user.id)

    total_q = await db.execute(select(func.count()).select_from(AdminAlert).where(filt))
    total = total_q.scalar_one()

    unread_q = await db.execute(
        select(func.count()).select_from(AdminAlert)
        .where(filt, AdminAlert.is_read.is_(False))
    )
    unread = unread_q.scalar_one()

    items_q = await db.execute(
        select(AdminAlert)
        .where(filt)
        .order_by(AdminAlert.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return AlertListResponse(
        items=[AlertItem.model_validate(i) for i in items],
        total=total,
        unread=unread,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user),
) -> UnreadCountResponse:
    q = await db.execute(
        select(func.count()).select_from(AdminAlert)
        .where(_user_filter(current_user.id), AdminAlert.is_read.is_(False))
    )
    return UnreadCountResponse(unread=q.scalar_one())


@router.post("/{alert_id}/read", response_model=AlertItem)
async def mark_read(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user),
) -> AlertItem:
    await db.execute(
        update(AdminAlert)
        .where(AdminAlert.id == alert_id, _user_filter(current_user.id))
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    q = await db.execute(select(AdminAlert).where(AdminAlert.id == alert_id))
    return AlertItem.model_validate(q.scalar_one())


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user),
) -> dict:
    await db.execute(
        update(AdminAlert)
        .where(_user_filter(current_user.id), AdminAlert.is_read.is_(False))
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {}
