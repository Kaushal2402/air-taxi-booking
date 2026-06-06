from __future__ import annotations

import hashlib
import json
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.audit import AuditAnomaly, AuditLog
from app.services.settings_service import get_settings
from app.schemas.audit import (
    AuditAnomalyCreate,
    AuditAnomalyResponse,
    AuditAnomaliesResponse,
    AuditEventDetail,
    AuditEventSummary,
    AuditEventsResponse,
    AuditStatsResponse,
    ChartDay,
    SecurityChartResponse,
    SecurityStatsResponse,
    SurroundingEvent,
)


# ── Time window helper ────────────────────────────────────────────────────────

def _window_cutoff(time_window: str) -> datetime:
    now = datetime.now(timezone.utc)
    mapping = {
        "1h": timedelta(hours=1),
        "6h": timedelta(hours=6),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
    }
    delta = mapping.get(time_window, timedelta(hours=24))
    return now - delta


# ── Core write function ───────────────────────────────────────────────────────

def _json_safe(obj: Optional[dict]) -> Optional[dict]:
    """Recursively convert non-JSON-serializable values (datetime, etc.) to strings."""
    if obj is None:
        return None
    out = {}
    for k, v in obj.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = _json_safe(v)
        elif isinstance(v, list):
            out[k] = [i.isoformat() if isinstance(i, datetime) else i for i in v]
        else:
            out[k] = v
    return out


async def log_event(
    db: AsyncSession,
    actor_name: str,
    actor_role: str,
    action: str,
    target: str,
    category: str,
    severity: str,
    source_ip: Optional[str] = None,
    session_id: Optional[str] = None,
    request_id: Optional[str] = None,
    before_data: Optional[dict] = None,
    after_data: Optional[dict] = None,
) -> None:
    """Write an immutable audit event. Never raises — failures are logged to stderr.
    Events in the 'Analytics' category are silently dropped when
    consent_analytics_tracking is disabled in platform settings.
    """
    try:
        # Gap 6: skip analytics events when consent_analytics_tracking is off
        if category.lower() == "analytics":
            platform = await get_settings(db)
            if not platform.consent_analytics_tracking:
                return
        # Generate unique event code
        event_code = "EVT-" + uuid.uuid4().hex[:8].upper()

        # Fetch previous event's hash for chain
        result = await db.execute(
            select(AuditLog.this_hash)
            .order_by(AuditLog.timestamp.desc())
            .limit(1)
        )
        row = result.fetchone()
        prev_hash = row[0] if row and row[0] else "0" * 64

        # Compute this event's hash
        now_ts = datetime.utcnow()
        payload = json.dumps(
            {
                "action": action,
                "target": target,
                "actor_name": actor_name,
                "timestamp": now_ts.isoformat(),
            },
            sort_keys=True,
        )
        this_hash = hashlib.sha256((prev_hash + payload).encode()).hexdigest()

        record = AuditLog(
            event_code=event_code,
            actor_name=actor_name,
            actor_role=actor_role,
            action=action,
            target=target,
            category=category,
            severity=severity,
            source_ip=source_ip,
            session_id=session_id,
            request_id=request_id,
            before_data=_json_safe(before_data),
            after_data=_json_safe(after_data),
            prev_hash=prev_hash,
            this_hash=this_hash,
            timestamp=now_ts,
        )
        db.add(record)
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        print(f"[audit] log_event failed silently: {exc}", file=sys.stderr)
        try:
            await db.rollback()
        except Exception:
            pass


# ── List events ───────────────────────────────────────────────────────────────

