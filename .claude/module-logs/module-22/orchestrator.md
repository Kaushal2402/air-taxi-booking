# Module 22 — Orchestrator Log

## Phase 1 — Scope summary

Module 22 is the **Audit Log** module. It provides a tamper-evident, queryable record of every
consequential admin action across the platform. Three screens: (1) **Audit Stream** — live table
of events with KPI strip, search, and category/severity/actor filters; (2) **Event Detail** —
per-event metadata, before/after state diff, cryptographic hash chain integrity, and surrounding
session timeline; (3) **Security & Compliance** — anomaly monitoring, high-severity event bar
chart (14 days), open anomaly management (dismiss/investigate), and compliance posture grid.
Shell `activeId = "audit"` which already exists in NavRail.

Note: Product doc numbers Module 22 as "System Settings & Feature Flags" and Module 23 as
"Audit Log & Compliance", but the spec files (screens.jsx + HTML) for this delivery are labelled
"Module 22 — Audit Log". Implementation follows the screens.jsx spec.

---

## Phase 2 — Audit

### What already exists
- NavRail: `audit` nav item (`id: 'audit'`, path `/audit`) ✅
- `admin-panel/src/pages/audit/` — does NOT exist (empty)
- No `audit` backend endpoint, model, schema, or service

### What needs to be built — from scratch
Backend:
- `backend/app/models/audit.py` — AuditLog + AuditAnomaly
- `backend/app/schemas/audit.py`
- `backend/app/services/audit_service.py` — log_event + queries + SHA-256 chain
- `backend/app/api/v1/endpoints/audit.py`
- Wire `log_event` into existing endpoints: vehicles, drivers, customers, pricing, vendors
- Router registration
- Alembic migration

Frontend:
- `admin-panel/src/services/auditService.ts`
- `admin-panel/src/pages/audit/AuditStreamPage.tsx` (22.1)
- `admin-panel/src/pages/audit/AuditEventPage.tsx` (22.2)
- `admin-panel/src/pages/audit/SecurityCompliancePage.tsx` (22.3)
- Routes in App.tsx

---

## Phase 3 — Task list

Backend:
- BE-01: AuditLog + AuditAnomaly SQLAlchemy models
- BE-02: Pydantic schemas
- BE-03: audit_service.py (log_event w/ SHA-256 + all query methods)
- BE-04: audit.py FastAPI endpoints
- BE-05: Wire log_event into vehicles, vendors, drivers, customers, pricing endpoints
- BE-06: Register router
- BE-07: Alembic migration

Frontend:
- FE-01: auditService.ts
- FE-02: AuditStreamPage.tsx (22.1)
- FE-03: AuditEventPage.tsx (22.2)
- FE-04: SecurityCompliancePage.tsx (22.3)
- FE-05: Register routes in App.tsx
- FE-06: npm run build — zero errors

---

## Phase 5 — Clarifications

| Question | Decision |
|---|---|
| Audit writes | Wire log_event into existing services NOW |
| Hash chain | Real SHA-256 cryptographic chaining |
| Live tail | Static badge only |
| Anomalies | Static display — manual manage (dismiss/investigate), no auto-detection |

---

## Phase 6 — Agents spawned in parallel (background)
