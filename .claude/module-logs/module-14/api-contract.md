# Module 14 — Promotions, Coupons & Referrals · API Contract

All routes prefixed `/api/v1`. Auth guard on every endpoint.

---

## GET /api/v1/promotions
List all promotions with filtering + pagination.

Query params:
- `page` (int, default 1)
- `page_size` (int, default 50)
- `search` (str, optional) — matches code
- `status` (str, optional) — `draft|active|paused|expired|depleted`

Response:
```json
{
  "items": [PromotionResponse],
  "total": 7,
  "page": 1,
  "pages": 1
}
```

---

## POST /api/v1/promotions
Create a new promotion (starts as `draft`).

Request:
```json
{
  "code": "WELCOME20",
  "type": "percent",
  "value": 20,
  "cap_minor": 15000,
  "min_trip_value_minor": 10000,
  "validity_from": "2026-04-01T00:00:00Z",
  "validity_to": "2026-06-30T23:59:59Z",
  "per_customer_limit": 1,
  "total_redemption_cap": 50000,
  "total_budget_minor": 50000000,
  "segment": "first_ride",
  "service_types": ["cab", "bike", "xl"],
  "zones": ["all"],
  "new_customers_only": true,
  "notes": ""
}
```

Response: `PromotionResponse` (201)

---

## GET /api/v1/promotions/{id}
Get single promotion detail.

Response: `PromotionResponse`

---

## PATCH /api/v1/promotions/{id}
Update a promotion (all fields optional, only allowed on draft/paused).

Request: Partial of create body (excluding `code`)

Response: `PromotionResponse`

---

## POST /api/v1/promotions/{id}/activate
Activate a draft or paused promotion.

Response: `PromotionResponse`

---

## POST /api/v1/promotions/{id}/pause
Pause an active promotion.

Response: `PromotionResponse`

---

## DELETE /api/v1/promotions/{id}
Delete a draft promotion only.

Response: `{ "message": "Promotion deleted." }`

---

## GET /api/v1/promotions/analytics
Redemption analytics across all promotions.

Query params:
- `days` (int, default 14) — rolling window

Response:
```json
{
  "total_redemptions": 23180,
  "total_budget_spent_minor": 620000000,
  "avg_discount_minor": 2700,
  "new_customers": 8420,
  "blended_cpa_minor": 8400,
  "daily_series": [
    { "date": "2026-05-17", "count": 820, "spent_minor": 2214000 }
  ],
  "by_promo": [
    { "code": "MONSOON50", "redemptions": 14210, "spent_minor": 236000000, "pct": 38 }
  ]
}
```

---

## GET /api/v1/referrals/program
Get the referral program configuration (singleton).

Response: `ReferralProgramResponse`

---

## PATCH /api/v1/referrals/program
Update referral program configuration.

Request (all optional):
```json
{
  "is_active": true,
  "referrer_reward_minor": 10000,
  "referee_reward_minor": 7500,
  "qualifying_event": "first_ride_complete",
  "per_referrer_monthly_cap_minor": 100000,
  "monthly_budget_minor": 40000000,
  "fraud_self_referral": true,
  "fraud_device_collusion": true,
  "fraud_velocity_limit": true,
  "fraud_payment_instrument": true,
  "fraud_manual_review_threshold_minor": 500000
}
```

Response: `ReferralProgramResponse`

---

## GET /api/v1/referrals/stats
Referral program performance stats for the last 30 days.

Response:
```json
{
  "referrals_sent": 4820,
  "converted": 1842,
  "conversion_rate_pct": 38.2,
  "reward_paid_minor": 284000000,
  "new_customers": 1842,
  "cpa_minor": 15400,
  "fraud_blocked": 14,
  "fraud_saved_minor": 420000,
  "top_referrers": [
    { "customer_id": "uuid", "name": "Priya Iyer", "converted": 12, "reward_minor": 100000, "at_cap": true }
  ]
}
```

---

## PromotionResponse schema
```ts
interface Promotion {
  id: string
  code: string
  type: 'flat' | 'percent'
  value: number                    // flat = minor units (paise); percent = 0–100 integer
  cap_minor: number | null         // max discount in minor units (percent type only)
  min_trip_value_minor: number | null
  validity_from: string            // ISO datetime
  validity_to: string              // ISO datetime
  per_customer_limit: number       // default 1
  total_redemption_cap: number | null
  total_budget_minor: number
  budget_spent_minor: number       // auto-tracked, read-only
  redemption_count: number         // read-only
  segment: string | null           // "first_ride" | "all" | "frequent" | "corporate" | "loyalist"
  service_types: string[]          // ["cab","bike","xl","airport","air"] or []
  zones: string[]                  // ["all"] or zone IDs
  new_customers_only: boolean
  notes: string | null
  status: 'draft' | 'active' | 'paused' | 'expired' | 'depleted'
  created_at: string
  updated_at: string
}
```

## ReferralProgramResponse schema
```ts
interface ReferralProgram {
  id: string
  is_active: boolean
  referrer_reward_minor: number    // e.g. 10000 = ₹100
  referee_reward_minor: number     // e.g. 7500 = ₹75
  qualifying_event: string         // "first_ride_complete"
  per_referrer_monthly_cap_minor: number
  monthly_budget_minor: number
  fraud_self_referral: boolean
  fraud_device_collusion: boolean
  fraud_velocity_limit: boolean
  fraud_payment_instrument: boolean
  fraud_manual_review_threshold_minor: number | null
  created_at: string
  updated_at: string
}
```

---

## Enums
- Promotion type: `flat` | `percent`
- Promotion status: `draft` | `active` | `paused` | `expired` | `depleted`
- Segment: `first_ride` | `all` | `frequent` | `corporate` | `loyalist` | `first_air_ride`
- Service types: `cab` | `bike` | `xl` | `airport` | `air` | `all`
- Qualifying event: `first_ride_complete`
