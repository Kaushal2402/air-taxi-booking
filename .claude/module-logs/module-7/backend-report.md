## Files created/modified

### Created
- `backend/app/models/driver.py` — Driver, DriverDocument, DriverWalletTransaction ORM models
- `backend/app/schemas/driver.py` — All Pydantic v2 request/response schemas
- `backend/app/services/driver_service.py` — Business logic for all driver operations
- `backend/app/api/v1/endpoints/drivers.py` — Thin FastAPI router (17 endpoints)
- `backend/alembic/versions/3c3019762e67_add_module_7_drivers.py` — Alembic migration

### Modified
- `backend/app/models/__init__.py` — Added Driver, DriverDocument, DriverWalletTransaction imports + __all__
- `backend/app/api/v1/router.py` — Registered drivers_router at prefix /drivers

---

## Models

| Model | Table |
|---|---|
| Driver | drivers |
| DriverDocument | driver_documents |
| DriverWalletTransaction | driver_wallet_transactions |

**Driver** — UUID PK, seq_id (nullable), name, phone (unique+index), email (unique+index, nullable), city, zone_code, vehicle_class, vehicle_plate, status (default=pending), online_status (default=offline), kyc_status (default=pending), stage (default=signup), rating, acceptance_rate, cancellation_rate, trips_count, wallet_balance_minor, flag_reason, joined_at, created_at, updated_at. Has `driver_code` hybrid_property returning "D-{seq_id:05d}".

**DriverDocument** — UUID PK, driver_id (FK→drivers.id, indexed), doc_type, status (default=pending), doc_number, expiry_date (Date), review_note, reviewed_by, reviewed_at, created_at, updated_at.

**DriverWalletTransaction** — UUID PK, driver_id (FK→drivers.id, indexed), direction (credit|debit), amount_minor, reason, audit_note, created_by, created_at.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/v1/drivers | List drivers with filters, pagination, status_counts |
| GET | /api/v1/drivers/onboarding | Onboarding queue (pending+in_review) with doc_progress, sla_status |
| GET | /api/v1/drivers/{id} | Get driver by UUID or driver_code |
| PATCH | /api/v1/drivers/{id} | Update driver profile fields |
| POST | /api/v1/drivers/{id}/approve | Approve driver → active (assigns seq_id if missing) |
| POST | /api/v1/drivers/{id}/reject | Reject driver (requires reason) |
| POST | /api/v1/drivers/{id}/suspend | Suspend driver + force offline (requires reason) |
| POST | /api/v1/drivers/{id}/reactivate | Reactivate suspended driver → active |
| POST | /api/v1/drivers/{id}/deactivate | Permanently deactivate driver (requires reason) |
| POST | /api/v1/drivers/{id}/force-offline | Set online_status=offline without changing account status |
| GET | /api/v1/drivers/{id}/documents | List all documents for driver |
| POST | /api/v1/drivers/{id}/documents | Create a document record (status=pending) |
| PATCH | /api/v1/drivers/{id}/documents/{doc_id} | Review document (approve/reject/request_reupload) |
| GET | /api/v1/drivers/{id}/trips | Stub — returns empty list |
| GET | /api/v1/drivers/{id}/earnings | Stub — returns empty list |
| GET | /api/v1/drivers/{id}/wallet/transactions | Paginated wallet transaction list |
| POST | /api/v1/drivers/{id}/wallet/adjust | Credit or debit driver wallet |

---

## Migration

- **File**: `backend/alembic/versions/3c3019762e67_add_module_7_drivers.py`
- **Revision ID**: `3c3019762e67`
- **Down revision**: `9a6f498e9ac3` (customers migration)
- Creates tables: drivers, driver_documents, driver_wallet_transactions
- Creates indexes on phone, email (drivers), driver_id (driver_documents, driver_wallet_transactions)

---

## Notes

- `from __future__ import annotations` applied to all new files that use `X | Y` union syntax
- `/api/v1/drivers/onboarding` route is defined BEFORE `/{id}` in the router to prevent FastAPI route conflict
- `reviewed_by` in `review_document` uses `admin_user.email` from the authenticated AdminUser
- KYC status is recomputed after every document review: rejected/expired docs → rejected, all pending → pending, all ok with expiring → expiring, all ok → approved
- `doc_progress` in onboarding queue = `int(ok_count / 6 * 100)` (6 total doc types)
- `sla_status`: ok = <24h, warn = 24-48h, danger = >48h (based on driver.created_at)
- Wallet debit validates balance >= amount_minor before applying
- Driver approval auto-assigns seq_id as max(seq_id) + 1 if not already set
- All imports validated with Python: models OK, schemas OK, service OK, router OK (17 routes)
