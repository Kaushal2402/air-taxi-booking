from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_reports import ReportFilter, ReportOut
from app.services import operator_reports_service

router = APIRouter(prefix="/reports", tags=["operator-reports"])


def _build_filter(
    period_start: Optional[str],
    period_end: Optional[str],
    route_id: Optional[str],
    aircraft_id: Optional[str],
    crew_id: Optional[str],
) -> ReportFilter:
    return ReportFilter(
        period_start=period_start,
        period_end=period_end,
        route_id=route_id,
        aircraft_id=aircraft_id,
        crew_id=crew_id,
    )


@router.get("/revenue", response_model=ReportOut)
async def revenue_report(
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    route_id: Optional[str] = Query(None),
    aircraft_id: Optional[str] = Query(None),
    crew_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> ReportOut:
    filters = _build_filter(period_start, period_end, route_id, aircraft_id, crew_id)
    return await operator_reports_service.get_revenue_report(db, current_user.operator_id, filters)


@router.get("/flights", response_model=ReportOut)
async def flights_summary(
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    route_id: Optional[str] = Query(None),
    aircraft_id: Optional[str] = Query(None),
    crew_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> ReportOut:
    filters = _build_filter(period_start, period_end, route_id, aircraft_id, crew_id)
    return await operator_reports_service.get_flights_summary(db, current_user.operator_id, filters)


@router.get("/load-factor", response_model=ReportOut)
async def load_factor_report(
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    route_id: Optional[str] = Query(None),
    aircraft_id: Optional[str] = Query(None),
    crew_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> ReportOut:
    filters = _build_filter(period_start, period_end, route_id, aircraft_id, crew_id)
    return await operator_reports_service.get_load_factor_report(db, current_user.operator_id, filters)


@router.get("/fleet-utilization", response_model=ReportOut)
async def fleet_utilization(
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    route_id: Optional[str] = Query(None),
    aircraft_id: Optional[str] = Query(None),
    crew_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> ReportOut:
    filters = _build_filter(period_start, period_end, route_id, aircraft_id, crew_id)
    return await operator_reports_service.get_fleet_utilization(db, current_user.operator_id, filters)


@router.get("/crew-utilization", response_model=ReportOut)
async def crew_utilization(
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    route_id: Optional[str] = Query(None),
    aircraft_id: Optional[str] = Query(None),
    crew_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> ReportOut:
    filters = _build_filter(period_start, period_end, route_id, aircraft_id, crew_id)
    return await operator_reports_service.get_crew_utilization(db, current_user.operator_id, filters)
