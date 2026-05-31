# API Contract — Modules 09 & 10 (Air Operators, Aircraft & Crew)

## Entities

### Operator
```
id: str (UUID)
name: str
company_registration_no: str | None
hq_city: str | None
cert_type: str | None          # e.g. "NSOP"
status: enum                   # pending | review | approved | active | paused | deactivated
commission_pct: float | None   # overrides platform default; null = use platform default
payout_account_ref: str | None # masked when returned
site_visit_status: str | None  # scheduled | done | waived
insurance_expiry: date | None
cert_expiry: date | None
rejection_reason: str | None
notes: str | None
created_at: datetime
updated_at: datetime
```

### OperatorDocument
```
id: str (UUID)
operator_id: str
doc_type: enum   # company_registration | nsop_cert | insurance | other
file_url: str
expires_at: date | None
status: enum     # pending | approved | rejected | expired
review_notes: str | None
created_at: datetime
```

### Aircraft
```
id: str (UUID)
operator_id: str
aircraft_type_id: str | None   # FK → catalog aircraft_types
registration_mark: str         # unique, e.g. "VT-BSE"
seat_capacity: int
mtow_kg: int | None
range_nm: int | None
total_hours: int | None
status: enum                   # ready | maintenance | grounded | pending_review
airworthiness_status: str      # ok | expiring | expired
airworthiness_expiry: date | None
airworthiness_doc_url: str | None
maintenance_windows: JSON | None   # [{starts_at, ends_at, notes}]
notes: str | None
created_at: datetime
updated_at: datetime
```

### Pilot
```
id: str (UUID)
operator_id: str
name: str
license_no: str | None
license_type: str | None   # CPL | ATPL | PPL
type_ratings: JSON | None  # [str]  — aircraft type names they're rated for
medical_expiry: date | None
status: enum               # active | grounded | pending_review | inactive
notes: str | None
created_at: datetime
updated_at: datetime
```

---

## Endpoints

### Operators

```
GET /api/v1/operators
  Query: status (str, optional), search (str, optional), page (int, default 1), page_size (int, default 20)
  Response: { items: Operator[], total: int }

POST /api/v1/operators
  Request: { name, company_registration_no?, hq_city?, cert_type?, notes? }
  Response: Operator

GET /api/v1/operators/{id}
  Response: Operator + { fleet_count: int, pilot_count: int, docs: OperatorDocument[] }

PATCH /api/v1/operators/{id}
  Request: Partial<{ name, company_registration_no, hq_city, cert_type, insurance_expiry, cert_expiry, notes, payout_account_ref }>
  Response: Operator

POST /api/v1/operators/{id}/approve
  Response: Operator

POST /api/v1/operators/{id}/reject
  Request: { reason: str }
  Response: Operator

POST /api/v1/operators/{id}/pause
  Request: { reason?: str }
  Response: Operator

POST /api/v1/operators/{id}/reactivate
  Response: Operator

POST /api/v1/operators/{id}/commission
  Request: { commission_pct: float }
  Response: Operator

GET /api/v1/operators/{id}/performance
  Response: { otp_pct: float, load_factor_pct: float, booking_count_mtd: int,
              cancellation_rate_pct: float, payouts_mtd_amount: float }

GET /api/v1/operators/{id}/documents
  Response: OperatorDocument[]

POST /api/v1/operators/{id}/documents
  Request: { doc_type, file_url, expires_at? }
  Response: OperatorDocument

PATCH /api/v1/operators/{id}/documents/{doc_id}
  Request: { status, review_notes? }
  Response: OperatorDocument
```

### Aircraft

