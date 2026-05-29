# Module 7 — Driver Management Orchestrator Log

## Phase 1 — Summary

Module 7 manages the full lifecycle of road drivers: onboarding and KYC approval, a searchable directory with bulk actions, per-driver detail pages (performance metrics, linked vehicle, documents, wallet), and a three-panel document review workflow. Four screens are specified: 7.1 Onboarding Queue (pending driver applications with doc completeness and SLA health), 7.2 Driver Directory (paginated table with segmented view tabs: All/Online/Review/Suspended/Docs-expiring/Top-performers), 7.3 Driver Detail (hero card + tabs: Overview, Documents, Vehicle, Performance, Earnings, Trips, Wallet, Disciplinary, Audit — Overview tab is primary), and 7.4 Document Review (doc rail, full document preview pane, extracted-fields + cross-checks review side panel). Backend data model: Driver, DriverDocument, DriverWalletTransaction tables with status state machine (pending → in_review → approved → active → suspended → deactivated | rejected) and orthogonal online_status (online | offline).

---

## Phase 2 — Audit

### Already exists
- `admin-panel/src/pages/drivers/` — directory exists but **empty**
- `admin-panel/src/components/layout/NavRail.tsx` — `{ id: 'drivers', path: '/drivers' }` ✓
- No backend models, schemas, services, or endpoints for drivers

### Must be built
**Backend:** Driver model, DriverDocument model, DriverWalletTransaction model, schemas, service, endpoint file, router registration, Alembic migration.
**Frontend:** driverService.ts, DriverOnboardingPage.tsx, DriverDirectoryPage.tsx, DriverDetailPage.tsx, DocumentReviewPage.tsx, App.tsx route registration.

---

## Phase 3 — Task Breakdown

| ID    | Layer    | Task                                                  | File |
|-------|----------|-------------------------------------------------------|------|
| BE-01 | Backend  | Driver + DriverDocument + DriverWalletTransaction models | backend/app/models/driver.py |
| BE-02 | Backend  | Pydantic schemas (all request/response shapes)        | backend/app/schemas/driver.py |
| BE-03 | Backend  | Service layer (list, get, approve, reject, suspend, reactivate, deactivate, force-offline, doc review, wallet adjust) | backend/app/services/driver_service.py |
| BE-04 | Backend  | API endpoint router (all 16 endpoints)                | backend/app/api/v1/endpoints/drivers.py |
| BE-05 | Backend  | Register router in router.py + update models __init__ | backend/app/api/v1/router.py, backend/app/models/__init__.py |
| BE-06 | Backend  | Alembic migration (create only, do not run)           | backend/alembic/versions/... |
| FE-01 | Frontend | TypeScript interfaces + service methods               | admin-panel/src/services/driverService.ts |
| FE-02 | Frontend | Onboarding Queue page (Screen 7.1)                    | admin-panel/src/pages/drivers/DriverOnboardingPage.tsx |
| FE-03 | Frontend | Driver Directory page (Screen 7.2)                    | admin-panel/src/pages/drivers/DriverDirectoryPage.tsx |
| FE-04 | Frontend | Driver Detail page (Screen 7.3 — all tabs, Overview primary) | admin-panel/src/pages/drivers/DriverDetailPage.tsx |
| FE-05 | Frontend | Document Review page (Screen 7.4)                     | admin-panel/src/pages/drivers/DocumentReviewPage.tsx |
| FE-06 | Frontend | Register 4 routes in App.tsx                          | admin-panel/src/App.tsx |
| VF-01 | Verify   | npm run build — zero TypeScript errors                | — |
| VF-02 | Verify   | Every API endpoint has a frontend service call        | — |
| VF-03 | Verify   | Every screen has a page component + route             | — |
| VF-04 | Verify   | Shell, ConfirmDialog, responsive hooks used correctly | — |

---

## Phase 4 — API Contract

See api-contract.md

---

## Phase 5 — Clarifications

No open questions — screens.jsx is detailed and unambiguous. Proceeding to Phase 6.

---

## Phase 6 — Agents

Spawned backend and frontend agents in parallel.

## Agent Results

(To be filled after agents complete)