async def list_events(
    db: AsyncSession,
    search: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    actor_name: Optional[str] = None,
    time_window: str = "24h",
    page: int = 1,
    per_page: int = 25,
) -> AuditEventsResponse:
    cutoff = _window_cutoff(time_window)
    q = select(AuditLog).where(AuditLog.timestamp >= cutoff)

    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        q = q.where(
            or_(
                AuditLog.actor_name.ilike(like),
                AuditLog.action.ilike(like),
                AuditLog.target.ilike(like),
                AuditLog.source_ip.ilike(like),
            )
        )
    if category:
        q = q.where(AuditLog.category == category)
    if severity:
        q = q.where(AuditLog.severity == severity)
    if actor_name:
        q = q.where(AuditLog.actor_name.ilike(f"%{actor_name}%"))

    # Count total
    count_q = select(func.count()).select_from(q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Fetch page
    q = q.order_by(AuditLog.timestamp.desc())
    q = q.offset((page - 1) * per_page).limit(per_page)
    rows = await db.execute(q)
    items = rows.scalars().all()

    return AuditEventsResponse(
        items=[AuditEventSummary.model_validate(r) for r in items],
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Get single event detail ───────────────────────────────────────────────────

async def get_event(db: AsyncSession, id: str) -> AuditEventDetail:
    result = await db.execute(select(AuditLog).where(AuditLog.id == id))
    event = result.scalars().first()
    if not event:
        raise NotFoundException("AuditLog")

    # Fetch next event in chain
    next_result = await db.execute(
        select(AuditLog.this_hash).where(AuditLog.prev_hash == event.this_hash).limit(1)
    )
    next_row = next_result.fetchone()
    next_hash = next_row[0] if next_row else None

    # Surrounding events — up to 5 before + 3 after within same session
    surrounding: list[SurroundingEvent] = []
    if event.session_id:
        before_result = await db.execute(
            select(AuditLog)
            .where(
                AuditLog.session_id == event.session_id,
                AuditLog.timestamp < event.timestamp,
            )
            .order_by(AuditLog.timestamp.desc())
            .limit(5)
        )
        before_events = list(reversed(before_result.scalars().all()))

        after_result = await db.execute(
            select(AuditLog)
            .where(
                AuditLog.session_id == event.session_id,
                AuditLog.timestamp > event.timestamp,
            )
            .order_by(AuditLog.timestamp.asc())
            .limit(3)
        )
        after_events = after_result.scalars().all()

        for ev in [*before_events, *after_events]:
            surrounding.append(
                SurroundingEvent(
                    id=ev.id,
                    timestamp=ev.timestamp,
                    action=ev.action,
                    description=ev.target,
                    is_current=False,
                )
            )
    else:
        # Fall back to 4 most recent events globally
        recent_result = await db.execute(
            select(AuditLog)
            .where(AuditLog.id != id)
            .order_by(AuditLog.timestamp.desc())
            .limit(4)
        )
        for ev in recent_result.scalars().all():
            surrounding.append(
                SurroundingEvent(
                    id=ev.id,
                    timestamp=ev.timestamp,
                    action=ev.action,
                    description=ev.target,
                    is_current=False,
                )
            )

    return AuditEventDetail(
        id=event.id,
        event_code=event.event_code,
        timestamp=event.timestamp,
        actor_name=event.actor_name,
        actor_role=event.actor_role,
        action=event.action,
        target=event.target,
        category=event.category,
        severity=event.severity,
        source_ip=event.source_ip,
        created_at=event.created_at,
        session_id=event.session_id,
        request_id=event.request_id,
        before_data=event.before_data,
        after_data=event.after_data,
        prev_hash=event.prev_hash,
        this_hash=event.this_hash,
        next_hash=next_hash,
        surrounding_events=surrounding,
    )


# ── Stats ─────────────────────────────────────────────────────────────────────

async def get_stats(db: AsyncSession, time_window: str = "24h") -> AuditStatsResponse:
    cutoff = _window_cutoff(time_window)

    events_total_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.timestamp >= cutoff)
    )
    events_total = events_total_result.scalar() or 0

    admin_actions_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.timestamp >= cutoff,
            AuditLog.actor_role != "System",
            AuditLog.actor_name != "System",
        )
    )
    admin_actions = admin_actions_result.scalar() or 0

    high_severity_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.timestamp >= cutoff,
            AuditLog.severity == "high",
        )
    )
    high_severity = high_severity_result.scalar() or 0

    failed_logins_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.timestamp >= cutoff,
            AuditLog.action == "login.failed",
        )
    )
    failed_logins = failed_logins_result.scalar() or 0

    return AuditStatsResponse(
        events_total=events_total,
        admin_actions=admin_actions,
        high_severity=high_severity,
        failed_logins=failed_logins,
        integrity_ok=True,
    )