```
GET /api/v1/aircraft
  Query: operator_id (str, optional), status (str, optional), search (str, optional),
         page (int, default 1), page_size (int, default 20)
  Response: { items: Aircraft[], total: int }

POST /api/v1/aircraft
  Request: { operator_id, registration_mark, seat_capacity, aircraft_type_id?,
             mtow_kg?, range_nm?, airworthiness_expiry?, airworthiness_doc_url?, notes? }
  Response: Aircraft

GET /api/v1/aircraft/{id}
  Response: Aircraft

PATCH /api/v1/aircraft/{id}
  Request: Partial<{ registration_mark, seat_capacity, mtow_kg, range_nm,
                     airworthiness_expiry, airworthiness_doc_url, maintenance_windows,
                     total_hours, notes }>
  Response: Aircraft

POST /api/v1/aircraft/{id}/approve
  Response: Aircraft  (status: ready)

POST /api/v1/aircraft/{id}/ground
  Request: { reason: str }
  Response: Aircraft  (status: grounded)

POST /api/v1/aircraft/{id}/maintenance
  Request: { starts_at: datetime, ends_at: datetime, notes?: str }
  Response: Aircraft  (status: maintenance)
```

### Pilots

```
GET /api/v1/pilots
  Query: operator_id (str, optional), status (str, optional), search (str, optional),
         page (int, default 1), page_size (int, default 20)
  Response: { items: Pilot[], total: int }

POST /api/v1/pilots
  Request: { operator_id, name, license_no?, license_type?, type_ratings?, medical_expiry?, notes? }
  Response: Pilot

GET /api/v1/pilots/{id}
  Response: Pilot

PATCH /api/v1/pilots/{id}
  Request: Partial<{ name, license_no, license_type, type_ratings, medical_expiry, notes }>
  Response: Pilot

POST /api/v1/pilots/{id}/approve
  Response: Pilot  (status: active)

POST /api/v1/pilots/{id}/ground
  Request: { reason: str }
  Response: Pilot  (status: grounded)
```

---

## Status Enums

**Operator status:** `pending` → `review` → `approved` → `active` → `paused` / `deactivated`
- `pending`: just submitted, awaiting review start
- `review`: admin has opened review
- `approved`: all docs/certs valid, not yet set live
- `active`: live, can publish inventory
- `paused`: inventory hidden, existing flights proceed
- `deactivated`: permanently off

**Aircraft status:** `pending_review` | `ready` | `maintenance` | `grounded`

**Airworthiness status:** `ok` | `expiring` (within 30d) | `expired`

**Pilot status:** `pending_review` | `active` | `grounded` | `inactive`

**OperatorDocument status:** `pending` | `approved` | `rejected` | `expired`

---

## Notes for backend agent

- All endpoints require: `_: AdminUser = Depends(get_current_admin_user)`
- `from __future__ import annotations` on every new file
- Do NOT use `Optional[X]` — use `X | None` with __future__ annotations
- Operator performance endpoint returns stub data (no bookings DB yet); use `{"otp_pct": 0, "load_factor_pct": 0, ...}`
- airworthiness_status is a computed property or derived at query time based on expiry date: expired if past, expiring if within 30 days, ok otherwise — store as column that can also be set manually on grounding
- Use `UUIDPrimaryKeyMixin` from `app.models.base` for new models
- Use `UTCDateTime()` from `app.models.base` for datetime columns
- Migration: `alembic revision --autogenerate -m "add_operators_aircraft_pilots"` — DO NOT run it, just create it

## Notes for frontend agent

- `import type { T }` for all interfaces (verbatimModuleSyntax)
- Every page uses `<Shell activeId="operators" ...>` 
- Check Sidebar for exact activeId — search for `operators` or `air` in the sidebar nav config
- useIsMobile() + useIsTablet() on every page
- Tables: `<div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>`
- ConfirmDialog: `open`, `title`, `description`, `variant="danger"`, `confirmLabel`, `onConfirm`, `onCancel`
- Status badges: `active` → `.badge.ok`, `paused`/`grounded` → `.badge.warn`, `deactivated`/`expired` → `.badge` (neutral), `pending`/`review` → `.badge.info`
