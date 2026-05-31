# Module 22 — API Contract

All endpoints under `/api/v1/audit`.
Every endpoint requires `_: AdminUser = Depends(get_current_admin_user)`.

---

## Audit Events

### GET /api/v1/audit/events
Paginated list of audit events, newest first.

Query params:
- `search` string | null — matches actor_name, action, target, ip
- `category` string | null — `Finance` | `Pricing` | `Security` | `Support` | `Growth` | `System` | `Catalog` | `Operations`
- `severity` string | null — `high` | `med` | `low`
- `actor_name` string | null — filter by actor display name
- `time_window` string | null — `1h` | `6h` | `24h` | `7d` | `30d` (default: `24h`)
- `page` int default 1
- `per_page` int default 25, max 100

Response:
```json
{
  "items": [AuditEventSummary],
  "total": int,
  "page": int,
  "per_page": int
}
```

AuditEventSummary:
```json
{
  "id": "uuid",
  "event_code": "EVT-9F4A21C8",
  "timestamp": "2026-05-29T14:42:08.412000",
  "actor_name": "Sana Reyes",
  "actor_role": "Super Admin",
  "action": "payout.approve",
  "target": "PR-W22-DRV · ₹38.4 L",
  "category": "Finance",
  "severity": "high",
  "source_ip": "103.21.x.x",
  "created_at": "..."
}
```

---

### GET /api/v1/audit/events/{id}
Full event detail including hash chain, surrounding events, and before/after diff.

Response: AuditEventDetail
```json
{
  "id": "uuid",
  "event_code": "EVT-9F4A21C8",
  "timestamp": "2026-05-29T14:42:08.412000",
  "actor_name": "Sana Reyes",
  "actor_role": "Super Admin",
  "action": "payout.approve",
  "target": "PR-W22-DRV",
  "category": "Finance",
  "severity": "high",
  "source_ip": "103.21.x.x",
  "session_id": "sess_8821x · MacBook · Chrome",
  "request_id": "req_9F4A21c8e2",
  "before_data": { "status": "pending_finance", ... },
  "after_data":  { "status": "approved", ... },
  "prev_hash": "0x8f21...a4c2",
  "this_hash": "0x9f4a...21c8",
  "next_hash": "0xb102...7e30",
  "surrounding_events": [
    {
      "id": "uuid",
      "timestamp": "2026-05-29T14:41:50",
      "action": "payout.review.open",
      "description": "Opened PR-W22-DRV",
      "is_current": false
    }
  ],
  "created_at": "..."
}
```

