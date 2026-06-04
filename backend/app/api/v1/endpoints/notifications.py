from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.notifications import (
    BroadcastCreate,
    BroadcastResponse,
    NotificationLogListResponse,
    NotificationLogResponse,
    NotificationStatsResponse,
    NotificationTemplateCreate,
    NotificationTemplateListResponse,
    NotificationTemplateResponse,
    NotificationTemplateUpdate,
)
from app.services import notifications_service

notifications_router = APIRouter()


@notifications_router.get("/stats", response_model=NotificationStatsResponse)
async def get_stats(
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await notifications_service.get_stats(db)


@notifications_router.get("/delivery-log", response_model=NotificationLogListResponse)
async def list_delivery_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items, total = await notifications_service.list_delivery_log(db, page, page_size)
    return NotificationLogListResponse(
        items=[NotificationLogResponse.model_validate(i) for i in items],
        total=total,
    )


@notifications_router.post("/broadcast", response_model=BroadcastResponse, status_code=201)
async def create_broadcast(
    body: BroadcastCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await notifications_service.create_broadcast(db, body)


@notifications_router.get("/templates", response_model=NotificationTemplateListResponse)
async def list_templates(
    search: str | None = Query(None),
    channel: str | None = Query(None),
    status: str | None = Query(None),
    category: str | None = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    items = await notifications_service.list_templates(db, search, channel, status, category)
    return NotificationTemplateListResponse(items=items, total=len(items))


@notifications_router.post("/templates", response_model=NotificationTemplateResponse, status_code=201)
async def create_template(
    body: NotificationTemplateCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await notifications_service.create_template(db, body)


@notifications_router.get("/templates/{template_id}", response_model=NotificationTemplateResponse)
async def get_template(
    template_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    tmpl = await notifications_service.get_template(db, template_id)
    return notifications_service._serialize(tmpl)


@notifications_router.patch("/templates/{template_id}", response_model=NotificationTemplateResponse)
async def update_template(
    template_id: str,
    body: NotificationTemplateUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await notifications_service.update_template(db, template_id, body)


@notifications_router.delete("/templates/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await notifications_service.delete_template(db, template_id)
