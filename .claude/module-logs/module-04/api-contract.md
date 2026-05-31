# Module 04 — Booking Management (Road) · API Contract

All routes prefixed `/api/v1`. Auth guard on every endpoint.

---

## GET /api/v1/bookings/road
List road bookings with filtering + pagination.

Query params:
- `page` (int, default 1)
- `page_size` (int, default 50)
- `search` (str, optional) — matches booking_ref, customer name, driver name
- `status` (str, optional) — `Requested|Accepted|Arrived|InProgress|Completed|Cancelled|Disputed|Refunded|Scheduled`
- `service_type` (str, optional) — `cab|bike|rental|outstation|scheduled`
- `date_from` (str ISO date, optional)
- `date_to` (str ISO date, optional)
- `flagged` (bool, optional)
- `payment_method` (str, optional)

Response:
```json
{
  "items": [RoadBookingListItem],
  "total": 8206,
  "page": 1,
  "pages": 165,
  "stats": {
    "live_count": 247,
    "scheduled_count": 184,
    "cancelled_today": 392,
    "disputed_count": 7,
    "refund_pending_count": 12,
    "gross_revenue_minor": 142000000
  }
}
```

---

## GET /api/v1/bookings/road/{booking_id}
Get full booking detail.

Response: `RoadBookingDetail`

---

## POST /api/v1/bookings/road
Create an assisted booking on behalf of a customer.

Request:
```json
{
  "customer_id": "uuid",
  "pickup_address": "Whitefield · Hope Farm Junction",
  "pickup_lat": 12.9698,
  "pickup_lng": 77.7499,
  "drop_address": "MG Road · 47 Brigade Square",
  "drop_lat": 12.9758,
  "drop_lng": 77.6047,
  "service_type": "cab",
  "vehicle_class": "Sedan",
  "scheduled_at": null,
  "payment_method": "card",
  "promo_code": "WELCOME20",
  "fare_estimate_minor": 62000,
  "internal_reason": "Customer called support",
  "admin_note": "Customer requested silent ride"
}
```

Response: `RoadBookingDetail` (201)

---

## POST /api/v1/bookings/road/{booking_id}/cancel
Cancel a booking.

Request:
```json
{
  "reason": "Customer requested",
  "note": "Change of plans",
  "refund_destination": "original|wallet|none",
  "override_fee_minor": null
}
```

Response: `RoadBookingDetail`

---

## POST /api/v1/bookings/road/{booking_id}/reassign
Reassign driver.

Request:
```json
{
  "driver_id": "uuid",
  "reason": "Driver requested change"
}
```

Response: `RoadBookingDetail`

---

## POST /api/v1/bookings/road/{booking_id}/adjust-fare
Adjust the final fare.

Request:
```json
{
  "new_fare_minor": 95000,
  "reason": "Route deviation correction"
}
```

Response: `RoadBookingDetail`

---

## POST /api/v1/bookings/road/{booking_id}/refund
Issue a refund.

Request:
```json
{
  "amount_minor": 57000,
  "destination": "original|wallet",
  "reason": "Customer goodwill"
}
```

Response: `RoadBookingDetail`

---

## POST /api/v1/bookings/road/{booking_id}/dispute
Open a dispute on a booking.

Request:
```json
{
  "reason": "Route deviation · longer than necessary",
  "note": "Customer reports driver took long route"
}
```

Response: `DisputeResponse`

---

## POST /api/v1/bookings/road/{booking_id}/dispute/resolve
Resolve an open dispute.

Request:
```json
{
  "action": "partial_refund|full_refund|uphold_fare|goodwill_credit",
  "refund_amount_minor": 42000,
  "driver_clawback_minor": 29400,
  "resolution_note": "GPS trace confirms 6.6 km deviation"
}
```

Response: `DisputeResponse`

---

## GET /api/v1/bookings/road/disputes
List all disputes.

Query params:
- `page` (int, default 1)
- `page_size` (int, default 50)
- `search` (str, optional)
- `stage` (str, optional) — `open|in_review|awaiting_driver|awaiting_finance|resolved|closed`
- `priority` (str, optional) — `high|medium|low`

Response:
```json
{
  "items": [DisputeListItem],
  "total": 7,
  "page": 1,
  "pages": 1
}
```

---

## POST /api/v1/bookings/road/{booking_id}/notes
Add admin note.

