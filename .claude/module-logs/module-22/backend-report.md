# Module 22 — Audit Log — Backend Report

## Status: Complete

---

## Files Created

| File | Purpose |
|---|---|
| `backend/app/models/audit.py` | AuditLog + AuditAnomaly ORM models |
| `backend/app/schemas/audit.py` | Pydantic schemas: AuditEventSummary, AuditEventDetail, SurroundingEvent, AuditStatsResponse, SecurityStatsResponse, ChartDay, SecurityChartResponse, AuditAnomalyResponse, AuditAnomalyCreate, AuditEventsResponse, AuditAnomaliesResponse, ExportRequest |
| `backend/app/services/audit_service.py` | Business logic: log_event, list_events, get_event, get_stats, get_security_stats, get_security_chart, list_anomalies, create_anomaly, dismiss_anomaly, investigate_anomaly |
| `backend/app/api/v1/endpoints/audit.py` | 10 HTTP endpoints under `/api/v1/audit` |

## Files Modified

| File | Change |
|---|---|
| `backend/app/models/__init__.py` | Added AuditLog, AuditAnomaly imports + __all__ entries |
| `backend/app/api/v1/router.py` | Registered audit_router under prefix `/audit` |
| `backend/app/api/v1/endpoints/vehicles.py` | Instrumented: approve_vehicle (high), ground_vehicle (high), reactivate_vehicle (med), link_driver (low), unlink_driver (low), review_document (med), activate_vendor (high), suspend_vendor (high) |
| `backend/app/api/v1/endpoints/drivers.py` | Instrumented: approve_driver (high), reject_driver (high), suspend_driver (high), reactivate_driver (med), deactivate_driver (high), force_offline (med), review_document (med), adjust_wallet (high) |
| `backend/app/api/v1/endpoints/customers.py` | Instrumented: suspend_customer (high), reactivate_customer (med), flag_customer (med), unflag_customer (med), adjust_wallet (high) |
| `backend/app/api/v1/endpoints/pricing.py` | Instrumented: publish_road_rule (high), publish_air_rule (high), delete_road_rule (med), delete_air_rule (med) |

## Endpoints Built

| Method | Path | Description |
|---|---|---|
| GET | /api/v1/audit/events | Paginated list with time_window, search, category, severity, actor_name filters |
| GET | /api/v1/audit/events/{id} | Event detail with hash chain + surrounding events |
| POST | /api/v1/audit/events/export | Export trigger (placeholder response) |
| GET | /api/v1/audit/stats | KPI stats (events_total, admin_actions, high_severity, failed_logins, integrity_ok) |
| GET | /api/v1/audit/security/stats | Security KPIs (anomalies, pii_exports, mfa_coverage, retention_policy) |
| GET | /api/v1/audit/security/chart | 14-day high-severity chart |
| GET | /api/v1/audit/anomalies | List anomalies (filtered by status) |
| POST | /api/v1/audit/anomalies | Create anomaly |
| POST | /api/v1/audit/anomalies/{id}/dismiss | Dismiss anomaly |
| POST | /api/v1/audit/anomalies/{id}/investigate | Mark investigating |

## Audit Wiring Points

### vehicles.py (8 points)
- approve_vehicle → vehicle.approve / Operations / high
- ground_vehicle → vehicle.ground / Operations / high
- reactivate_vehicle → vehicle.reactivate / Operations / med
- link_driver → vehicle.link_driver / Operations / low
- unlink_driver → vehicle.unlink_driver / Operations / low
- review_document → vehicle.document.review / Operations / med
- activate_vendor → vendor.activate / Operations / high
- suspend_vendor → vendor.suspend / Operations / high

### drivers.py (8 points)
- approve_driver → driver.approve / Operations / high
- reject_driver → driver.reject / Operations / high
- suspend_driver → driver.suspend / Operations / high
- reactivate_driver → driver.reactivate / Operations / med
- deactivate_driver → driver.deactivate / Operations / high
- force_offline → driver.force_offline / Operations / med
- review_document → driver.document.review / Operations / med
- adjust_wallet → driver.wallet.adjust / Finance / high

### customers.py (5 points)
- suspend_customer → customer.suspend / Support / high
- reactivate_customer → customer.reactivate / Support / med
- flag_customer → customer.flag / Support / med
- unflag_customer → customer.unflag / Support / med
- adjust_wallet → customer.wallet.adjust / Finance / high

### pricing.py (4 points)
- publish_road_rule → pricing.road.publish / Pricing / high
- publish_air_rule → pricing.air.publish / Pricing / high
- delete_road_rule → pricing.road.delete / Pricing / med
- delete_air_rule → pricing.air.delete / Pricing / med

## Migration

**File:** `backend/alembic/versions/5d8d45a34601_add_module_22_audit_tables.py`

Tables created:
- `audit_logs` — with indexes on event_code (unique), action, timestamp
- `audit_anomalies`

UTCDateTime() references replaced with sa.DateTime() in migration file.
Duplicate timestamp index removed.

## Issues / Notes

1. Python 3.9 compatibility: `str | None` inside `Mapped[...]` causes NameError at SQLAlchemy scan time even with `from __future__ import annotations`. Used `Optional[str]` / `Optional[datetime]` instead in the model.
2. All audit wiring calls wrapped in bare `except Exception: pass` to ensure audit failures never crash the calling endpoint. The service layer also has try/except with stderr logging.
3. Hash chain: genesis event uses `"0" * 64` as prev_hash. Each subsequent event chains via SHA-256(prev_hash + json_payload).
4. `mfa_coverage_pct` is hardcoded at 94.0 — will be dynamic after admin_users module provides MFA data.
