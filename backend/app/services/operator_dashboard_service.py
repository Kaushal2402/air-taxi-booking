from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operator import Aircraft, Operator, OperatorDocument, Pilot
from app.schemas.operator_dashboard import (
    ActionQueueItem,
    ComplianceAlert,
    DashboardKPIs,
    TrendPoint,
    TrendSeries,
    UpcomingFlight,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def get_kpis(db: AsyncSession, operator_id: str, window: str = "30d") -> DashboardKPIs:
    # Available aircraft count
    aircraft_result = await db.execute(
        select(func.count())
        .select_from(Aircraft)
        .where(
            Aircraft.operator_id == operator_id,
            Aircraft.status.in_(["available", "ready"]),
        )
    )
    available_aircraft = aircraft_result.scalar_one() or 0

    # On-duty crew (active pilots)
    crew_result = await db.execute(
        select(func.count())
        .select_from(Pilot)
        .where(
            Pilot.operator_id == operator_id,
            Pilot.status == "active",
        )
    )
    on_duty_crew = crew_result.scalar_one() or 0

    return DashboardKPIs(
        pending_requests=0,
        todays_flights=0,
        in_air_now=0,
        available_aircraft=available_aircraft,
        on_duty_crew=on_duty_crew,
        load_factor_pct=0.0,
        period_revenue_minor=0,
        on_time_pct=0.0,
    )


async def get_upcoming_flights(db: AsyncSession, operator_id: str) -> list[UpcomingFlight]:
    # Returns empty until flight scheduling modules are built
    return []


async def get_action_queue(db: AsyncSession, operator_id: str) -> list[ActionQueueItem]:
    items: list[ActionQueueItem] = []

    # Check operator onboarding status
    op_result = await db.execute(select(Operator).where(Operator.id == operator_id))
    op = op_result.scalar_one_or_none()
    if op:
        onboarding_status = op.onboarding_status or "draft"
        if onboarding_status == "draft":
            items.append(ActionQueueItem(
                id="onboarding-draft",
                type="onboarding",
                label="Complete your onboarding",
                sub_label="Submit company profile to start accepting bookings",
                priority="high",
                link_path="/onboarding",
            ))
        elif onboarding_status == "rejected":
            items.append(ActionQueueItem(
                id="onboarding-rejected",
                type="onboarding",
                label="Onboarding rejected — resubmit",
                sub_label=op.rejection_reason or "See profile for details",
                priority="high",
                link_path="/onboarding",
            ))

        # Check for expiring documents
        now = _utcnow().date()
        warn_within_days = 30
        docs_result = await db.execute(
            select(OperatorDocument).where(OperatorDocument.operator_id == operator_id)
        )
        docs = docs_result.scalars().all()
        for doc in docs:
            if doc.expires_at:
                days_left = (doc.expires_at - now).days
                if days_left <= warn_within_days:
                    items.append(ActionQueueItem(
                        id=f"doc-expiry-{doc.id}",
                        type="compliance",
                        label=f"Document expiring: {doc.doc_type}",
                        sub_label=f"Expires in {days_left} day(s)" if days_left >= 0 else "Expired",
                        priority="high" if days_left <= 7 else "normal",
                        link_path="/documents",
                    ))

    return items


async def get_compliance_alerts(db: AsyncSession, operator_id: str) -> list[ComplianceAlert]:
    alerts: list[ComplianceAlert] = []

    op_result = await db.execute(select(Operator).where(Operator.id == operator_id))
    op = op_result.scalar_one_or_none()
    if not op:
        return alerts

    onboarding_status = op.onboarding_status or "draft"
    if onboarding_status in ("draft", "submitted", "in_review"):
        alerts.append(ComplianceAlert(
            severity="warning",
            message=f"Operator onboarding status: {onboarding_status.replace('_', ' ').title()}. "
                    "You cannot accept bookings until approved.",
        ))
    elif onboarding_status == "rejected":
        alerts.append(ComplianceAlert(
            severity="error",
            message="Onboarding rejected. Please update your profile and resubmit.",
        ))

    if op.status in ("paused", "deactivated", "suspended"):
        alerts.append(ComplianceAlert(
            severity="error",
            message=f"Account status: {op.status}. Contact admin for details.",
        ))

    return alerts


async def get_trends(db: AsyncSession, operator_id: str, metric: str, window: str) -> TrendSeries:
    return TrendSeries(metric=metric, window=window, points=[])
