from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.schemas.audit import (
    AuditAnomaliesResponse,
    AuditAnomalyCreate,
    AuditAnomalyResponse,
    AuditEventDetail,
    AuditEventsResponse,
    AuditStatsResponse,
    ExportRequest,
    SecurityChartResponse,
    SecurityStatsResponse,
)
from app.services import audit_service

audit_router = APIRouter()


# ── Audit Events ──────────────────────────────────────────────────────────────

@audit_router.get("/events", response_model=AuditEventsResponse)
async def list_events(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    actor_name: Optional[str] = Query(None),
    target: Optional[str] = Query(None),
    time_window: str = Query("24h"),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(require_permission("audit.events.view")),
    db=Depends(get_db),
):
    return await audit_service.list_events(
        db,
        search=search,
        category=category,
        severity=severity,
        actor_name=actor_name,
        target=target,
        time_window=time_window,
        page=page,
        per_page=per_page,
    )


@audit_router.post("/events/export")
async def export_events(
    body: ExportRequest,
    _: AdminUser = Depends(require_permission("audit.export")),
    db=Depends(get_db),
):
    return {"message": "Export queued — download link will be emailed."}


@audit_router.get("/events/{id}", response_model=AuditEventDetail)
async def get_event(
    id: str,
    _: AdminUser = Depends(require_permission("audit.events.view")),
    db=Depends(get_db),
):
    return await audit_service.get_event(db, id)


# ── Audit Stats ───────────────────────────────────────────────────────────────

@audit_router.get("/stats", response_model=AuditStatsResponse)
async def get_stats(
    time_window: str = Query("24h"),
    _: AdminUser = Depends(require_permission("audit.events.view")),
    db=Depends(get_db),
):
    return await audit_service.get_stats(db, time_window=time_window)


# ── Security & Compliance ─────────────────────────────────────────────────────

@audit_router.get("/security/stats", response_model=SecurityStatsResponse)
async def get_security_stats(
    _: AdminUser = Depends(require_permission("audit.security.view")),
    db=Depends(get_db),
):
    return await audit_service.get_security_stats(db)


@audit_router.get("/security/chart", response_model=SecurityChartResponse)
async def get_security_chart(
    _: AdminUser = Depends(require_permission("audit.security.view")),
    db=Depends(get_db),
):
    return await audit_service.get_security_chart(db)


# ── Anomalies ─────────────────────────────────────────────────────────────────

@audit_router.get("/anomalies", response_model=AuditAnomaliesResponse)
async def list_anomalies(
    status: Optional[str] = Query(None),
    _: AdminUser = Depends(require_permission("audit.security.view")),
    db=Depends(get_db),
):
    return await audit_service.list_anomalies(db, status=status)


@audit_router.post("/anomalies", response_model=AuditAnomalyResponse, status_code=201)
async def create_anomaly(
    body: AuditAnomalyCreate,
    _: AdminUser = Depends(require_permission("audit.security.view")),
    db=Depends(get_db),
):
    return await audit_service.create_anomaly(db, body)


@audit_router.post("/anomalies/{id}/dismiss", response_model=AuditAnomalyResponse)
async def dismiss_anomaly(
    id: str,
    _: AdminUser = Depends(require_permission("audit.security.view")),
    db=Depends(get_db),
):
    return await audit_service.dismiss_anomaly(db, id)


@audit_router.post("/anomalies/{id}/investigate", response_model=AuditAnomalyResponse)
async def investigate_anomaly(
    id: str,
    _: AdminUser = Depends(require_permission("audit.security.view")),
    db=Depends(get_db),
):
    return await audit_service.investigate_anomaly(db, id)
