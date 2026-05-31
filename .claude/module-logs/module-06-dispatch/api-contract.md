# Module 06 — Dispatch API Contract

Base prefix: `/api/v1`
Auth: every endpoint requires `Authorization: Bearer <token>` (AdminUser session)

---

## GET /api/v1/dispatch/queue

Returns live request queue — bookings with status="Requested", sorted by age descending (oldest first).

Query params:
- `zone_id` (str, optional) — filter by zone
- `sla_filter` (str, optional) — "all" | "warn" | "danger" (warn=age>30s, danger=age>60s)
- `limit` (int, default=50)

Response:
```json
[
  {
    "id": "uuid",
    "booking_ref": "REQ-44210",
    "customer_name": "Aarav Kapoor",
    "vehicle_class": "XL",
    "pickup_address": "Indiranagar · 100 Ft Rd",
    "pickup_lat": 12.9716,
    "pickup_lng": 77.5946,
    "drop_address": "KIAL T2",
    "drop_lat": 13.1986,
    "drop_lng": 77.7066,
    "fare_estimate_minor": 124000,
    "fare_display": "₹1,240",
    "age_seconds": 14,
    "dispatch_attempts": 0,
    "current_radius_km": 1.5,
    "zone_id": "Z-N4",
    "zone_name": "Indiranagar",
    "eligible_count": 12,
    "sla_status": "ok",
    "exception_type": null,
    "created_at": "2024-01-01T10:00:00Z"
  }
]
```

`sla_status`: "ok" (age<30s) | "warn" (30-60s) | "danger" (>60s)
`exception_type`: null | "no-driver" | "rejected" | "stuck-pickup" | "sla-breach" | "route-blocked"

---

## GET /api/v1/dispatch/queue/stats

Returns aggregate stats for the dispatch console header.

Response:
```json
{
  "total_in_queue": 247,
  "exceptions_count": 2,
  "online_drivers_count": 1184,
  "avg_pickup_eta_seconds": 252,
  "auto_dispatch_rate": 94.6,
  "stuck_over_60s": 11,
  "no_driver_count": 2
}
```

---

## GET /api/v1/dispatch/requests/{booking_id}/eligible-drivers

Returns ranked list of eligible drivers for a specific booking request.

Path param: `booking_id` (UUID)

Response:
```json
{
  "booking_ref": "REQ-44210",
  "total_eligible": 12,
  "current_radius_km": 1.5,
  "ranking_weights": {
    "distance": 60,
    "rating": 25,
    "acceptance": 15
  },
  "drivers": [
    {
      "rank": 1,
      "driver_id": "uuid",
      "name": "Ravi Mahesh",
      "vehicle_plate": "KA 05 MK 4271",
      "distance_km": 0.6,
      "eta_minutes": 3,
      "rating": 4.92,
      "acceptance_rate": 94.0,
      "recommended": true,
      "current_lat": 12.9720,
      "current_lng": 77.5950
    }
  ]
}
```

Eligibility criteria: `online_status='online'`, `status='active'`, `vehicle_class` matches booking `vehicle_class`, within `current_radius_km` of pickup (haversine).
Ranking: weighted score = (1/distance_km)*60 + rating*25 + acceptance_rate*15 (normalized).

---

## POST /api/v1/dispatch/requests/{booking_id}/assign

Manually assign a driver to a booking.

Path param: `booking_id` (UUID)

Request:
```json
{
  "driver_id": "uuid",
  "reason": "Manual dispatch by admin"
}
```

Response:
```json
{
  "booking_id": "uuid",
  "booking_ref": "REQ-44210",
  "driver_id": "uuid",
  "driver_name": "Ravi Mahesh",
  "message": "Driver assigned successfully"
}
```

Validation: driver must still be eligible (online + active + class match + within 2× current radius). Updates booking `status='Accepted'`, `driver_id`, increments `dispatch_attempts`. Returns 409 if booking already assigned (concurrency-safe).

---

## POST /api/v1/dispatch/requests/{booking_id}/expand-radius

Increase search radius for a pending booking by 1 km.

Path param: `booking_id` (UUID)

Request: `{}` (empty body)

Response:
```json
{
  "booking_id": "uuid",
  "booking_ref": "REQ-44210",
  "old_radius_km": 1.5,
  "new_radius_km": 2.5,
  "new_eligible_count": 18,
  "message": "Radius expanded to 2.5 km"
}
```

Max radius: 10 km (from settings or hardcoded). Updates `current_radius_km` on the booking's dispatch state.

---

## GET /api/v1/dispatch/exceptions

Returns active dispatch exceptions.

Query params:
- `zone_id` (str, optional)
- `severity` (str, optional) — "danger" | "warn" | "info"
- `limit` (int, default=50)

