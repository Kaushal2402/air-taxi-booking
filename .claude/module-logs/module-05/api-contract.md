# Module 05 — Booking Management (Air) · API Contract

All routes prefixed `/api/v1`. Auth guard on every endpoint.

---

## GET /api/v1/bookings/air
List air bookings with filtering + pagination.

Query params:
- `page` (int, default 1)
- `page_size` (int, default 50)
- `search` (str, optional) — matches booking_ref, customer name, route
- `status` (str, optional) — comma-separated: `Requested,Confirmed,Boarding,Departed,...`
- `service_subtype` (str, optional) — `helicopter_shuttle|helicopter_on_demand|charter|vip`
- `operator_id` (str UUID, optional)
- `date_from` (str ISO date, optional)
- `date_to` (str ISO date, optional)
- `flagged` (bool, optional)

Response:
```json
{
  "items": [AirBookingListItem],
  "total": 38,
  "page": 1,
  "pages": 1,
  "stats": {
    "in_air_count": 12,
    "quote_pending_count": 5,
    "manifest_open_count": 7,
    "cancelled_7d_count": 4,
    "refund_queue_count": 2,
    "gross_revenue_minor": 624000000
  }
}
```

---

## GET /api/v1/bookings/air/{booking_id}
Get full air booking detail.

Response: `AirBookingDetail`

---

## POST /api/v1/bookings/air/{booking_id}/assign-operator
Assign or reassign the operator.

Request:
```json
{
  "operator_id": "uuid",
  "aircraft_id": "uuid",
  "note": "Assigned due to preferred operator availability"
}
```

Response: `AirBookingDetail`

---

## POST /api/v1/bookings/air/{booking_id}/cancel
Cancel an air booking.

Request:
```json
{
  "reason": "Customer requested",
  "note": "Trip purpose cancelled",
  "force_majeure": false,
  "refund_destination": "original|wallet|wire"
}
```

Response: `AirBookingDetail`

---

## GET /api/v1/bookings/air/{booking_id}/cancel-preview
Compute cancellation fee preview based on time-to-departure tier.

Response:
```json
{
  "booking_id": "uuid",
  "fare_minor": 61000000,
  "tier": "4–24h",
  "fee_pct": 50,
  "cancel_fee_minor": 30500000,
  "net_refund_minor": 30500000,
  "hours_to_etd": 18.2,
  "is_force_majeure_eligible": true
}
```

---

## POST /api/v1/bookings/air/{booking_id}/reschedule
Reschedule a booking to a new departure time.

Request:
```json
{
  "new_etd": "2026-05-24T08:00:00Z",
  "reason": "Customer request"
}
```

Response: `AirBookingDetail`

---

## POST /api/v1/bookings/air/{booking_id}/refund
Process a refund.

Request:
```json
{
  "amount_minor": 30500000,
  "destination": "original|wallet|wire",
  "reason": "Cancellation refund"
}
```

Response: `AirBookingDetail`

---

## GET /api/v1/bookings/air/{booking_id}/manifest
Get the passenger manifest for a booking.

Response:
```json
{
  "booking_id": "uuid",
  "passengers": [ManifestPassenger],
  "total_pax_weight_kg": 212,
  "total_baggage_weight_kg": 40,
  "aircraft_empty_weight_kg": 1860,
  "fuel_weight_kg": 540,
  "total_weight_kg": 2652,
  "mtow_kg": 2722,
  "utilization_pct": 97.4,
  "is_within_limits": true,
  "is_locked": false
}
```

---

## PATCH /api/v1/bookings/air/{booking_id}/manifest
Update the passenger manifest (add/edit/remove passengers).

Request:
```json
{
  "passengers": [
    {
      "id": "uuid-or-null",
      "name": "Vikram Bhatt",
      "age": 39,
      "id_number": "AADHR 1234 5678",
      "body_weight_kg": 84,
      "baggage_weight_kg": 12,
      "special_notes": "Lead pax",
      "is_minor": false
    }
  ]
}
```

Response: manifest response (same as GET)

---

## POST /api/v1/bookings/air/{booking_id}/manifest/lock
Lock the manifest (no further edits without admin override).

Response: manifest response

---

## GET /api/v1/bookings/air/{booking_id}/quotes
List all charter quotes for a booking.

Response:
```json
{
  "booking_id": "uuid",
  "quotes": [CharterQuote]
}
```

---

## POST /api/v1/bookings/air/{booking_id}/quotes
Add a quote (admin-entered or from operator submission).

Request:
```json
{
  "operator_id": "uuid",
  "aircraft_id": "uuid",
  "aircraft_registration": "VT-SKE",
  "aircraft_model": "Embraer Phenom 300",
  "pax_capacity": 6,
  "range_nm": 1180,
  "depart_icao": "VOBG",
  "arrive_icao": "VIIJ",
  "etd": "2026-05-22T01:00:00Z",
  "eta": "2026-05-22T03:24:00Z",
  "base_fare_minor": 108000000,
  "positioning_minor": 9000000,
  "night_halt_minor": 6000000,
  "catering_minor": 3500000,
  "fuel_surcharge_minor": 2200000,
  "taxes_minor": 6500000,
  "conditions": "No fuel-stop · 30 kg pax baggage",
  "otp_30d_pct": 96.4,
  "score": 92
}
```

