# Module 11 — Customer Management · API Contract

> Single source of truth for Backend Agent and Frontend Agent.

---

## Enums

```
CustomerStatus  : active | suspended | banned | flagged
CustomerSegment : vip_corp | loyalist | frequent | new | regular
WalletDirection : credit | debit
```

---

## Models

### Customer (response shape)
```
id                : string (UUID)
name              : string
phone             : string  (E.164, e.g. +919820117542)
email             : string
city              : string | null
status            : CustomerStatus
computed_segment  : CustomerSegment   # auto from trips_count / ltv / joined_at
segment_override  : CustomerSegment | null   # admin-set; displayed if not null
segment           : CustomerSegment   # = segment_override ?? computed_segment (virtual, computed in service)
wallet_balance_minor : int            # current balance in paise/minor units (≥0)
trips_count       : int               # cached; 0 until bookings module populates
ltv_minor         : int               # lifetime value in minor units; 0 until populated
avg_fare_minor    : int | null
rating            : float | null      # avg rating given by customer to drivers
cancellation_rate : float             # 0.0–1.0
last_active_at    : string | null     # ISO datetime
flag_reason       : string | null     # present when status=flagged
joined_at         : string            # ISO datetime
created_at        : string
updated_at        : string
```

### WalletTransaction (response shape)
```
id           : string (UUID)
customer_id  : string
direction    : WalletDirection
amount_minor : int      # positive integer
reason       : string
audit_note   : string | null
notify_push  : bool
notify_sms   : bool
notify_email : bool
created_by   : string   # admin display name
created_at   : string
```

---

## Segment Thresholds (backend service logic)
```
vip_corp   → segment_override = 'vip_corp' only (manual)
loyalist   → trips_count >= 300
new        → joined_at within last 30 days
frequent   → trips_count >= 50
regular    → everything else
Priority   → vip_corp > loyalist > frequent > new > regular
```

---

## Endpoints

### GET /api/v1/customers
List customers with search + filters + pagination.

Query params:
```
search          : string | null   # matches name, phone, email, id prefix
segment         : CustomerSegment | null
status          : CustomerStatus | null
city            : string | null
include_inactive: bool = false    # if false, exclude banned; if true, include all statuses
page            : int = 1
per_page        : int = 25        # max 100
```

Response:
```json
{
  "items": [Customer, ...],
  "total": 42184,
  "page": 1,
  "per_page": 25,
  "segment_counts": {
    "all": 42184,
    "vip_corp": 22,
    "loyalist": 1420,
    "frequent": 6820,
    "new": 2184,
    "flagged": 184
  }
}
```

---

### POST /api/v1/customers
Create a new customer.

Request:
```json
{
  "name": "string (2–80 chars)",
  "phone": "string (E.164, unique)",
  "email": "string (RFC-5322, unique)",
  "city": "string | null",
  "segment_override": "CustomerSegment | null"
}
```

Response: `Customer`

---

### GET /api/v1/customers/{id}
Get full customer detail.

Response: `Customer`

---

### PATCH /api/v1/customers/{id}
Update editable fields.

Request (all optional):
```json
{
  "name": "string",
  "phone": "string",
  "email": "string",
  "city": "string | null",
  "segment_override": "CustomerSegment | null"
}
```

Response: `Customer`

---

### POST /api/v1/customers/{id}/suspend
Suspend the customer (blocks new bookings).

Request:
```json
{ "reason": "string" }
```

Response: `Customer`  (status = "suspended", flag_reason = reason)

---

### POST /api/v1/customers/{id}/reactivate
Reactivate a suspended/banned customer.

Request: `{}` (empty)

Response: `Customer`  (status = "active")

---

### POST /api/v1/customers/{id}/flag
Flag the customer for review.

Request:
```json
{ "reason": "string" }
```

Response: `Customer`  (status = "flagged", flag_reason = reason)

---

### POST /api/v1/customers/{id}/unflag
Remove flag from customer.

Request: `{}` (empty)

Response: `Customer`  (status = "active", flag_reason = null)

---

### POST /api/v1/customers/{id}/wallet/adjust
Adjust wallet balance (credit or debit).

Request:
```json
{
  "direction": "credit | debit",
  "amount_minor": 50000,
  "reason": "string (required)",
  "audit_note": "string | null",
  "notify_push": true,
  "notify_sms": false,
  "notify_email": false
}
```

Validation:
- `amount_minor` > 0
- debit: `amount_minor` ≤ current `wallet_balance_minor` (wallet cannot go negative)

Response:
```json
{
  "customer": Customer,
  "transaction": WalletTransaction
}
```

---

### GET /api/v1/customers/{id}/wallet/transactions
List wallet transaction history for a customer.

Query params:
```
page     : int = 1
per_page : int = 25
```

Response:
```json
{
  "items": [WalletTransaction, ...],
  "total": 42,
  "page": 1,
  "per_page": 25
}
```

---

## Stub endpoints consumed by detail-page tabs (future modules)

These do not exist yet. The frontend calls them and gracefully shows "Coming soon" on 404/network error.

```
GET /api/v1/bookings?customer_id={id}         # Module Bookings — Trips tab
GET /api/v1/payments?customer_id={id}         # Module Payments — Payments tab
GET /api/v1/support/tickets?customer_id={id}  # Module Support — Tickets tab
GET /api/v1/customers/{id}/addresses          # Future — Addresses tab
GET /api/v1/customers/{id}/audit              # Future — Audit tab
GET /api/v1/customers/{id}/risk               # Future — Risk tab
```

---

## Notes
- All monetary values are in **minor currency units** (paise for INR). Frontend divides by 100 for display.
- Auth guard on every endpoint: `_: AdminUser = Depends(get_current_admin_user)`
- All responses include `created_at` and `updated_at` ISO strings.
- Wallet debit that would produce negative balance must return `HTTP 422` with `{ "message": "Insufficient wallet balance" }`.
