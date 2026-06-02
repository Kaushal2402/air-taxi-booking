# Module 15 — Payments, Wallet & Ledger — Orchestrator Log

## Module Summary
Module 15 provides finance and admin full visibility and control over money movement in the platform. It comprises three screens implemented in screens.jsx: (1) **Payment Ledger** (15.1) — a paginated transaction list with 5-KPI summary cards, filter chips (method/status/gateway/service/date), and a table showing txn id, customer, booking, method/VPA, gross, gateway fee, net, and status; (2) **Transaction Detail & Refund** (15.2) — a two-column detail view showing amount breakdown, payment instrument details (risk score, AVS, 3DS), a lifecycle timeline, and an inline refund panel with partial/full refund, reason, and confirmation warning; (3) **Gateway Reconciliation** (15.3) — per-gateway summary cards showing expected vs settled vs variance with a match % bar, a settlement batches table, and an unmatched-items queue. The sidebar nav ID is `payments` at path `/payments`.

---

## Phase 1 — Scope Read ✅
- screens.jsx: 3 screens (PaymentLedgerScreen, TransactionDetailScreen, ReconciliationScreen)
- HTML wireframe: Module 15 - Payments.html
- Product doc: Module 15 section at line 977
- CLAUDE.md: read
- project_stack.md: read

---

## Phase 2 — Audit ✅

### Already exists
- `admin-panel/src/components/layout/NavRail.tsx` — sidebar entry `{ id: 'payments', path: '/payments' }` ✅

### Needs to be built
**Backend:**
- `backend/app/models/payment.py` — Payment, Refund, LedgerEntry, ReconciliationBatch, ReconciliationRecord
- `backend/app/schemas/payments.py` — all request/response schemas
- `backend/app/services/payments_service.py` — business logic
- `backend/app/api/v1/endpoints/payments.py` — router
- Alembic migration

**Frontend:**
- `admin-panel/src/services/paymentsService.ts`
- `admin-panel/src/pages/payments/PaymentsPage.tsx` (15.1 ledger)
- `admin-panel/src/pages/payments/TransactionDetailPage.tsx` (15.2 detail + refund)
- `admin-panel/src/pages/payments/ReconciliationPage.tsx` (15.3 reconciliation)
- Routes in App.tsx

---

## Phase 3 — Task Breakdown ✅

### Backend Tasks
- BE-01: SQLAlchemy models — Payment, Refund, ReconciliationBatch, ReconciliationRecord
- BE-02: Pydantic schemas — all list/detail/refund request-response
- BE-03: payments_service.py — list_transactions, get_transaction, issue_refund, list_reconciliation_gateways, list_settlement_batches, list_unmatched_items
- BE-04: endpoints/payments.py — all routes
- BE-05: Register router in router.py
- BE-06: Alembic migration

### Frontend Tasks
- FE-01: paymentsService.ts — TypeScript interfaces + API calls
- FE-02: PaymentsPage.tsx — ledger with KPI cards, filters, table, pagination
- FE-03: TransactionDetailPage.tsx — detail with breakdown, instrument, lifecycle, refund panel
- FE-04: ReconciliationPage.tsx — gateway cards, batches table, unmatched queue
- FE-05: Register routes in App.tsx

### Verify Tasks
- VF-01: npm run build — zero TypeScript errors
- VF-02: API contract alignment check
- VF-03: Screen coverage check

---

## Phase 4 — API Contract ✅
See api-contract.md

---

## Phase 5 — Clarifications
No blocking ambiguities. The screens.jsx spec is clear and complete for all 3 screens.
Decisions made:
- Using `payments` as the sidebar activeId (confirmed in NavRail.tsx)
- Wallet Ledger screen (15.3 from product doc) is NOT in screens.jsx → not implementing per "screens.jsx is primary spec"
- ReconciliationScreen is treated as screen 15.3 matching screens.jsx

---

## Phase 6 — Agent Spawning ✅
Backend and Frontend agents spawned in parallel.

---
