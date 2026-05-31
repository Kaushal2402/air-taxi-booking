from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


# ── Event schemas ─────────────────────────────────────────────────────────────

class AuditEventSummary(BaseModel):
    id: str
    event_code: str
    timestamp: datetime
    actor_name: str
    actor_role: str
    action: str
    target: str
    category: str
    severity: str
    source_ip: Optional[str] = None
    created_at: Any

    model_config = {"from_attributes": True}


class SurroundingEvent(BaseModel):
    id: str
    timestamp: datetime
    action: str
    description: str
    is_current: bool


class AuditEventDetail(AuditEventSummary):
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    before_data: Optional[dict] = None
    after_data: Optional[dict] = None
    prev_hash: Optional[str] = None
    this_hash: Optional[str] = None
    next_hash: Optional[str] = None
    surrounding_events: List[SurroundingEvent] = []


# ── Stats schemas ─────────────────────────────────────────────────────────────

class AuditStatsResponse(BaseModel):
    events_total: int
    admin_actions: int
    high_severity: int
    failed_logins: int
    integrity_ok: bool


class SecurityStatsResponse(BaseModel):
    anomalies_open: int
    anomalies_7d: int
    pii_exports_7d: int
    mfa_coverage_pct: float
    retention_policy: str
    integrity_ok: bool


class ChartDay(BaseModel):
    date: str
    count: int


class SecurityChartResponse(BaseModel):
    days: List[ChartDay]


# ── Anomaly schemas ───────────────────────────────────────────────────────────

class AuditAnomalyResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    created_at: Any
    updated_at: Any

    model_config = {"from_attributes": True}


class AuditAnomalyCreate(BaseModel):
    title: str
    description: str
    severity: str


# ── Paginated responses ───────────────────────────────────────────────────────

class AuditEventsResponse(BaseModel):
    items: List[AuditEventSummary]
    total: int
    page: int
    per_page: int


class AuditAnomaliesResponse(BaseModel):
    items: List[AuditAnomalyResponse]
    total: int


# ── Export schema ─────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    time_window: str = "24h"
    category: Optional[str] = None
    severity: Optional[str] = None