Response: `CharterQuote` (201)

---

## POST /api/v1/bookings/air/{booking_id}/quotes/{quote_id}/push
Push a quote to the customer.

Response: `AirBookingDetail`

---

## POST /api/v1/bookings/air/{booking_id}/quotes/{quote_id}/decline
Decline a quote.

Response: `CharterQuote`

---

## POST /api/v1/bookings/air/{booking_id}/notes
Add admin note.

Request: `{ "note": "string" }`

Response: `AirBookingNoteResponse`

---

## POST /api/v1/bookings/air/{booking_id}/advance-status
Manually advance status (ops workflow).

Request:
```json
{
  "status": "Confirmed|Manifest locked|Boarding|Departed|Arrived|Completed",
  "note": "optional"
}
```

Response: `AirBookingDetail`

---

## PATCH /api/v1/bookings/air/{booking_id}/flag
Toggle flag.

Request: `{ "flagged": bool, "flag_reason": "string|null" }`

Response: `AirBookingDetail`

---

## AirBookingListItem schema
```ts
interface AirBookingListItem {
  id: string
  booking_ref: string             // AC-A4-21809
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  operator_id: string | null
  operator_name: string | null
  aircraft_id: string | null
  aircraft_registration: string | null
  service_subtype: string         // helicopter_shuttle|helicopter_on_demand|charter|vip
  service_label: string           // display: "Heli · Shuttle", "Charter", etc.
  route_from: string              // "BLR-PAD"
  route_to: string                // "MYS-PAD"
  pax_count: number
  etd: string                     // ISO datetime
  scheduled_date: string | null   // date portion for display
  status: AirBookingStatus
  fare_estimate_minor: number
  fare_final_minor: number | null
  payment_method: string | null
  flagged: boolean
  flag_reason: string | null
  created_at: string
  updated_at: string
}
```

## AirBookingDetail schema
```ts
interface AirBookingDetail extends AirBookingListItem {
  // additional detail fields
  eta: string | null
  distance_nm: number | null
  flight_time_min: number | null
  fuel_weight_kg: number | null
  notes: string | null
  internal_reason: string | null
  reschedule_ref: string | null     // ref of replacement booking if rescheduled
  timeline: AirBookingTimelineEvent[]
  admin_notes: AirBookingNote[]
  manifest_locked: boolean
  manifest_locked_at: string | null
  // operator info (denormalized for display)
  operator_otp_pct: number | null
  operator_fleet_count: number | null
  // aircraft info
  aircraft_model: string | null
  aircraft_seats: number | null
  aircraft_mtow_kg: number | null
  aircraft_airworthy_until: string | null
  // pilot info
  pilot_name: string | null
  pilot_license: string | null
  copilot_name: string | null
}
```

## ManifestPassenger schema
```ts
interface ManifestPassenger {
  id: string
  booking_id: string
  seq: number
  name: string
  age: number | null
  id_number: string | null          // masked on display: "AADHR ●●●● 1234"
  body_weight_kg: number
  baggage_weight_kg: number
  special_notes: string | null
  is_minor: boolean
}
```

## CharterQuote schema
```ts
interface CharterQuote {
  id: string
  booking_id: string
  operator_id: string
  operator_name: string | null
  aircraft_registration: string | null
  aircraft_model: string | null
  pax_capacity: number | null
  range_nm: number | null
  depart_icao: string | null
  arrive_icao: string | null
  etd: string | null
  eta: string | null
  base_fare_minor: number
  positioning_minor: number
  night_halt_minor: number
  catering_minor: number
  fuel_surcharge_minor: number
  taxes_minor: number
  total_minor: number             // computed: sum of all
  conditions: string | null
  otp_30d_pct: number | null
  score: number | null            // 0-100 suitability score
  status: 'pending' | 'pushed' | 'accepted' | 'declined'
  is_recommended: boolean
  created_at: string
}
```

## AirBookingNote schema
```ts
interface AirBookingNote {
  id: string
  booking_id: string
  note: string
  created_at: string
}
```

## AirBookingTimelineEvent schema
```ts
interface AirBookingTimelineEvent {
  id: string
  booking_id: string
  event: string
  message: string | null
  tone: 'ok' | 'warn' | 'info' | 'pending' | 'danger'
  created_at: string
}
```

---

## Enums

### AirBookingStatus
`Requested` | `Quote shared` | `Confirmed` | `Manifest locked` | `Boarding` | `Departed` | `Arrived` | `Completed` | `Cancelled` | `Refunded` | `Rescheduled`

### service_subtype
`helicopter_shuttle` | `helicopter_on_demand` | `charter` | `vip`

### payment_method
`card` | `wire` | `corporate_po` | `upi` | `wallet`

### Cancellation tiers (by hours_to_etd)
- `> 48h` → 0% fee (Free cancellation)
- `24–48h` → 25% fee
- `4–24h` → 50% fee
- `< 4h / no-show` → 100% fee

### Status transitions (manual advance)
`Requested` → `Confirmed`
`Confirmed` → `Manifest locked`
`Manifest locked` → `Boarding`
`Boarding` → `Departed`
`Departed` → `Arrived`
`Arrived` → `Completed`