Request:
```json
{
  "note": "Customer requested silent ride"
}
```

Response: `AdminNoteResponse`

---

## PATCH /api/v1/bookings/road/{booking_id}/flag
Toggle flag on booking.

Request:
```json
{
  "flagged": true,
  "flag_reason": "Customer · repeated cancels"
}
```

Response: `RoadBookingDetail`

---

## GET /api/v1/bookings/road/{booking_id}/telemetry
Get route telemetry (GPS points).

Response:
```json
{
  "booking_id": "uuid",
  "pickup_lat": 12.9698,
  "pickup_lng": 77.7499,
  "drop_lat": 12.9758,
  "drop_lng": 77.6047,
  "gps_points": [{"lat": 12.97, "lng": 77.65, "ts": "ISO"}],
  "distance_expected_km": 18.6,
  "distance_actual_km": 18.6,
  "avg_speed_kmh": 41.0
}
```

---

## RoadBookingListItem schema
```ts
interface RoadBookingListItem {
  id: string
  booking_ref: string          // AC-92F8311
  customer_id: string
  customer_name: string
  driver_id: string | null
  driver_name: string | null
  service_type: string         // cab | bike | rental | outstation | scheduled
  vehicle_class: string | null // Sedan | XL | Bike | etc
  pickup_address: string
  drop_address: string
  status: BookingStatus
  fare_estimate_minor: number
  fare_final_minor: number | null
  payment_method: string
  flagged: boolean
  flag_reason: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
}
```

## RoadBookingDetail schema
```ts
interface RoadBookingDetail extends RoadBookingListItem {
  pickup_lat: number | null
  pickup_lng: number | null
  drop_lat: number | null
  drop_lng: number | null
  distance_km: number | null
  duration_min: number | null
  surge_multiplier: number
  promo_code: string | null
  promo_discount_minor: number
  internal_reason: string | null
  admin_notes: AdminNote[]
  timeline: TimelineEvent[]
  fare_components: FareComponent[]
  dispute: DisputeResponse | null
  driver_vehicle_plate: string | null
  driver_vehicle_model: string | null
  customer_phone: string | null
  customer_ride_count: number
  customer_rating: number | null
}
```

## TimelineEvent schema
```ts
interface TimelineEvent {
  id: string
  booking_id: string
  event: string
  message: string | null
  tone: 'ok' | 'warn' | 'info' | 'pending' | 'danger'
  created_at: string
}
```

## FareComponent schema
```ts
interface FareComponent {
  label: string
  rule_ref: string | null
  amount_minor: number   // negative = discount
}
```

## DisputeListItem schema
```ts
interface DisputeListItem {
  id: string
  dispute_ref: string    // D-2806
  booking_id: string
  booking_ref: string
  customer_name: string
  reason: string
  disputed_amount_minor: number
  priority: 'high' | 'medium' | 'low'
  stage: string
  created_at: string
}
```

## DisputeResponse schema
```ts
interface DisputeResponse {
  id: string
  dispute_ref: string
  booking_id: string
  reason: string
  note: string | null
  priority: 'high' | 'medium' | 'low'
  stage: 'open' | 'in_review' | 'awaiting_driver' | 'awaiting_finance' | 'resolved' | 'closed'
  action: string | null
  refund_amount_minor: number | null
  driver_clawback_minor: number | null
  resolution_note: string | null
  created_at: string
  updated_at: string
}
```

## AdminNote schema
```ts
interface AdminNote {
  id: string
  booking_id: string
  note: string
  created_at: string
}
```

---

## Enums
- BookingStatus: `Requested` | `Accepted` | `Arrived` | `InProgress` | `Completed` | `Cancelled` | `Disputed` | `Refunded` | `Scheduled`
- service_type: `cab` | `bike` | `rental` | `outstation` | `scheduled`
- payment_method: `card` | `upi` | `cash` | `wallet` | `corporate`
- refund_destination: `original` | `wallet` | `none`
- dispute action: `uphold_fare` | `partial_refund` | `full_refund` | `goodwill_credit`
- dispute stage: `open` | `in_review` | `awaiting_driver` | `awaiting_finance` | `resolved` | `closed`
- dispute priority: `high` | `medium` | `low`
- cancel_reason: `Customer no-show` | `Driver couldn't find` | `Vehicle breakdown` | `Customer requested` | `Safety incident` | `Other`
