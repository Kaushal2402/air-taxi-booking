# Module 11 — Customer Management · Backend Report

## Files Created

### New files
| File | Purpose |
|---|---|
| `backend/app/models/customer.py` | SQLAlchemy ORM models: `Customer`, `WalletTransaction` |
| `backend/app/schemas/customer.py` | Pydantic v2 schemas for all request/response types |
| `backend/app/services/customer_service.py` | Business logic — all async service methods |
| `backend/app/api/v1/endpoints/customers.py` | FastAPI router with 10 endpoints |
| `backend/alembic/script.py.mako` | Mako template (was missing from project, copied from alembic package) |

### Modified files
| File | Change |
|---|---|
| `backend/app/models/__init__.py` | Added `Customer`, `WalletTransaction` imports for Alembic discovery |
| `backend/app/api/v1/router.py` | Registered `customers_router` with prefix `/customers` |

---

## Endpoints

| Method | Path | Handler |
|---|---|---|
| GET | `/api/v1/customers` | `list_customers_endpoint` |
| POST | `/api/v1/customers` | `create_customer_endpoint` |
| GET | `/api/v1/customers/{customer_id}` | `get_customer_endpoint` |
| PATCH | `/api/v1/customers/{customer_id}` | `update_customer_endpoint` |
| POST | `/api/v1/customers/{customer_id}/suspend` | `suspend_customer_endpoint` |
| POST | `/api/v1/customers/{customer_id}/reactivate` | `reactivate_customer_endpoint` |
| POST | `/api/v1/customers/{customer_id}/flag` | `flag_customer_endpoint` |
| POST | `/api/v1/customers/{customer_id}/unflag` | `unflag_customer_endpoint` |
| POST | `/api/v1/customers/{customer_id}/wallet/adjust` | `adjust_wallet_endpoint` |
| GET | `/api/v1/customers/{customer_id}/wallet/transactions` | `list_wallet_transactions_endpoint` |

---

## Migration File

`backend/alembic/versions/9a6f498e9ac3_add_module_11_customers.py`

Revision ID: `9a6f498e9ac3`  
Down revision: `008`  
Tables created: `customers`, `wallet_transactions`

---

## Design Decisions

### Models
- `Customer` does NOT use `TimestampMixin` (the mixin would add `created_at`/`updated_at` via the mixin, but `Customer` also needs `joined_at` as a separate timestamp, so all three datetime columns are declared explicitly inline to avoid column-order confusion).
- `seq_id` is an `autoincrement=True` Integer with `unique=True` constraint. The `customer_code` hybrid_property (`C-{seq_id:04d}`) is computed on the Python side and not stored in the DB.
- `WalletTransaction` has no `updated_at` column — transactions are immutable audit records; only `created_at` is needed.
- The `segment` Python property (non-column) on `Customer` returns `segment_override or computed_segment`.

### Service layer
- `list_customers`: segment filter matches against the effective segment (checks `segment_override` first, falls back to `computed_segment`) using an `OR` clause rather than a computed column for maximum compatibility.
- `segment_counts["all"]` uses the same search/city/include_inactive filters as the main query (but without the segment filter) so tab counts always reflect the current search context.
- `compute_segment` priority: loyalist (trips >= 300) > new (joined within 30 days) > frequent (trips >= 50) > regular. `vip_corp` is only settable via `segment_override` and is never auto-computed.
- Wallet debit overdraft returns HTTP 422 with `detail: "Insufficient wallet balance"` matching the contract spec.

### Schemas
- `CustomerResponse.segment` uses Pydantic v2 `@computed_field` decorator to derive the effective segment from `segment_override or computed_segment`.
- `CustomerUpdate` uses `Field(default=None)` explicitly on every field (PATCH semantics — only provided fields are updated via `model_dump(exclude_unset=True)`).

### Router
- `create_customer_endpoint` and `adjust_wallet_endpoint` capture `current_user: AdminUser` (named, not `_`) so the admin's `name` can be passed to the service as `created_by`.
- All other endpoints use `_: AdminUser` (unnamed) for the auth guard to enforce authentication without needing the user object.

### Migration note
The alembic project was missing `alembic/script.py.mako`. It was copied from the bundled alembic package template (`templates/generic/script.py.mako`). The migration was NOT run against the database (`alembic upgrade head` was intentionally skipped per task spec).
