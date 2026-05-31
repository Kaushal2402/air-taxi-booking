# API Contract — Module 02 Dashboard & Live Operations

## GET /api/v1/dashboard?window={today|7d|30d|90d}
Auth: Bearer JWT (AdminUser)

Response:
```json
{
  "kpi": {
    "live_trips_road": 12,
    "live_trips_air": 3,
    "live_trips_total": 15,
    "online_drivers": 1184,
    "online_drivers_idle": 892,
    "online_drivers_on_trip": 232,
    "online_drivers_total": 1520,
    "today_bookings": 8206,
    "today_gbv_minor": 1420000,
    "today_completed": 7138,
    "cancel_rate_pct": 4.8,
    "pickup_eta_median_sec": 252,
    "active_operators": 18,
    "active_operators_total": 22,
    "active_operators_paused": 1,
    "bookings_14d": [6200,6800,...],
    "revenue_14d_minor": [1080000,1150000,...]
  },
  "live_bookings": [
    {
      "id": "uuid",
      "booking_ref": "AC-92F8311",
      "service": "Cab · XL",
      "route": "Indiranagar → KIAL T2",
      "status": "InProgress",
      "fare_minor": 124000,
      "kind": "road"
    }
  ],
  "alerts": [
    {
      "severity": "danger|warn|info",
      "title": "string",
      "message": "string",
      "module": "string"
    }
  ]
}
```

Notes:
- `online_drivers` — TODO: wire to Driver.is_online when Driver module tracks live status (Module 07). Currently returns 0 (placeholder).
- `pickup_eta_median_sec` — TODO: wire to dispatch/trip engine when real-time ETA tracking available. Currently returns 0.
- `active_operators` / `active_operators_total` — from Operator table, status='active'. `active_operators_paused` = operators with status='paused'.
- All money in integer minor units (paise for INR).
- `window` param only affects trend sparklines (future: also KPIs). Currently returns today's live KPIs regardless.
