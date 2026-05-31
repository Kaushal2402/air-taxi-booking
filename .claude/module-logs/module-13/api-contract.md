# Module 13 — API Contract

All endpoints are under `/api/v1/pricing`.
Every endpoint requires `_: AdminUser = Depends(get_current_admin_user)`.

---

## Road Fare Rules

### GET /api/v1/pricing/road-rules
Query params:
- `search` string | null — filter by zone name or vehicle class name
- `status` string | null — `live` | `draft` | `past`
- `vehicle_class_id` uuid | null
- `zone_id` uuid | null
- `page` int (default 1)
- `per_page` int (default 25, max 100)

Response:
```json
{
  "items": [RoadRuleListItem],
  "total": int,
  "page": int,
  "per_page": int
}
```

RoadRuleListItem:
```json
{
  "id": "uuid",
  "rule_code": "PR-BLR-SXL-12",
  "zone_id": "uuid",
  "zone_name": "BLR · 12 zones",
  "vehicle_class_id": "uuid",
  "vehicle_class_name": "Sedan XL",
  "base_fare": 100.0,
  "per_km": 18.0,
  "per_min": 2.0,
  "min_fare": 120.0,
  "surge_cap": 1.8,
  "status": "live",
  "version": 12,
  "effective_from": "2026-04-14T00:00:00",
  "effective_to": null,
  "published_at": "2026-04-14T00:00:00",
  "created_at": "...",
  "updated_at": "..."
}
```

---

### POST /api/v1/pricing/road-rules
Creates a new draft rule. `status` is always set to `draft` server-side.

Request:
```json
{
  "zone_id": "uuid",
  "vehicle_class_id": "uuid",
  "effective_from": "2026-05-01T00:00:00",
  "effective_to": null,
  "base_fare": 100.0,
  "per_km": 18.0,
  "per_min": 2.0,
  "min_fare": 120.0,
  "free_km": 0,
  "free_min": 5,
  "waiting_per_min": 3.0,
  "cancel_fee": 50.0,
  "surge_cap": 1.8,
  "modifiers": [
    { "name": "Peak · morning", "window_start": "07:30", "window_end": "10:00", "type": "pct", "value": 15.0 },
    { "name": "Peak · evening", "window_start": "17:00", "window_end": "20:30", "type": "pct", "value": 15.0 },
    { "name": "Night",          "window_start": "23:00", "window_end": "05:00", "type": "pct", "value": 25.0 },
    { "name": "Airport surcharge", "window_start": null,  "window_end": null,   "type": "flat", "value": 120.0 }
  ]
}
```

Response: full RoadRule object (same as list item + all fields above)

---

### GET /api/v1/pricing/road-rules/{id}
Response: full RoadRule object

---

### PATCH /api/v1/pricing/road-rules/{id}
Only `draft` rules can be updated (server enforces).
Request: Partial of POST body (all fields optional).
Response: updated RoadRule

---

### POST /api/v1/pricing/road-rules/{id}/publish
Publishes a draft rule. Server-side logic:
1. Validates the rule is in `draft` status.
2. Finds any currently `live` rule for the same zone + vehicle_class, sets its status to `past`.
3. Sets this rule's status to `live`, sets `published_at = now()`, increments version to
   (max version for this zone+class) + 1.
Response: updated RoadRule (now live)

---

### DELETE /api/v1/pricing/road-rules/{id}
Only `draft` rules can be deleted.
Response: `{ "message": "Rule deleted" }`

---

## Air Fare Rules

### GET /api/v1/pricing/air-rules
Query params:
- `search` string | null
- `status` string | null — `live` | `draft` | `past`
- `category` string | null — `shuttle` | `on-demand` | `charter` | `vip`
- `page` int (default 1)
- `per_page` int (default 25, max 100)

Response: `{ items: [AirRule], total, page, per_page }`

