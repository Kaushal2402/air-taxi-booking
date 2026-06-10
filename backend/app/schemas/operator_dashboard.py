from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    pending_requests: int = 0
    todays_flights: int = 0
    in_air_now: int = 0
    available_aircraft: int = 0
    on_duty_crew: int = 0
    load_factor_pct: float = 0.0
    period_revenue_minor: int = 0
    on_time_pct: float = 0.0


class UpcomingFlight(BaseModel):
    id: str
    booking_ref: Optional[str] = None
    route_label: str
    etd: str
    eta: str
    aircraft_mark: Optional[str] = None
    pilot_name: Optional[str] = None
    pax_count: int = 0
    status: str


class ActionQueueItem(BaseModel):
    id: str
    type: str
    label: str
    sub_label: Optional[str] = None
    ttl_expires_at: Optional[str] = None
    priority: str = "normal"
    link_path: str


class TrendPoint(BaseModel):
    label: str
    value: float


class TrendSeries(BaseModel):
    metric: str
    window: str
    points: list[TrendPoint]


class DashboardUpcomingFlightsResponse(BaseModel):
    flights: list[UpcomingFlight]


class DashboardActionQueueResponse(BaseModel):
    items: list[ActionQueueItem]
    total: int


class ComplianceAlert(BaseModel):
    severity: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None


class DashboardFullResponse(BaseModel):
    kpis: DashboardKPIs
    upcoming_flights: list[UpcomingFlight]
    action_queue: list[ActionQueueItem]
    compliance_alerts: list[ComplianceAlert]