`next_hash` is fetched dynamically (the event where prev_hash = this event's this_hash), may be null if most recent.

`surrounding_events` = up to 5 events before + 3 after from the same session_id.

---

### POST /api/v1/audit/events/export
Triggers an export (returns a placeholder response for now — real file generation is a future enhancement).

Request:
```json
{
  "time_window": "24h",
  "category": null,
  "severity": null
}
```
Response: `{ "message": "Export queued — download link will be emailed." }`

---

## Audit Stats

### GET /api/v1/audit/stats
KPI stats for the Audit Stream hero strip.

Query params:
- `time_window` string default `24h`

Response:
```json
{
  "events_total": 4182,
  "admin_actions": 318,
  "high_severity": 41,
  "failed_logins": 9,
  "integrity_ok": true
}
```

---

## Security & Compliance

### GET /api/v1/audit/security/stats
KPIs for the Security & Compliance screen.

Response:
```json
{
  "anomalies_open": 2,
  "anomalies_7d": 6,
  "pii_exports_7d": 14,
  "mfa_coverage_pct": 94.0,
  "retention_policy": "7 yrs",
  "integrity_ok": true
}
```

---

### GET /api/v1/audit/security/chart
High-severity event count per day for the last 14 days.

Response:
```json
{
  "days": [
    { "date": "2026-05-16", "count": 12 },
    { "date": "2026-05-17", "count": 18 },
    ...
  ]
}
```

---

## Anomalies

### GET /api/v1/audit/anomalies
Query params:
- `status` string | null — `open` | `investigating` | `dismissed`

Response:
```json
{
  "items": [AuditAnomaly],
  "total": int
}
```

AuditAnomaly:
```json
{
  "id": "uuid",
  "title": "Off-hours export",
  "description": "Arjun Rao · 02:14 IST · PII revenue file",
  "severity": "high",
  "status": "open",
  "detected_at": "2026-05-29T02:14:00",
  "resolved_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

---

### POST /api/v1/audit/anomalies
Create a manual anomaly record (for future auto-detection integration point).

Request:
```json
{
  "title": "string",
  "description": "string",
  "severity": "high|med|low"
}
```
Response: AuditAnomaly

---

### POST /api/v1/audit/anomalies/{id}/dismiss
Response: AuditAnomaly (status=dismissed, resolved_at=now())

---

### POST /api/v1/audit/anomalies/{id}/investigate
Response: AuditAnomaly (status=investigating)

---

## Internal write function (NOT an HTTP endpoint)

`audit_service.log_event(db, actor_name, actor_role, action, target, category, severity, source_ip, session_id, request_id, before_data, after_data)` → called from existing endpoint files to record mutations.

SHA-256 chaining: `this_hash = SHA-256(prev_hash_hex + json.dumps({action, target, actor_name, timestamp}, sort_keys=True))`

---

## Summary table

| Method | Path | Description |
|---|---|---|
| GET | /api/v1/audit/events | List events (paginated, filtered) |
| GET | /api/v1/audit/events/{id} | Event detail + hash chain + surrounding |
| POST | /api/v1/audit/events/export | Export trigger |
| GET | /api/v1/audit/stats | KPI hero stats |
| GET | /api/v1/audit/security/stats | Security screen KPIs |
| GET | /api/v1/audit/security/chart | 14-day severity chart |
| GET | /api/v1/audit/anomalies | List anomalies |
| POST | /api/v1/audit/anomalies | Create anomaly |
| POST | /api/v1/audit/anomalies/{id}/dismiss | Dismiss anomaly |
| POST | /api/v1/audit/anomalies/{id}/investigate | Mark investigating |

---

## Audit wiring — endpoints to instrument

### backend/app/api/v1/endpoints/vehicles.py
Change `_: AdminUser` → `admin: AdminUser`, add `Request` param where needed.
After each call succeeds, call `await audit_service.log_event(...)`:

| Endpoint function | action | category | severity |
|---|---|---|---|
| `approve_vehicle` | `vehicle.approve` | Operations | high |
| `ground_vehicle` | `vehicle.ground` | Operations | high |
| `reactivate_vehicle` | `vehicle.reactivate` | Operations | med |
| `link_driver` | `vehicle.link_driver` | Operations | low |
| `unlink_driver` | `vehicle.unlink_driver` | Operations | low |
| `review_document` (approve/reject) | `vehicle.document.review` | Operations | med |
| `activate_vendor` | `vendor.activate` | Operations | high |
| `suspend_vendor` | `vendor.suspend` | Operations | high |

### backend/app/api/v1/endpoints/drivers.py
| Endpoint function | action | category | severity |
|---|---|---|---|
| `approve_driver` | `driver.approve` | Operations | high |
| `reject_driver` | `driver.reject` | Operations | high |
| `suspend_driver` | `driver.suspend` | Operations | high |
| `reactivate_driver` | `driver.reactivate` | Operations | med |
| `deactivate_driver` | `driver.deactivate` | Operations | high |
| `force_offline` | `driver.force_offline` | Operations | med |
| `review_document` | `driver.document.review` | Operations | med |
| `adjust_wallet` | `driver.wallet.adjust` | Finance | high |

### backend/app/api/v1/endpoints/customers.py
| Endpoint function | action | category | severity |
|---|---|---|---|
| `suspend_customer_endpoint` | `customer.suspend` | Support | high |
| `reactivate_customer_endpoint` | `customer.reactivate` | Support | med |
| `flag_customer_endpoint` | `customer.flag` | Support | med |
| `unflag_customer_endpoint` | `customer.unflag` | Support | med |
| `adjust_wallet_endpoint` | `customer.wallet.adjust` | Finance | high |

### backend/app/api/v1/endpoints/pricing.py
| Endpoint function | action | category | severity |
|---|---|---|---|
| `publish_road_rule` | `pricing.road.publish` | Pricing | high |
| `publish_air_rule` | `pricing.air.publish` | Pricing | high |
| `delete_road_rule` | `pricing.road.delete` | Pricing | med |
| `delete_air_rule` | `pricing.air.delete` | Pricing | med |