AirRule:
```json
{
  "id": "uuid",
  "rule_code": "PR-AIR-BLR-MYS-S",
  "route_name": "BLR-PAD → MYS-PAD",
  "aircraft_type": "Bell 407",
  "category": "shuttle",
  "per_seat_base": 68500.0,
  "min_pax": 2,
  "hourly_rate": null,
  "baggage_per_kg": 40.0,
  "excess_baggage_cap": 20,
  "positioning_charge": null,
  "night_halt_charge": 60000.0,
  "fuel_surcharge_pct": 4.0,
  "tax_gst_pct": 5.0,
  "status": "live",
  "version": 6,
  "effective_from": "...",
  "effective_to": null,
  "published_at": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

---

### POST /api/v1/pricing/air-rules
Request (all fields):
```json
{
  "route_name": "string",
  "aircraft_type": "string",
  "category": "shuttle|on-demand|charter|vip",
  "per_seat_base": 68500.0,
  "min_pax": 2,
  "hourly_rate": null,
  "baggage_per_kg": 40.0,
  "excess_baggage_cap": 20,
  "positioning_charge": null,
  "night_halt_charge": 60000.0,
  "fuel_surcharge_pct": 4.0,
  "tax_gst_pct": 5.0,
  "effective_from": "2026-05-01T00:00:00",
  "effective_to": null
}
```
Response: AirRule

---

### GET /api/v1/pricing/air-rules/{id}
Response: AirRule

---

### PATCH /api/v1/pricing/air-rules/{id}
Only draft rules. Request: Partial of POST body. Response: AirRule.

---

### POST /api/v1/pricing/air-rules/{id}/publish
Same logic as road rules publish (same route+category).
Response: AirRule (now live)

---

### DELETE /api/v1/pricing/air-rules/{id}
Only draft. Response: `{ "message": "Air rule deleted" }`

---

## Taxes

### GET /api/v1/pricing/taxes
Query params:
- `active` bool | null
- `page` int (default 1)
- `per_page` int (default 50, max 200)

Response:
```json
{
  "items": [TaxRule],
  "total": int,
  "page": int,
  "per_page": int
}
```

TaxRule:
```json
{
  "id": "uuid",
  "name": "GST · Ride hailing",
  "hsn_code": "9964",
  "rate": 5.0,
  "jurisdiction": "IN · Central",
  "inclusive": false,
  "in_use": "38,210 trips this month",
  "active": true,
  "created_at": "...",
  "updated_at": "..."
}
```

---

### POST /api/v1/pricing/taxes
Request:
```json
{
  "name": "string",
  "hsn_code": "string",
  "rate": 5.0,
  "jurisdiction": "string",
  "inclusive": false,
  "active": true
}
```
Response: TaxRule

---

### PATCH /api/v1/pricing/taxes/{id}
Request: Partial of above. Response: TaxRule.

---

### DELETE /api/v1/pricing/taxes/{id}
Response: `{ "message": "Tax rule deleted" }`

---

## Fare Simulator

### POST /api/v1/pricing/simulate
Request:
```json
{
  "zone_id": "uuid",
  "vehicle_class_id": "uuid",
  "distance_km": 38.4,
  "duration_min": 34.0,
  "waiting_min": 3.0,
  "toll": 85.0,
  "time_of_day": "17:42",
  "day_type": "weekday",
  "demand_supply_ratio": 1.3,
  "promo_discount": 0.0,
  "rule_ids": ["uuid-live", "uuid-draft"]
}
```

- `rule_ids`: optional list of specific rule IDs to compare. If omitted, backend auto-selects
  the current `live` rule for the given zone + vehicle_class (and draft if it exists).
- `day_type`: `weekday` | `weekend` | `holiday`

Response:
```json
{
  "results": [
    {
      "rule_id": "uuid",
      "rule_code": "PR-BLR-SXL-12",
      "version": 12,
      "status": "live",
      "fare_total": 1276.0,
      "breakdown": [
        { "component": "Base fare",        "rule_ref": "base",            "inputs": "—",           "amount": 100.0 },
        { "component": "Distance · 38.4km","rule_ref": "₹18/km",          "inputs": "38.4 × 18",   "amount": 691.2 },
        { "component": "Time · 34min",     "rule_ref": "₹2/min",          "inputs": "34 × 2",      "amount": 68.0 },
        { "component": "Waiting",          "rule_ref": "₹3/min after 5",  "inputs": "0 × 3",       "amount": 0.0 },
        { "component": "Evening peak",     "rule_ref": "+15% modifier",   "inputs": "17:42 match", "amount": 128.9 },
        { "component": "Surge · 1.3×",    "rule_ref": "zone tier · capped at 1.8×", "inputs": "1.3× on base", "amount": 257.4 },
        { "component": "Toll",             "rule_ref": "pass-through",    "inputs": "provided",    "amount": 85.0 },
        { "component": "Promo",            "rule_ref": "discount",        "inputs": "provided",    "amount": -150.0 },
        { "component": "GST 5%",           "rule_ref": "tax",             "inputs": "on taxable",  "amount": 60.0 }
      ]
    }
  ]
}
```

Note: multiple objects in `results[]` when comparing multiple rule versions.

---

## Summary of all routes

| Method | Path | Description |
|---|---|---|
| GET | /api/v1/pricing/road-rules | List road rules |
| POST | /api/v1/pricing/road-rules | Create draft road rule |
| GET | /api/v1/pricing/road-rules/{id} | Get road rule detail |
| PATCH | /api/v1/pricing/road-rules/{id} | Update draft road rule |
| POST | /api/v1/pricing/road-rules/{id}/publish | Publish draft → live |
| DELETE | /api/v1/pricing/road-rules/{id} | Delete draft |
| GET | /api/v1/pricing/air-rules | List air rules |
| POST | /api/v1/pricing/air-rules | Create draft air rule |
| GET | /api/v1/pricing/air-rules/{id} | Get air rule detail |
| PATCH | /api/v1/pricing/air-rules/{id} | Update draft air rule |
| POST | /api/v1/pricing/air-rules/{id}/publish | Publish draft → live |
| DELETE | /api/v1/pricing/air-rules/{id} | Delete draft |
| GET | /api/v1/pricing/taxes | List taxes |
| POST | /api/v1/pricing/taxes | Create tax rule |
| PATCH | /api/v1/pricing/taxes/{id} | Update tax rule |
| DELETE | /api/v1/pricing/taxes/{id} | Delete tax rule |
| POST | /api/v1/pricing/simulate | Run fare simulation |
