# Module 11 — Customer Management · Orchestrator Log

---

## Phase 1 — Scope Summary

Module 11 is the Customer Management hub for the Air Taxi admin panel.
It gives support agents, finance admins, and super-admins a complete view of every customer:
a searchable/filterable directory (11.1) with segment counters (VIP·Corp, Loyalists, Frequent, New, Flagged);
a multi-tab customer detail page (11.2) showing a 12-month trip sparkline, recent trips, service-mix bar, payment methods, and saved places under the Overview tab;
and a modal wallet-adjustment flow (11.3) that lets authorised admins issue goodwill credits or debit wallet balance, with a real-time preview, goodwill-cap warning, and multi-channel customer notification (Push/SMS/Email).
Key actions are: suspend/reactivate, flag/unflag, goodwill credit (gated by cap and Finance approval above threshold), and wallet debit.

**Phase 1 complete — 2026-05-28**

---

## Phase 2 — Audit

### Already exists
| Layer | File | Note |
|---|---|---|
| Frontend pages dir | `admin-panel/src/pages/customers/` | Directory exists but **empty** |
| Nav | `NavRail.tsx` — `{ id: 'customers', path: '/customers' }` | ID confirmed |

### Needs to be built
| Layer | What |
|---|---|
| Backend model | `backend/app/models/customer.py` + `wallet_transaction.py` |
| Backend schema | `backend/app/schemas/customer.py` |
| Backend service | `backend/app/services/customer_service.py` |
| Backend endpoint | `backend/app/api/v1/endpoints/customers.py` |
| Router registration | `backend/app/api/v1/router.py` |
| Alembic migration | `add_module_11_customers` |
| Frontend service | `admin-panel/src/services/customerService.ts` |
| Frontend pages | `CustomersPage.tsx`, `CustomerDetailPage.tsx` (with wallet modal) |
| Route registration | `admin-panel/src/App.tsx` |

**Phase 2 complete — 2026-05-28**

---

## Phase 3 — Task List

### Backend
| ID | Task | File |
|---|---|---|
| BE-01 | SQLAlchemy model: `Customer` (id, name, phone, email, city, status, segment, wallet_balance_minor, trips_count, ltv_minor, avg_fare_minor, rating, cancellation_rate, last_active_at, flag_reason, joined_at, created_at, updated_at) | `app/models/customer.py` |
| BE-02 | SQLAlchemy model: `WalletTransaction` (id, customer_id, direction, amount_minor, reason, audit_note, created_by, created_at) | `app/models/customer.py` |
| BE-03 | Pydantic schemas: CustomerList, CustomerDetail, CustomerUpdate, WalletAdjustRequest, WalletAdjustResponse, FlagRequest, SuspendRequest | `app/schemas/customer.py` |
| BE-04 | Service methods: list_customers, get_customer, update_customer, adjust_wallet, flag_customer, suspend_customer, reactivate_customer | `app/services/customer_service.py` |
| BE-05 | FastAPI router: GET /customers, GET /customers/{id}, PATCH /customers/{id}, POST /customers/{id}/suspend, POST /customers/{id}/reactivate, POST /customers/{id}/flag, POST /customers/{id}/unflag, POST /customers/{id}/wallet/adjust, GET /customers/{id}/wallet/transactions | `app/api/v1/endpoints/customers.py` |
| BE-06 | Register router in router.py | `app/api/v1/router.py` |
| BE-07 | Alembic migration | `alembic revision --autogenerate -m "add_module_11_customers"` |

### Frontend
| ID | Task | File |
|---|---|---|
| FE-01 | TypeScript interfaces + service methods | `src/services/customerService.ts` |
| FE-02 | Customer Directory page (11.1) — segment bar, filter bar, full table, responsive | `src/pages/customers/CustomersPage.tsx` |
| FE-03 | Customer Detail page (11.2) — hero stats, tab bar (Overview active, others stub), Overview tab content (sparkline, recent trips, service mix, payments, saved places), action buttons (Message/Goodwill credit/Flag/Suspend) | `src/pages/customers/CustomerDetailPage.tsx` |
| FE-04 | Wallet Adjust modal (11.3) — embedded in detail page, direction toggle, amount presets, reason/audit note, preview panel, notify checkboxes | inside `CustomerDetailPage.tsx` |
| FE-05 | Register routes: `/customers` + `/customers/:id` in App.tsx | `src/App.tsx` |

### Verify
| ID | Task |
|---|---|
| VF-01 | npm run build — zero TypeScript errors |
| VF-02 | Every endpoint in api-contract.md exists in endpoint file + service |
| VF-03 | Every screen in screens.jsx has a page component + route |
| VF-04 | useIsMobile/useIsTablet used on all new pages |
| VF-05 | Shell wrapper present on all pages |
| VF-06 | ConfirmDialog props correct (open, description, variant) |

**Phase 3 complete — 2026-05-28**

---

## Phase 5 — Clarifications (RESOLVED 2026-05-28)

| Question | Decision |
|---|---|
| Detail tabs (7 beyond Overview) | Stub placeholders. Each tab calls its own API (bookings, payments, tickets…) but shows "Coming soon" gracefully when the endpoint returns 404/not-found. When those modules are built, stubs auto-reflect with no further changes needed. |
| Wallet ledger | Full WalletTransaction table — double-entry audit row per adjustment. |
| Segment management | Both: computed default (trips/LTV thresholds) + optional admin `segment_override`. Display = `segment_override ?? computed_segment`. Thresholds: ≥300 trips → loyalist; joined ≤30d → new; ≥50 trips → frequent; else → regular. VIP·Corp is manual-only override. |
| Add customer | Fully functional — create form with name, phone, email, city, segment_override. |

**Phase 5 complete — 2026-05-28**

---

## Phase 6 — Agent Results

- Backend agent: 10 endpoints, 2 models, schemas, service, migration `9a6f498e9ac3` — complete
- Frontend agent: customerService.ts, CustomersPage.tsx, CustomerDetailPage.tsx, routes in App.tsx — 0 TS errors

**Phase 6 complete — 2026-05-28**

---

## Phase 7 — Verification + Fixes

Verifier found 4 issues, all fixed:

| Issue | Fix |
|---|---|
| Migration used bare `app.models.base.UTCDateTime()` (NameError risk) | Replaced with `sa.DateTime(timezone=True)` — 5 occurrences in migration file |
| `handleSuspend` hardcoded reason `'Suspended by admin'` | Replaced `ConfirmDialog` with `FlagReasonModal` (reason required, variant="danger") |
| `WalletDirection` not exported as a named type | Added `export type WalletDirection = 'credit' \| 'debit'` to customerService.ts |
| Stat grid on mobile missing `minWidth: 0` | Added `minWidth: 0` to hero stats grid wrapper |

Post-fix build: ✅ 0 TypeScript errors, 285 modules transformed.

**Phase 7 complete — 2026-05-28**
