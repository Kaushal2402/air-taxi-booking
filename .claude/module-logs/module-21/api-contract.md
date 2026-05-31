# Module 21 — API Contract
All endpoints under `/api/v1/settings`.
Every endpoint requires `_: AdminUser = Depends(get_current_admin_user)`.

---

## Platform Settings

### GET /api/v1/settings
Response:
```json
{
  "legal_entity": "Acme Mobility Pvt Ltd",
  "gstin": "29ABCDE1234F1Z5",
  "primary_region": "India",
  "base_currency": "INR",
  "timezone": "Asia/Kolkata",
  "fiscal_year_start": "April",
  "settlement_cycle": "T+1",
  "driver_payout_day": "Monday",
  "surge_ceiling": 2.0,
  "last_edited_at": "2026-05-28T10:00:00",
  "last_edited_by": "admin@example.com"
}
```

### PATCH /api/v1/settings
Request: partial fields from above.
Response: same as GET.

---

## Platform Toggles

### GET /api/v1/settings/toggles
Response:
```json
[
  {
    "key": "guest_checkout",
    "name": "Allow guest checkout",
    "description": "Book without an account · OTP at confirm",
    "enabled": false
  },
  {
    "key": "cash_payments",
    "name": "Cash payments",
    "description": "Accept cash for road trips (not air)",
    "enabled": true
  },
  {
    "key": "scheduled_rides",
    "name": "Scheduled rides",
    "description": "Book up to 7 days ahead",
    "enabled": true
  },
  {
    "key": "in_app_tipping",
    "name": "In-app tipping",
    "description": "Riders can tip drivers post-trip",
    "enabled": true
  },
  {
    "key": "carbon_offset",
    "name": "Carbon offset",
    "description": "Optional ₹5 offset per trip",
    "enabled": false
  }
]
```

### PATCH /api/v1/settings/toggles/{key}
Request: `{ "enabled": true }`
Response: single toggle object (same shape as array item above).

---

## Feature Flags

### GET /api/v1/settings/flags
Query params:
- `environment` string | null — `prod` | `staging`

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "key": "new-dispatch-engine",
      "name": "New dispatch engine v3",
      "description": "Graph-based matching replacing the legacy nearest-driver loop.",
      "environment": "prod",
      "rollout_pct": 35,
      "targeting": "BLR, MUM · gradual",
      "owner": "Ops",
      "enabled": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 7
}
```

### POST /api/v1/settings/flags
Request:
```json
{
  "key": "my-flag",
  "name": "My Feature",
  "description": "optional",
  "environment": "prod",
  "rollout_pct": 0,
  "targeting": "All users",
  "owner": "Ops"
}
```
Response: FeatureFlag object (status 201)

### PATCH /api/v1/settings/flags/{id}
Request: partial — any of `name`, `description`, `environment`, `rollout_pct`, `targeting`, `owner`, `enabled`
Response: updated FeatureFlag object

---

## Kill Switches

### GET /api/v1/settings/kill-switches
Response:
```json
[
  { "key": "new_bookings",       "name": "New bookings",       "description": "Stop accepting all new ride requests",  "enabled": true,  "tone": "danger" },
  { "key": "surge_pricing",      "name": "Surge pricing",      "description": "Force surge to 1.0× everywhere",         "enabled": true,  "tone": "warn"   },
  { "key": "promotions_engine",  "name": "Promotions engine",  "description": "Disable all promo redemptions",          "enabled": false, "tone": "warn"   },
  { "key": "air_booking",        "name": "Heli / air booking", "description": "Pause air reservations",                "enabled": true,  "tone": "danger" },
  { "key": "driver_onboarding",  "name": "Driver onboarding",  "description": "Pause new driver signups",              "enabled": true,  "tone": "warn"   }
]
```
Note: `enabled=true` means the feature is **running** (not killed). Kill switch "activated" = `enabled=false`.

### PATCH /api/v1/settings/kill-switches/{key}
Request: `{ "enabled": false }`
Response: single kill switch object.

---

## Regional Status

### GET /api/v1/settings/regions
Response:
```json
[
  { "id": "uuid", "name": "Bengaluru", "service_type": "road", "status": "operational", "note": "" },
  { "id": "uuid", "name": "Mumbai",    "service_type": "road", "status": "operational", "note": "" },
  { "id": "uuid", "name": "Delhi NCR", "service_type": "road", "status": "operational", "note": "" },
  { "id": "uuid", "name": "Hyderabad", "service_type": "road", "status": "degraded",     "note": "weather" },
  { "id": "uuid", "name": "Air · all", "service_type": "air",  "status": "operational", "note": "" },
  { "id": "uuid", "name": "Pune (WL)", "service_type": "road", "status": "maintenance", "note": "config migration" }
]
```

`status` enum: `operational` | `degraded` | `maintenance`

### PATCH /api/v1/settings/regions/{id}
Request: `{ "status": "maintenance", "note": "Config migration" }`
Response: updated region object.

---

## Maintenance Windows

### GET /api/v1/settings/maintenance-windows
Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "region_name": "Pune (WL)",
      "description": "Config migration",
      "starts_at": "2026-05-30T20:30:00",
      "ends_at": "2026-05-30T22:00:00",
      "created_at": "..."
    }
  ]
}
```

### POST /api/v1/settings/maintenance-windows
Request:
```json
{
  "region_name": "Pune (WL)",
  "description": "Config migration",
  "starts_at": "2026-05-30T20:30:00",
  "ends_at": "2026-05-30T22:00:00"
}
```
Response: maintenance window object (status 201)

### DELETE /api/v1/settings/maintenance-windows/{id}
Response: `{ "message": "Deleted" }`

---

## Summary table

| Method | Path | Description |
|---|---|---|
| GET | /api/v1/settings | Get platform settings |
| PATCH | /api/v1/settings | Update platform settings |
| GET | /api/v1/settings/toggles | List platform toggles |
| PATCH | /api/v1/settings/toggles/{key} | Toggle a platform feature |
| GET | /api/v1/settings/flags | List feature flags |
| POST | /api/v1/settings/flags | Create feature flag |
| PATCH | /api/v1/settings/flags/{id} | Update feature flag |
| GET | /api/v1/settings/kill-switches | List kill switches |
| PATCH | /api/v1/settings/kill-switches/{key} | Toggle kill switch |
| GET | /api/v1/settings/regions | List regional status |
| PATCH | /api/v1/settings/regions/{id} | Update region status |
| GET | /api/v1/settings/maintenance-windows | List maintenance windows |
| POST | /api/v1/settings/maintenance-windows | Create maintenance window |
| DELETE | /api/v1/settings/maintenance-windows/{id} | Delete maintenance window |
