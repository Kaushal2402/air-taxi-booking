# Module 15 — Backend Implementation Report

## Files Created

### BE-01: `backend/app/models/payment.py`
Four ORM models:
- **Payment** — core transaction model with `PaymentMethod` enum (upi/card/wallet/netbanking/corporate/cash) and `PaymentStatus` enum (initiated/authorized/captured/refunded/part-refund/chargeback/invoiced/pending/failed/disputed). `booking_id` is nullable String (no FK to avoid cross-module dependency issues). Has `refunds` relationship to `Refund`.
- **Refund** — linked to `payments.id` via FK with CASCADE delete. Stores refund_type (full/partial), reason, status.
- **ReconciliationBatch** — tracks settlement batches per gateway with amount (BigInteger), matched_count, status.
- **ReconciliationUnmatched** — integer PK autoincrement, tracks unmatched categories per reconciliation cycle.

### BE-02: `backend/app/schemas/payments.py`
All Pydantic v2 schemas with `from __future__ import annotations` and `X | None` syntax:
- `PaymentListItem`, `PaymentKPIs`, `PaymentListResponse`
- `BreakdownItem`, `InstrumentDetail`, `TimelineEvent`, `RefundSummary`, `PaymentDetail`
- `RefundRequest` (Literal["full","partial"]), `RefundResponse`
- `GatewaySummary`, `ReconciliationSummaryResponse`
- `BatchItem`, `BatchListResponse`
- `UnmatchedItem`, `UnmatchedResponse`

### BE-03: `backend/app/services/payments_service.py`
Six async service methods:
- **list_transactions** — full filter support (search, method, status CSV, gateway, service, date_from/to). KPIs computed from DB aggregates, returns zeros on empty DB.
- **get_transaction** — loads Payment + its Refund rows, builds synthetic breakdown and instrument from DB data, returns `PaymentDetail`.
- **issue_refund** — validates transaction exists, creates `Refund` record, updates Payment status to refunded/part-refund. Uses `await db.flush()` + `db.refresh()`.
- **get_reconciliation_summary** — aggregates ReconciliationBatch rows into GatewaySummary list, counts unmatched items.
- **list_settlement_batches** — time-windowed query using `hours` lookback, paginated.
- **list_unmatched_items** — returns all ReconciliationUnmatched rows ordered by id.

### BE-04: `backend/app/api/v1/endpoints/payments.py`
Follows catalog.py pattern exactly. Route order is critical:
1. `GET ""` — list_transactions
2. `GET /reconciliation/summary` — defined before `/{txn_id}` to avoid route conflict
3. `GET /reconciliation/batches`
4. `GET /reconciliation/unmatched`
5. `GET /{txn_id}` — get_transaction (404 if not found)
6. `POST /{txn_id}/refund` — issue_refund (201, 404 if not found)

All endpoints have `_: AdminUser = Depends(get_current_admin_user)` auth guard.

## Files Modified

### BE-05: `backend/app/api/v1/router.py`
Added import of `payments_router` and registered:
```python
api_router.include_router(payments_router, prefix="/payments", tags=["payments"])
```

## BE-06: Alembic Migration
Migration file generated (not run):
`backend/alembic/versions/df6938de111d_add_module_15_payments_ledger.py`

Creates tables: `payments`, `refunds`, `reconciliation_batches`, `reconciliation_unmatched`.

## Notes
- `booking_id` on Payment is a plain nullable String (no FK) to avoid cross-module FK constraints.
- All service methods return empty/zero results on new install rather than crashing.
- Migration was generated but NOT run (as instructed).
