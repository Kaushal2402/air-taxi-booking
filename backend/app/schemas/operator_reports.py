from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class ReportFilter(BaseModel):
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    route_id: Optional[str] = None
    aircraft_id: Optional[str] = None
    crew_id: Optional[str] = None


class RevenueReportRow(BaseModel):
    month: str
    gross_minor: int
    commission_minor: int
    net_minor: int
    flight_count: int


class FlightsSummaryRow(BaseModel):
    date: str
    completed: int
    cancelled: int
    on_time: int
    delayed: int
    otp_pct: float


class LoadFactorRow(BaseModel):
    route_label: str
    seats_available: int
    seats_sold: int
    load_factor_pct: float


class FleetUtilRow(BaseModel):
    aircraft_reg: str
    aircraft_type: str
    flight_hours: float
    flight_count: int
    utilization_pct: float


class CrewUtilRow(BaseModel):
    crew_name: str
    role: str
    duty_hours: float
    flight_count: int


class ReportOut(BaseModel):
    report_type: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    rows: list[dict[str, Any]]
    totals: dict[str, Any]
