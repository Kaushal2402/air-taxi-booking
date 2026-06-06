from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.services.purge_service import PurgeReport, run_all_purges

router = APIRouter()


@router.post(
    "/run",
    response_model=dict,
    summary="Trigger data-retention purge across all four categories",
    description=(
        "Reads the platform's data retention settings and purges/anonymizes records "
        "that have exceeded their configured window. Safe to call repeatedly — only "
        "affects data beyond the configured thresholds. Super-admin only."
    ),
)
async def trigger_purge(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    report: PurgeReport = await run_all_purges(db)
    return {
        "road_bookings_deleted": report.road_bookings_deleted,
        "air_bookings_deleted": report.air_bookings_deleted,
        "customers_anonymized": report.customers_anonymized,
        "payments_deleted": report.payments_deleted,
        "payout_runs_deleted": report.payout_runs_deleted,
        "audit_logs_deleted": report.audit_logs_deleted,
        "total_affected": report.total_affected,
        "errors": report.errors,
    }
