from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import ReportExport, ReportFrequency, ReportSchedule, ReportStatus, ReportTemplate
from app.services.settings_service import get_settings


# ── Templates ──────────────────────────────────────────────────────────────────

async def list_templates(db: AsyncSession, include_inactive: bool = False) -> Dict[str, Any]:
    q = select(ReportTemplate)
    if not include_inactive:
        q = q.where(ReportTemplate.is_active == True)  # noqa: E712
    q = q.order_by(ReportTemplate.is_standard.desc(), ReportTemplate.created_at.asc())
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    result = await db.execute(q)
    return {"items": result.scalars().all(), "total": total}


async def get_template(db: AsyncSession, template_id: str) -> ReportTemplate:
    result = await db.execute(select(ReportTemplate).where(ReportTemplate.id == template_id))
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Report template not found")
    return tmpl


async def create_template(db: AsyncSession, data: Dict[str, Any], admin_id: str) -> ReportTemplate:
    tmpl = ReportTemplate(**data, created_by=admin_id)
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


async def update_template(db: AsyncSession, template_id: str, data: Dict[str, Any]) -> ReportTemplate:
    tmpl = await get_template(db, template_id)
    for k, v in data.items():
        setattr(tmpl, k, v)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


async def delete_template(db: AsyncSession, template_id: str) -> None:
    tmpl = await get_template(db, template_id)
    if tmpl.is_standard:
        raise HTTPException(status_code=400, detail="Cannot delete a standard report template")
    await db.delete(tmpl)
    await db.commit()


# ── Schedules ─────────────────────────────────────────────────────────────────

async def list_schedules(db: AsyncSession, template_id: str | None = None) -> list:
    q = select(ReportSchedule)
    if template_id:
        q = q.where(ReportSchedule.template_id == template_id)
    q = q.order_by(ReportSchedule.next_run_at.asc())
    result = await db.execute(q)
    return result.scalars().all()


async def get_schedule(db: AsyncSession, schedule_id: str) -> ReportSchedule:
    result = await db.execute(select(ReportSchedule).where(ReportSchedule.id == schedule_id))
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return sched


async def create_schedule(db: AsyncSession, template_id: str, data: Dict[str, Any], admin_id: str) -> ReportSchedule:
    # Validate template exists
    await get_template(db, template_id)
    sched = ReportSchedule(template_id=template_id, created_by=admin_id, **data)
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    return sched


async def update_schedule(db: AsyncSession, schedule_id: str, data: Dict[str, Any]) -> ReportSchedule:
    sched = await get_schedule(db, schedule_id)
    for k, v in data.items():
        setattr(sched, k, v)
    await db.commit()
    await db.refresh(sched)
    return sched


async def delete_schedule(db: AsyncSession, schedule_id: str) -> None:
    sched = await get_schedule(db, schedule_id)
    await db.delete(sched)
    await db.commit()


# ── Exports ────────────────────────────────────────────────────────────────────

async def list_exports(
    db: AsyncSession,
    page: int,
    page_size: int,
    template_id: str | None,
) -> Dict[str, Any]:
    q = select(ReportExport)
    if template_id:
        q = q.where(ReportExport.template_id == template_id)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    q = q.order_by(ReportExport.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return {"items": result.scalars().all(), "total": total, "page": page, "page_size": page_size}


_ANALYTICS_REPORT_KEYWORDS = {"analytics", "tracking", "behaviour", "behavior", "engagement", "funnel"}
_AUTHORITY_REPORT_KEYWORDS = {"authority", "transport", "government", "regulator", "anonymised"}


async def request_export(
    db: AsyncSession,
    template_id: str | None,
    data: Dict[str, Any],
    admin_id: str,
) -> ReportExport:
    platform = await get_settings(db)

    # Gap 8: Block analytics report exports when consent_analytics_tracking is off
    report_name = (data.get("name") or "").lower()
    if not platform.consent_analytics_tracking:
        if any(kw in report_name for kw in _ANALYTICS_REPORT_KEYWORDS):
            raise HTTPException(
                status_code=403,
                detail=(
                    "In-app analytics tracking is disabled. "
                    "Enable 'In-app analytics tracking' in Settings → Data & Privacy → Consent "
                    "to export analytics reports."
                ),
            )

    # Gap 13: Block authority export when data_share_authorities is off
    if any(kw in report_name for kw in _AUTHORITY_REPORT_KEYWORDS):
        if not platform.data_share_authorities:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Sharing anonymised trip data with transport authorities is disabled. "
                    "Enable 'Share anonymised trip data with transport authorities' in "
                    "Settings → Data & Privacy → Consent to run authority exports."
                ),
            )

    exp = ReportExport(
        template_id=template_id,
        requested_by=admin_id,
        status=ReportStatus.running,
        **data,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp


async def get_export(db: AsyncSession, export_id: str) -> ReportExport:
    result = await db.execute(select(ReportExport).where(ReportExport.id == export_id))
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Export not found")
    return exp


async def update_export_status(
    db: AsyncSession,
    export_id: str,
    status: ReportStatus,
    file_url: str | None = None,
    file_size_kb: str | None = None,
    error_message: str | None = None,
) -> ReportExport:
    exp = await get_export(db, export_id)
    exp.status = status
    if file_url:
        exp.file_url = file_url
    if file_size_kb:
        exp.file_size_kb = file_size_kb
    if error_message:
        exp.error_message = error_message
    if status in (ReportStatus.done, ReportStatus.failed):
        exp.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(exp)
    return exp


# ── Seed standard templates ────────────────────────────────────────────────────

STANDARD_TEMPLATES = [
    {
        "name": "Revenue & operations",
        "description": "Gross, net, take-rate by service & city",
        "tag": "Finance",
        "icon": "pie",
        "default_frequency": ReportFrequency.daily,
        "report_type": "standard",
        "is_standard": True,
    },
    {
        "name": "GST filing · GSTR-1",
        "description": "Outward supplies · HSN-coded · per state",
        "tag": "Tax",
        "icon": "receipt",
        "default_frequency": ReportFrequency.monthly,
        "report_type": "standard",
        "is_standard": True,
    },
    {
        "name": "Driver payout summary",
        "description": "Earnings, deductions, holds per cycle",
        "tag": "Payouts",
        "icon": "wallet",
        "default_frequency": ReportFrequency.weekly,
        "report_type": "standard",
        "is_standard": True,
    },
    {
        "name": "Settlement & reconciliation",
        "description": "Gateway-wise expected vs settled",
        "tag": "Finance",
        "icon": "archive",
        "default_frequency": ReportFrequency.daily,
        "report_type": "standard",
        "is_standard": True,
    },
    {
        "name": "Trip & demand analytics",
        "description": "Completed trips, cancellations, SLAs",
        "tag": "Ops",
        "icon": "bolt",
        "default_frequency": ReportFrequency.daily,
        "report_type": "standard",
        "is_standard": True,
    },
    {
        "name": "Promotion ROI",
        "description": "Spend, redemptions, CPA per campaign",
        "tag": "Growth",
        "icon": "flag",
        "default_frequency": ReportFrequency.weekly,
        "report_type": "standard",
        "is_standard": True,
    },
]


async def seed_standard_templates(db: AsyncSession) -> None:
    for tmpl_data in STANDARD_TEMPLATES:
        result = await db.execute(
            select(ReportTemplate).where(
                ReportTemplate.name == tmpl_data["name"],
                ReportTemplate.is_standard == True,  # noqa: E712
            )
        )
        existing = result.scalar_one_or_none()
        if not existing:
            tmpl = ReportTemplate(**tmpl_data)
            db.add(tmpl)
    await db.commit()
