# Module 15 — API Contract

All endpoints prefixed `/api/v1` with auth guard `_: AdminUser = Depends(get_current_admin_user)`.

---

## GET /api/v1/payments
List transactions with filters and pagination.

Query params:
- `page` (int, default 1)
- `page_size` (int, default 25, max 100)
- `search` (str | null) — txn id, customer name, booking ref, VPA
- `method` (str | null) — `upi|card|wallet|netbanking|corporate|cash`
- `status` (str | null) — comma-separated: `captured,pending,failed,refunded,part-refund,chargeback,invoiced`
- `gateway` (str | null) — gateway name filter
- `service` (str | null) — service/vehicle class filter
- `date_from` (str | null) — ISO date
- `date_to` (str | null) — ISO date

Response:
```json
{
  "items": [
    {
      "id": "TXN-9F3A21",
      "created_at": "2024-05-29T14:38:00Z",
      "customer_name": "Priya Iyer",
      "customer_id": "CUST-123",
      "booking_ref": "BK-RD-88421",
      "service": "Sedan",
      "method": "upi",
      "vpa": "priya@okhdfc",
      "gross_amount": 624,
      "gateway_fee": 7,
      "net_amount": 617,
      "status": "captured",
      "gateway_ref": "RZP-8821x4F",
      "currency": "INR"
    }
  ],
  "total": 38210,
  "page": 1,
  "page_size": 25,
  "kpis": {
    "gross_volume": 48200000,
    "net_revenue": 11800000,
    "refunds_total": 640000,
    "chargebacks_total": 84200,
    "success_rate": 96.4
  }
}
```

Status enum values: `captured | invoiced | pending | failed | refunded | part-refund | chargeback | initiated | authorized | disputed`

Method enum values: `upi | card | wallet | netbanking | corporate | cash`

---

## GET /api/v1/payments/{txn_id}
Get single transaction detail.

Response:
```json
{
  "id": "TXN-9F3A21",
  "created_at": "2024-05-29T14:38:00Z",
  "customer_name": "Priya Iyer",
  "customer_id": "CUST-123",
  "booking_ref": "BK-RD-88421",
  "service": "Sedan",
  "method": "upi",
  "vpa": "priya@okhdfc",
  "gross_amount": 624,
  "gateway_fee": 7,
  "net_amount": 617,
  "status": "captured",
  "gateway_ref": "RZP-8821x4F",
  "currency": "INR",
  "breakdown": [
    { "label": "Base fare", "amount": 624, "kind": "line" },
    { "label": "Distance · 8.2 km", "amount": 0, "kind": "line" },
    { "label": "Surge · 1.0×", "amount": 0, "kind": "line" },
    { "label": "Discount · WELCOME20", "amount": -124, "kind": "line" },
    { "label": "GST · 5%", "amount": 25, "kind": "line" },
    { "label": "Amount charged", "amount": 624, "kind": "total" },
    { "label": "Gateway fee · UPI", "amount": -7, "kind": "fee" },
    { "label": "Acme commission · 18%", "amount": -112, "kind": "fee" },
    { "label": "Net to driver", "amount": 505, "kind": "net" }
  ],
  "instrument": {
    "method": "upi",
    "display": "UPI · priya@okhdfc",
    "bank": "HDFC Bank",
    "sub_type": "collect",
    "verified": true,
    "risk_score": 12,
    "avs_status": "Pass",
    "three_ds": "N/A"
  },
  "timeline": [
    { "event": "Authorized", "timestamp": "14:38:02", "note": "UPI collect request approved · priya@okhdfc", "status": "ok" },
    { "event": "Captured", "timestamp": "14:38:04", "note": "Funds captured · gateway ref RZP-8821x", "status": "ok" },
    { "event": "Booking settled", "timestamp": "15:12:40", "note": "Driver payout queued · weekly cycle", "status": "ok" },
    { "event": "Settlement", "timestamp": "T+1 · pending", "note": "Expected in 30 May 11:00 batch", "status": "pending" }
  ],
  "refunds": [
    {
      "id": "REF-001",
      "amount": 200,
      "status": "pending",
      "reason": "Trip cancelled mid-route",
      "created_at": "2024-05-29T15:00:00Z"
    }
  ]
}
```

---

## POST /api/v1/payments/{txn_id}/refund
Issue a refund for a transaction.

Request:
```json
{
  "refund_type": "partial",
  "amount": 200,
  "reason": "Trip cancelled mid-route · service issue"
}
```

- `refund_type`: `"full" | "partial"`
- `amount`: int (required if partial, must be ≤ net_amount)
- `reason`: string (required)

Response:
```json
{
  "refund_id": "REF-001",
  "transaction_id": "TXN-9F3A21",
  "amount": 200,
  "status": "pending",
  "message": "Refund initiated successfully",
  "created_at": "2024-05-29T15:00:00Z"
}
```

---

## GET /api/v1/payments/reconciliation/summary
Get per-gateway reconciliation summary cards.

Response:
```json
{
  "cycle_date": "2024-05-29",
  "total_variance": 294000,
  "unmatched_count": 6,
  "gateways": [
    {
      "name": "UPI Switch",
      "ref": "NPCI · T+1",
      "expected_amount": 18400000,
      "settled_amount": 18400000,
      "variance": 0,
      "match_pct": 100.0,
      "status": "matched"
    },
    {
      "name": "CardNet",
      "ref": "Visa/MC · T+2",
      "expected_amount": 16200000,
      "settled_amount": 16116000,
      "variance": -84200,
      "match_pct": 99.5,
      "status": "variance"
    }
  ]
}
```

Gateway status enum: `matched | variance | pending`

---

## GET /api/v1/payments/reconciliation/batches
Get settlement batches list.

Query params:
- `page` (int, default 1)
- `page_size` (int, default 25)
- `hours` (int, default 48) — look-back window

Response:
```json
{
  "items": [
    {
      "id": "STL-29M-UPI-01",
      "gateway": "UPI Switch",
      "settlement_date": "2024-05-29T11:00:00Z",
      "transaction_count": 8420,
      "amount": 9210000,
      "matched_count": 8420,
      "status": "matched"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 25
}
```

Batch status enum: `matched | variance | pending`

---

## GET /api/v1/payments/reconciliation/unmatched
Get unmatched items needing resolution.

Response:
```json
{
  "items": [
    {
      "category": "Missing in bank file",
      "count": 4,
      "count_label": "4 txns",
      "amount": 62100,
      "note": "Captured at gateway, not in settlement",
      "tone": "danger"
    },
    {
      "category": "Amount mismatch",
      "count": 2,
      "count_label": "2 txns",
      "amount": 22100,
      "note": "Settled less gateway commission",
      "tone": "warn"
    }
  ]
}
```

Tone enum: `danger | warn | pending`
