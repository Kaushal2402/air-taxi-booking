from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.common import MessageResponse
from app.schemas.reports import (
    ReportBuilderPreview,
    ReportExportListResponse,
    ReportExportRequest,
    ReportExportResponse,
    ReportScheduleCreate,
    ReportScheduleResponse,
    ReportScheduleUpdate,
    ReportTemplateCreate,
    ReportTemplateListResponse,
    ReportTemplateResponse,
    ReportTemplateUpdate,
)
from app.services import reports_service

router = APIRouter()


# ── Templates ──────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=ReportTemplateListResponse)
async def list_templates(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.list_templates(db, include_inactive)


@router.post("/templates", response_model=ReportTemplateResponse, status_code=201)
async def create_template(
    body: ReportTemplateCreate,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.create_template(db, body.model_dump(), current_user.id)


@router.get("/templates/{template_id}", response_model=ReportTemplateResponse)
async def get_template(
    template_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.get_template(db, template_id)


@router.patch("/templates/{template_id}", response_model=ReportTemplateResponse)
async def update_template(
    template_id: str,
    body: ReportTemplateUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.update_template(db, template_id, body.model_dump(exclude_unset=True))


@router.delete("/templates/{template_id}", response_model=MessageResponse)
async def delete_template(
    template_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await reports_service.delete_template(db, template_id)
    return MessageResponse(message="Report template deleted")


# ── Schedules ─────────────────────────────────────────────────────────────────

@router.get("/schedules", response_model=List[ReportScheduleResponse])
async def list_schedules(
    template_id: str | None = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.list_schedules(db, template_id)


@router.post("/templates/{template_id}/schedules", response_model=ReportScheduleResponse, status_code=201)
async def create_schedule(
    template_id: str,
    body: ReportScheduleCreate,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.create_schedule(db, template_id, body.model_dump(), current_user.id)


@router.patch("/schedules/{schedule_id}", response_model=ReportScheduleResponse)
async def update_schedule(
    schedule_id: str,
    body: ReportScheduleUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.update_schedule(db, schedule_id, body.model_dump(exclude_unset=True))


@router.delete("/schedules/{schedule_id}", response_model=MessageResponse)
async def delete_schedule(
    schedule_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await reports_service.delete_schedule(db, schedule_id)
    return MessageResponse(message="Schedule deleted")


# ── Exports ────────────────────────────────────────────────────────────────────

@router.get("/exports", response_model=ReportExportListResponse)
async def list_exports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    template_id: str | None = Query(None),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.list_exports(db, page, page_size, template_id)


@router.post("/templates/{template_id}/run", response_model=ReportExportResponse, status_code=201)
async def run_template_export(
    template_id: str,
    body: ReportExportRequest,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    tmpl = await reports_service.get_template(db, template_id)
    data = body.model_dump()
    data.setdefault("name", tmpl.name)
    return await reports_service.request_export(db, template_id, data, current_user.id)


@router.post("/exports", response_model=ReportExportResponse, status_code=201)
async def create_export(
    body: ReportExportRequest,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.request_export(db, None, body.model_dump(), current_user.id)


@router.get("/exports/{export_id}", response_model=ReportExportResponse)
async def get_export(
    export_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await reports_service.get_export(db, export_id)


# ── Builder preview (stateless) ────────────────────────────────────────────────

@router.post("/builder/preview")
async def builder_preview(
    body: ReportBuilderPreview,
    _: AdminUser = Depends(get_current_admin_user),
):
    """Returns a stub preview for the report builder. Real implementation queries the warehouse."""
    return {
        "columns": body.dimensions + body.metrics,
        "rows": [],
        "estimated_rows": 0,
        "estimated_size_mb": 0,
        "message": "Preview available once warehouse ETL is connected.",
    }
