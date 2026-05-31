# Module 18 — Support & Ticketing Console — Orchestrator Log

## Module Summary
Support & Ticketing Console gives operations and support agents a centralized queue to capture, route, and resolve issues from customers, drivers, and operators. Tickets auto-route by category; priority drives an SLA timer that triggers escalation on breach. Agents see linked booking/payment context, can send public replies or internal notes, and resolve tickets with a required resolution code. Admins configure SLA policies per category/priority matrix and an escalation chain (agent → lead → supervisor → duty manager). The module ships three screens: Ticket Queue (24.1), Ticket Detail (24.2), and SLA & Escalation (24.3).

**Note:** Product doc numbers this as Module 18 but UI files are in Module 24 folder. We use the Module 24 UI files (screens.jsx + Support.html) and name this feature/module-18-support-ticketing on git.

## Git Branch
`feature/module-18-support-ticketing` — created fresh from `feature/module-06-dispatch`.

---

## Phase 2 — Audit

### What already exists
- Sidebar NavRail: `support` nav entry already present (id=`support`, path=`/support`, count=`37`)
- No backend endpoint, model, schema, or service for support/tickets
- No frontend pages in `admin-panel/src/pages/support/`
- No `admin-panel/src/services/supportService.ts`

### What needs to be built
**Backend:**
- `backend/app/models/support.py` — Ticket, TicketMessage, SlaPolicy models
- `backend/app/schemas/support.py` — Pydantic v2 schemas
- `backend/app/services/support_service.py` — business logic
- `backend/app/api/v1/endpoints/support.py` — FastAPI router
- Register in `backend/app/api/v1/router.py`
- Alembic migration

**Frontend:**
- `admin-panel/src/services/supportService.ts`
- `admin-panel/src/pages/support/TicketQueuePage.tsx`
- `admin-panel/src/pages/support/TicketDetailPage.tsx`
- `admin-panel/src/pages/support/SlaEscalationPage.tsx`
- Register routes in `admin-panel/src/App.tsx`

---

## Phase 3 — Task List

### Backend
- BE-01: SQLAlchemy models (Ticket, TicketMessage, SlaPolicy) in backend/app/models/support.py
- BE-02: Pydantic v2 schemas in backend/app/schemas/support.py
- BE-03: Service layer in backend/app/services/support_service.py
- BE-04: FastAPI endpoint file backend/app/api/v1/endpoints/support.py
- BE-05: Register router in backend/app/api/v1/router.py
- BE-06: Alembic migration (create file only, do NOT run)

### Frontend
- FE-01: TypeScript service in admin-panel/src/services/supportService.ts
- FE-02: TicketQueuePage.tsx — ticket list with KPI strip, filters, SLA cell
- FE-03: TicketDetailPage.tsx — conversation thread, context panel, resolution actions
- FE-04: SlaEscalationPage.tsx — SLA matrix table + escalation chain
- FE-05: Register all 3 routes in admin-panel/src/App.tsx

### Verify
- VF-01: npm run build — zero TypeScript errors
- VF-02: All API contract endpoints present in backend
- VF-03: All 3 screens have page components and routes

---

## Clarifications
- Using Module 24 UI spec files (screens.jsx / Support.html) for the Support & Ticketing Console feature, registered as Module 18 in the product document. Branch: feature/module-18-support-ticketing.
- Sidebar nav ID `support` already wired in NavRail.tsx — frontend pages must use activeId="support".
- API prefix: `/api/v1/support` (tickets at `/api/v1/support/tickets`).
