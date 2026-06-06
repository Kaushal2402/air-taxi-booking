from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.models.booking import RoadBooking
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
from app.services.report_queries import run_standard_report, REPORT_DISPATCH
from app.services.settings_service import get_settings

router = APIRouter()


# ── Templates ──────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=ReportTemplateListResponse)
async def list_templates(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.list_templates(db, include_inactive)


@router.post("/templates", response_model=ReportTemplateResponse, status_code=201)
async def create_template(
    body: ReportTemplateCreate,
    current_user: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.create_template(db, body.model_dump(), current_user.id)


@router.get("/templates/{template_id}", response_model=ReportTemplateResponse)
async def get_template(
    template_id: str,
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.get_template(db, template_id)


@router.patch("/templates/{template_id}", response_model=ReportTemplateResponse)
async def update_template(
    template_id: str,
    body: ReportTemplateUpdate,
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.update_template(db, template_id, body.model_dump(exclude_unset=True))


@router.delete("/templates/{template_id}", response_model=MessageResponse)
async def delete_template(
    template_id: str,
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    await reports_service.delete_template(db, template_id)
    return MessageResponse(message="Report template deleted")


# ── Schedules ─────────────────────────────────────────────────────────────────

@router.get("/schedules", response_model=List[ReportScheduleResponse])
async def list_schedules(
    template_id: str | None = Query(None),
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.list_schedules(db, template_id)


@router.post("/templates/{template_id}/schedules", response_model=ReportScheduleResponse, status_code=201)
async def create_schedule(
    template_id: str,
    body: ReportScheduleCreate,
    current_user: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.create_schedule(db, template_id, body.model_dump(), current_user.id)


@router.patch("/schedules/{schedule_id}", response_model=ReportScheduleResponse)
async def update_schedule(
    schedule_id: str,
    body: ReportScheduleUpdate,
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.update_schedule(db, schedule_id, body.model_dump(exclude_unset=True))


@router.delete("/schedules/{schedule_id}", response_model=MessageResponse)
async def delete_schedule(
    schedule_id: str,
    _: AdminUser = Depends(require_permission("reports.view")),
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
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.list_exports(db, page, page_size, template_id)


@router.post("/templates/{template_id}/run", response_model=ReportExportResponse, status_code=201)
async def run_template_export(
    template_id: str,
    body: ReportExportRequest,
    current_user: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    tmpl = await reports_service.get_template(db, template_id)
    data = body.model_dump()
    data.setdefault("name", tmpl.name)
    return await reports_service.request_export(db, template_id, data, current_user.id)


@router.post("/exports", response_model=ReportExportResponse, status_code=201)
async def create_export(
    body: ReportExportRequest,
    current_user: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.request_export(db, None, body.model_dump(), current_user.id)


@router.get("/exports/{export_id}", response_model=ReportExportResponse)
async def get_export(
    export_id: str,
    _: AdminUser = Depends(require_permission("reports.view")),
    db=Depends(get_db),
):
    return await reports_service.get_export(db, export_id)


# ── Builder preview (stateless) ────────────────────────────────────────────────

@router.post("/builder/preview")
async def builder_preview(
    body: ReportBuilderPreview,
    _: AdminUser = Depends(require_permission("reports.view")),
    db: AsyncSession = Depends(get_db),
):
    """
    Preview for the report builder.
    For standard report templates, runs the real query and returns a 10-row sample.
    For custom builder queries, returns column schema (full execution via /query).
    """
    # If a standard report name is provided, run the real query
    report_name = getattr(body, "report_name", None) or ""
    if report_name.lower() in [k.lower() for k in REPORT_DISPATCH]:
        date_to = datetime.now(timezone.utc)
        date_from = date_to - timedelta(days=7)  # 7-day sample for preview
        try:
            result = await run_standard_report(db, report_name, date_from, date_to)
            preview_rows = result["rows"][:10]
            return {
                "columns": result["columns"],
                "rows": preview_rows,
                "total_rows": len(result["rows"]),
                "estimated_rows": len(result["rows"]),
                "summary": result.get("summary", {}),
                "message": f"Live data — last 7 days preview. Full run uses your selected date range.",
            }
        except Exception as exc:
            return {
                "columns": body.dimensions + body.metrics,
                "rows": [],
                "estimated_rows": 0,
                "message": f"Preview error: {exc}",
            }

    # Custom builder — return column schema only
    return {
        "columns": body.dimensions + body.metrics,
        "rows": [],
        "estimated_rows": 0,
        "estimated_size_mb": 0,
        "message": "Custom report builder: run /reports/query with your full date range to see data.",
    }


@router.post("/query")
async def run_report_query(
    report_name: str = Query(..., description="Exact standard report name"),
    date_from: str = Query(..., description="ISO date, e.g. 2024-01-01"),
    date_to: str = Query(..., description="ISO date, e.g. 2024-01-31"),
    zone: str | None = Query(None),
    service_type: str | None = Query(None),
    driver_id: str | None = Query(None),
    _: AdminUser = Depends(require_permission("reports.view")),
    db: AsyncSession = Depends(get_db),
):
    """
    Run a standard report query and return the full result set.
    This is the live data endpoint — no file generation, instant JSON response.
    """
    try:
        dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        dt_to = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59,
                                                          tzinfo=timezone.utc)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {exc}")

    filters: dict = {}
    if zone:
        filters["zone_name"] = zone
    if service_type:
        filters["service_type"] = service_type
    if driver_id:
        filters["driver_id"] = driver_id

    try:
        result = await run_standard_report(db, report_name, dt_from, dt_to, filters)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return result


# ── Gap 14: Authority export ───────────────────────────────────────────────────

@router.get(
    "/authority-export",
    summary="Export anonymised aggregate trip data for transport authorities",
    description=(
        "Returns aggregated, fully anonymised trip statistics — zone-level counts, "
        "time-slot distribution, service-type split. No PII is included. "
        "Only available when 'Share anonymised trip data with transport authorities' "
        "is enabled in Settings → Data & Privacy → Consent."
    ),
)
async def authority_export(
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    _: AdminUser = Depends(require_permission("reports.view")),
    db: AsyncSession = Depends(get_db),
):
    platform = await get_settings(db)
    if not platform.data_share_authorities:
        raise HTTPException(
            status_code=403,
            detail=(
                "Sharing anonymised trip data with transport authorities is disabled. "
                "Enable the setting in Settings → Data & Privacy → Consent."
            ),
        )

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    completed_statuses = ["Completed"]

    # Aggregate by zone — no PII, counts only
    zone_q = (
        select(
            RoadBooking.zone_name,
            RoadBooking.service_type,
            func.count(RoadBooking.id).label("trip_count"),
            func.avg(RoadBooking.distance_km).label("avg_distance_km"),
            func.avg(RoadBooking.duration_min).label("avg_duration_min"),
        )
        .where(
            RoadBooking.status.in_(completed_statuses),
            RoadBooking.created_at >= cutoff,
        )
        .group_by(RoadBooking.zone_name, RoadBooking.service_type)
        .order_by(func.count(RoadBooking.id).desc())
    )
    zone_result = await db.execute(zone_q)
    zone_rows = zone_result.fetchall()

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period_days": days,
        "note": "All data is fully anonymised — no personal information is included.",
        "zone_summary": [
            {
                "zone": r.zone_name or "Unknown",
                "service_type": r.service_type,
                "trip_count": r.trip_count,
                "avg_distance_km": round(r.avg_distance_km or 0, 2),
                "avg_duration_min": round(r.avg_duration_min or 0, 1),
            }
            for r in zone_rows
        ],
    }