Response:
```json
{
  "stats": {
    "active_count": 7,
    "no_driver_count": 3,
    "sla_breach_risk_count": 4,
    "resolved_last_hour": 24,
    "avg_resolve_seconds": 42
  },
  "pattern": {
    "description": "3 of 7 exceptions cluster in Z-E2 Whitefield",
    "detail": "Driver supply is down ~32% versus baseline for this hour.",
    "hot_zone_id": "Z-E2",
    "hot_zone_name": "Whitefield"
  },
  "exceptions": [
    {
      "id": "uuid",
      "exception_ref": "EX-9821",
      "kind": "no-driver",
      "booking_id": "uuid",
      "booking_ref": "REQ-44207",
      "customer_name": "Diya Menon",
      "zone_id": "Z-E2",
      "zone_name": "Whitefield",
      "vehicle_class": "Sedan",
      "age_display": "1m 42s",
      "age_seconds": 102,
      "dispatch_attempts": 3,
      "recommended_action": "Expand radius",
      "severity": "danger",
      "resolved": false,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

`kind` enum: "no-driver" | "rejected" | "stuck-pickup" | "sla-breach" | "route-blocked"
`severity` enum: "danger" | "warn" | "info"

---

## POST /api/v1/dispatch/exceptions/{exception_id}/resolve

Mark an exception as resolved.

Path param: `exception_id` (UUID)

Request:
```json
{
  "action_taken": "Expanded radius and manually assigned driver",
  "resolved_by_driver_id": "uuid"
}
```

Response:
```json
{
  "id": "uuid",
  "exception_ref": "EX-9821",
  "resolved": true,
  "resolved_at": "2024-01-01T10:02:00Z",
  "message": "Exception resolved"
}
```

---

## GET /api/v1/dispatch/supply

Returns per-zone supply/demand stats and active surge multipliers.

Response:
```json
{
  "stats": {
    "online_drivers_total": 1184,
    "approved_drivers_total": 1520,
    "online_percentage": 77.9,
    "live_demand": 1128,
    "ds_ratio": 1.13,
    "zones_above_1_3": 4,
    "active_surge_zones": 7,
    "total_zones": 12,
    "avg_surge_multiplier": 1.24,
    "capped_zones_count": 1
  },
  "zones": [
    {
      "zone_id": "Z-N1",
      "zone_name": "MG Road",
      "online_drivers": 78,
      "demand": 62,
      "ds_ratio": 0.79,
      "surge_multiplier": 1.0,
      "is_capped": false,
      "tone": "ok",
      "active_override": null
    }
  ]
}
```

`tone` enum: "ok" | "warn" | "danger"

---

## POST /api/v1/dispatch/surge/override

Apply a manual surge override for a zone.

Request:
```json
{
  "zone_id": "Z-S1",
  "zone_name": "HSR",
  "multiplier": 1.6,
  "reason": "Driver shift change · evening peak demand",
  "expires_in_minutes": 45,
  "applies_to": "all"
}
```

Response:
```json
{
  "id": "uuid",
  "zone_id": "Z-S1",
  "zone_name": "HSR",
  "multiplier": 1.6,
  "reason": "Driver shift change · evening peak demand",
  "expires_at": "2024-01-01T16:30:00Z",
  "applies_to": "all",
  "created_by_name": "Admin User",
  "bookings_affected": 480,
  "created_at": "2024-01-01T15:45:00Z"
}
```

Validation: multiplier must be between 1.0 and surge_cap (default 2.0 from settings). Action is audit-logged.

---

## GET /api/v1/dispatch/surge/overrides

Returns surge override history.

Query params:
- `limit` (int, default=20)
- `offset` (int, default=0)

Response:
```json
[
  {
    "id": "uuid",
    "zone_id": "Z-E2",
    "zone_name": "Whitefield",
    "multiplier": 1.4,
    "reason": "Airport surge · arrivals spike",
    "duration_minutes": 90,
    "expires_at": "2024-01-01T16:00:00Z",
    "is_active": false,
    "created_by_name": "Priya Iyer",
    "bookings_affected": 312,
    "created_at": "2024-01-01T14:22:00Z"
  }
]
```

---

## Models needed

### dispatch_states table (extends bookings)
Actually store as columns on road_bookings:
- `dispatch_attempts` INT DEFAULT 0
- `current_radius_km` FLOAT DEFAULT 1.5
- `zone_id` VARCHAR(20) nullable
- `zone_name` VARCHAR(100) nullable

### driver location (add to drivers table)
- `current_lat` FLOAT nullable
- `current_lng` FLOAT nullable

### dispatch_exceptions table
```
id (UUID PK)
exception_ref (VARCHAR unique, e.g. "EX-9821")
kind (VARCHAR: no-driver|rejected|stuck-pickup|sla-breach|route-blocked)
booking_id (FK road_bookings.id)
zone_id (VARCHAR)
zone_name (VARCHAR)
vehicle_class (VARCHAR)
dispatch_attempts (INT)
severity (VARCHAR: danger|warn|info)
recommended_action (VARCHAR)
resolved (BOOL default FALSE)
action_taken (TEXT nullable)
resolved_by_driver_id (VARCHAR nullable)
resolved_at (DATETIME nullable)
created_at (DATETIME)
updated_at (DATETIME)
```

### surge_overrides table
```
id (UUID PK)
zone_id (VARCHAR)
zone_name (VARCHAR)
multiplier (FLOAT)
reason (TEXT)
expires_at (DATETIME)
applies_to (VARCHAR default 'all')
is_active (BOOL computed/stored)
bookings_affected (INT default 0)
created_by (FK admin_users.id)
created_at (DATETIME)
updated_at (DATETIME)
```
