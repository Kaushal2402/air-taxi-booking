# Module 7 — Driver Management API Contract

All endpoints under prefix `/api/v1/drivers`.
All endpoints require: `_: AdminUser = Depends(get_current_admin_user)`

---

## Enums

```
DriverStatus:   pending | in_review | approved | active | suspended | deactivated | rejected
OnlineStatus:   online | offline
KycStatus:      pending | approved | expiring | rejected
OnboardStage:   signup | docs | review | background | approved
DocType:        pan | license | rc | insurance | permit | photo
DocStatus:      pending | ok | rejected | expired
SlaStatus:      ok | warn | danger
WalletDirection: credit | debit
```

---

## Driver object (full response shape)

```json
{
  "id": "uuid",
  "seq_id": 12047,
  "driver_code": "D-12047",

  "name": "Ravi Mahesh",
  "phone": "+91 96114 28805",
  "email": "ravi.m@drivers.acmemobility.io",
  "city": "Bengaluru",
  "zone_code": "Z-N4",
  "vehicle_class": "Sedan",
  "vehicle_plate": "KA 05 MK 4271",

  "status": "active",
  "online_status": "online",
  "kyc_status": "approved",
  "stage": "approved",

  "rating": 4.92,
  "acceptance_rate": 94.0,
  "cancellation_rate": 2.1,
  "trips_count": 7184,
  "wallet_balance_minor": 1428400,

  "flag_reason": null,
  "joined_at": "2021-03-04T00:00:00Z",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Driver Document object

```json
{
  "id": "uuid",
  "driver_id": "uuid",
  "doc_type": "license",
  "status": "ok",
  "doc_number": "KA 5520210018421",
  "expiry_date": "2037-09-10",
  "review_note": "All fields match · clean registry hit.",
  "reviewed_by": "admin@acme.io",
  "reviewed_at": "2024-03-22T10:00:00Z",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Driver Wallet Transaction object

```json
{
  "id": "uuid",
  "driver_id": "uuid",
  "direction": "credit",
  "amount_minor": 184000,
  "reason": "Trip earnings adjustment",
  "audit_note": "Manual correction for trip T-8821",
  "created_by": "admin@acme.io",
  "created_at": "..."
}
```

---

## GET /api/v1/drivers

List all drivers (directory view).

Query params:
- `search` (str, optional) — name, phone, plate, driver ID
- `status` (str, optional) — filter by DriverStatus
- `online_status` (str, optional) — online | offline
- `vehicle_class` (str, optional)
- `zone_code` (str, optional)
- `kyc_status` (str, optional)
- `min_rating` (float, optional)
- `include_inactive` (bool, default false) — include deactivated
- `page` (int, default 1)
- `per_page` (int, default 25, max 100)

Response:
```json
{
  "items": [Driver, ...],
  "total": 1520,
  "page": 1,
  "per_page": 25,
  "status_counts": {
    "all": 1520,
    "online": 1184,
    "in_review": 12,
    "suspended": 4,
    "docs_expiring": 38
  }
}
```

---

## GET /api/v1/drivers/onboarding

Onboarding queue — drivers with status pending or in_review.

Query params:
- `search` (str, optional)
- `stage` (str, optional) — OnboardStage filter
- `vehicle_class` (str, optional)
- `zone_code` (str, optional)
- `missing_doc` (str, optional) — DocType to filter on

Response:
```json
{
  "items": [
    {
      ...Driver,
      "documents": [DriverDocument, ...],
      "doc_progress": 83,
      "sla_status": "ok",
      "submitted_at": "2025-05-28T10:00:00Z"
    }
  ],
  "total": 8,
  "stats": {
    "in_queue": 8,
    "ready_to_approve": 3,
    "missing_docs": 4,
    "sla_breach_risk": 2
  }
}
```

---

## GET /api/v1/drivers/{id}

Get driver by ID or driver_code.

Response: Driver object (full)

---

## PATCH /api/v1/drivers/{id}

Update driver profile fields.

Request (all optional):
```json
{
  "name": "string",
  "phone": "string",
  "email": "string",
  "city": "string",
  "zone_code": "string",
  "vehicle_class": "string",
  "vehicle_plate": "string"
}
```

Response: Driver object

---

## POST /api/v1/drivers/{id}/approve

Approve driver (status → active, kyc_status → approved, stage → approved).
Requires all documents to have status ok (or enforced grace-period policy).

Request: `{}` (no body required)

Response: Driver object

---

## POST /api/v1/drivers/{id}/reject

Reject driver application.

Request:
```json
{ "reason": "string" }
```

Response: Driver object

---

## POST /api/v1/drivers/{id}/suspend

Suspend driver. Force-offlines the driver.

Request:
```json
{ "reason": "string" }
```

Response: Driver object

---

## POST /api/v1/drivers/{id}/reactivate

Reactivate a suspended driver back to active.

Request: `{}` (no body)

Response: Driver object

---

## POST /api/v1/drivers/{id}/deactivate

Permanently deactivate. Irreversible via this endpoint.

Request:
```json
{ "reason": "string" }
```

Response: Driver object

---

## POST /api/v1/drivers/{id}/force-offline

Force driver to offline status without changing account status.

Request: `{}` (no body)

Response: Driver object

---

## GET /api/v1/drivers/{id}/documents

Get all documents for a driver.

Response:
```json
{ "items": [DriverDocument, ...] }
```

---

## POST /api/v1/drivers/{id}/documents

Create/upload a document record for a driver.

Request:
```json
{
  "doc_type": "license",
  "doc_number": "KA 5520210018421",
  "expiry_date": "2037-09-10"
}
```

Response: DriverDocument object (status = pending)

---

## PATCH /api/v1/drivers/{id}/documents/{doc_id}

Review a driver document.

Request:
```json
{
  "action": "approve | reject | request_reupload",
  "expiry_date": "2037-09-10",
  "review_note": "All fields match."
}
```

Response: DriverDocument object

---

## GET /api/v1/drivers/{id}/trips

Stub — returns empty list (trips module not yet built).

Response:
```json
{ "items": [], "total": 0, "message": "Trips will be available after Module 4 integration." }
```

---

## GET /api/v1/drivers/{id}/earnings

Stub — returns empty structure.

Response:
```json
{ "items": [], "total": 0, "message": "Earnings will be available after Module 16 integration." }
```

---

## GET /api/v1/drivers/{id}/wallet/transactions

List wallet transactions for a driver.

Query params: `page` (int, default 1), `per_page` (int, default 25)

Response:
```json
{
  "items": [DriverWalletTransaction, ...],
  "total": 120,
  "page": 1,
  "per_page": 25
}
```

---

## POST /api/v1/drivers/{id}/wallet/adjust

Adjust driver wallet balance.

Request:
```json
{
  "direction": "credit | debit",
  "amount_minor": 50000,
  "reason": "Manual correction for trip T-8821",
  "audit_note": "Optional additional note"
}
```

Response:
```json
{
  "driver": Driver,
  "transaction": DriverWalletTransaction
}
```