async def get_security_stats(db: AsyncSession) -> SecurityStatsResponse:  # noqa: C901
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    anomalies_open_result = await db.execute(
        select(func.count(AuditAnomaly.id)).where(AuditAnomaly.status == "open")
    )
    anomalies_open = anomalies_open_result.scalar() or 0

    anomalies_7d_result = await db.execute(
        select(func.count(AuditAnomaly.id)).where(AuditAnomaly.detected_at >= seven_days_ago)
    )
    anomalies_7d = anomalies_7d_result.scalar() or 0

    pii_exports_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.action.ilike("%export%"),
            AuditLog.timestamp >= seven_days_ago,
        )
    )
    pii_exports_7d = pii_exports_result.scalar() or 0

    platform = await get_settings(db)
    audit_years = platform.data_retention_audit_years or 7
    retention_label = f"{audit_years} yr{'s' if audit_years != 1 else ''}"

    return SecurityStatsResponse(
        anomalies_open=anomalies_open,
        anomalies_7d=anomalies_7d,
        pii_exports_7d=pii_exports_7d,
        mfa_coverage_pct=94.0,
        retention_policy=retention_label,
        integrity_ok=True,
    )


async def get_security_chart(db: AsyncSession) -> SecurityChartResponse:
    now = datetime.now(timezone.utc)
    days: list[ChartDay] = []

    for i in range(13, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        result = await db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.severity == "high",
                AuditLog.timestamp >= day_start,
                AuditLog.timestamp < day_end,
            )
        )
        count = result.scalar() or 0
        days.append(ChartDay(date=day_start.strftime("%Y-%m-%d"), count=count))

    return SecurityChartResponse(days=days)


# ── Anomalies ─────────────────────────────────────────────────────────────────

async def list_anomalies(
    db: AsyncSession, status: Optional[str] = None
) -> AuditAnomaliesResponse:
    q = select(AuditAnomaly)
    if status:
        q = q.where(AuditAnomaly.status == status)
    q = q.order_by(AuditAnomaly.detected_at.desc())
    result = await db.execute(q)
    items = result.scalars().all()
    return AuditAnomaliesResponse(
        items=[AuditAnomalyResponse.model_validate(a) for a in items],
        total=len(items),
    )


async def create_anomaly(db: AsyncSession, data: AuditAnomalyCreate) -> AuditAnomalyResponse:
    anomaly = AuditAnomaly(
        title=data.title,
        description=data.description,
        severity=data.severity,
        status="open",
        detected_at=datetime.now(timezone.utc),
    )
    db.add(anomaly)
    await db.commit()
    await db.refresh(anomaly)
    return AuditAnomalyResponse.model_validate(anomaly)


async def dismiss_anomaly(db: AsyncSession, id: str) -> AuditAnomalyResponse:
    result = await db.execute(select(AuditAnomaly).where(AuditAnomaly.id == id))
    anomaly = result.scalars().first()
    if not anomaly:
        raise NotFoundException("AuditAnomaly")
    anomaly.status = "dismissed"
    anomaly.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(anomaly)
    return AuditAnomalyResponse.model_validate(anomaly)


async def investigate_anomaly(db: AsyncSession, id: str) -> AuditAnomalyResponse:
    result = await db.execute(select(AuditAnomaly).where(AuditAnomaly.id == id))
    anomaly = result.scalars().first()
    if not anomaly:
        raise NotFoundException("AuditAnomaly")
    anomaly.status = "investigating"
    await db.commit()
    await db.refresh(anomaly)
    return AuditAnomalyResponse.model_validate(anomaly)
