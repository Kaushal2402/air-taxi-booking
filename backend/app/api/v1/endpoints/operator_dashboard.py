"""Operator dashboard KPIs, upcoming flights, and action queue."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_dashboard import (
    ComplianceAlert,
    DashboardActionQueueResponse,
    DashboardFullResponse,
    DashboardKPIs,
    DashboardUpcomingFlightsResponse,
    TrendSeries,
)
from app.services import operator_dashboard_service

router = APIRouter()


@router.get("/dashboard/kpis", response_model=DashboardKPIs)
async def get_kpis(
    window: str = Query("30d"),
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_dashboard_service.get_kpis(db, current_user.operator_id, window)


@router.get("/dashboard/upcoming-flights", response_model=DashboardUpcomingFlightsResponse)
async def get_upcoming_flights(
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    flights = await operator_dashboard_service.get_upcoming_flights(db, current_user.operator_id)
    return DashboardUpcomingFlightsResponse(flights=flights)


@router.get("/dashboard/action-queue", response_model=DashboardActionQueueResponse)
async def get_action_queue(
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    items = await operator_dashboard_service.get_action_queue(db, current_user.operator_id)
    return DashboardActionQueueResponse(items=items, total=len(items))


@router.get("/dashboard/trends", response_model=TrendSeries)
async def get_trends(
    metric: str = Query("revenue"),
    window: str = Query("30d"),
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_dashboard_service.get_trends(db, current_user.operator_id, metric, window)


@router.get("/dashboard/compliance-alerts", response_model=list[ComplianceAlert])
async def get_compliance_alerts(
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    return await operator_dashboard_service.get_compliance_alerts(db, current_user.operator_id)


@router.get("/dashboard", response_model=DashboardFullResponse)
async def get_dashboard(
    window: str = Query("30d"),
    current_user: OperatorUser = Depends(get_current_operator_user),
    db: AsyncSession = Depends(get_db),
):
    kpis = await operator_dashboard_service.get_kpis(db, current_user.operator_id, window)
    flights = await operator_dashboard_service.get_upcoming_flights(db, current_user.operator_id)
    queue = await operator_dashboard_service.get_action_queue(db, current_user.operator_id)
    alerts = await operator_dashboard_service.get_compliance_alerts(db, current_user.operator_id)
    return DashboardFullResponse(
        kpis=kpis,
        upcoming_flights=flights,
        action_queue=queue,
        compliance_alerts=alerts,
    )
