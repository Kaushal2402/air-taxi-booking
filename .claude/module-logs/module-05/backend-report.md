# Module 05 — Booking Management (Air) · Backend Report

**Status: COMPLETE**
**Date: 2026-05-31**

---

## Files Created

### Models — BE-01
**`backend/app/models/air_booking.py`**
- `AirBooking` (table: `air_bookings`) — 40+ columns including all denormalized snapshots, MTOW fields, manifest state, flight metrics
- `ManifestPassenger` (table: `manifest_passengers`) — per-passenger weight/identity tracking
- `CharterQuote` (table: `charter_quotes`) — multi-operator quote workflow with computed `total_minor`
- `AirBookingNote` (table: `air_booking_notes`) — internal admin notes
- `AirBookingTimeline` (table: `air_booking_timeline`) — audit trail with tone

All 5 models registered in `backend/app/models/__init__.py`. The `__init__.py` was also extended to include `Operator`, `Aircraft`, `Pilot`, and all other previously missing model imports needed for Alembic autogenerate to work correctly.

### Schemas — BE-02
**`backend/app/schemas/air_bookings.py`**
- `AirBookingListItem` / `AirBookingDetail` (extends list item)
- `AirBookingStats` / `AirBookingListResponse`
- `ManifestPassengerResponse` / `ManifestPassengerInput` / `ManifestUpdateBody` / `ManifestResponse`
- `CharterQuoteResponse` / `CharterQuoteCreate` / `QuotesListResponse`
- `AirBookingNoteResponse` / `AirBookingTimelineResponse`
- Action bodies: `AssignOperatorBody`, `CancelAirBookingBody`, `RescheduleBody`, `RefundAirBookingBody`, `FlagAirBookingBody`, `AddAirNoteBody`, `AdvanceAirStatusBody`, `PushQuoteBody`

### Service — BE-03
**`backend/app/services/air_bookings_service.py`**

Helpers:
- `_generate_booking_ref()` → `AC-A{seq}-{5-hex}` format (e.g. `AC-A4-21809`)
- `_utcnow()`, `_add_timeline_event()`, `_load_booking()` (selectinload all 4 relationships)
- `_build_detail_dict()` / `_build_list_item_dict()`
- `_compute_cancel_tier()` → (tier_label, fee_pct) based on hours_to_etd

Service functions:
- `list_bookings()` — filters, pagination, operator name map, 6-stat aggregates
- `get_booking()` — full detail with operator name resolution
- `assign_operator()` — validates operator exists, updates booking + timeline
- `get_cancel_preview()` — tier-based fee preview without mutation
- `cancel_booking()` — tier fee calc, force_majeure override, status→Cancelled
- `reschedule_booking()` — updates etd, sets status→Confirmed
- `process_refund()` — validates status in (Cancelled, Completed), sets→Refunded
- `get_manifest()` — weight sums + MTOW calc (empty weight 1860 kg default)
- `update_manifest()` — replace passengers, validate MTOW, update pax_count
- `lock_manifest()` — sets manifest_locked=True + manifest_locked_at
- `list_quotes()` / `create_quote()` — computed total_minor on insert
- `push_quote()` — quote.status→pushed + booking.status→"Quote shared"
- `decline_quote()` — quote.status→declined
- `add_note()` — creates AirBookingNote
- `flag_booking()` — updates flagged + flag_reason
- `advance_status()` — validates against `_STATUS_TRANSITIONS` dict

Status transitions implemented:
```
Requested → Confirmed | Cancelled
Quote shared → Confirmed | Cancelled
Confirmed → Manifest locked | Cancelled
Manifest locked → Boarding | Cancelled
Boarding → Departed | Cancelled
Departed → Arrived
Arrived → Completed
```

Cancellation tiers:
- `>48h` → 0% fee
- `24–48h` → 25% fee
- `4–24h` → 50% fee
- `<4h` → 100% fee
- force_majeure → 0% fee regardless of tier

MTOW validation formula:
```
total = pax_weight + baggage_weight + fuel_weight + 1860 (empty)
is_within = total <= (aircraft_mtow_kg or 2722)
```

### Endpoints — BE-04
**`backend/app/api/v1/endpoints/air_bookings.py`**

Router: `air_bookings_router = APIRouter()`
Auth guard (`_: AdminUser = Depends(get_current_admin_user)`) on ALL 17 endpoints:

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` (list) | `list_bookings` |
| GET | `/{id}` | `get_booking` |
| GET | `/{id}/cancel-preview` | `cancel_preview` |
| POST | `/{id}/assign-operator` | `assign_operator` |
| POST | `/{id}/cancel` | `cancel_booking` |
| POST | `/{id}/reschedule` | `reschedule_booking` |
| POST | `/{id}/refund` | `process_refund` |
| GET | `/{id}/manifest` | `get_manifest` |
| PATCH | `/{id}/manifest` | `update_manifest` |
| POST | `/{id}/manifest/lock` | `lock_manifest` |
| GET | `/{id}/quotes` | `list_quotes` |
| POST | `/{id}/quotes` (201) | `create_quote` |
| POST | `/{id}/quotes/{qid}/push` | `push_quote` |
| POST | `/{id}/quotes/{qid}/decline` | `decline_quote` |
| POST | `/{id}/notes` | `add_note` |
| POST | `/{id}/advance-status` | `advance_status` |
| PATCH | `/{id}/flag` | `flag_booking` |

### Router Registration — BE-05
**`backend/app/api/v1/router.py`** — added:
```python
from app.api.v1.endpoints.air_bookings import air_bookings_router
api_router.include_router(air_bookings_router, prefix="/bookings/air", tags=["Bookings Air"])
```

### Migration — BE-06
**`backend/alembic/versions/43f9a55765ff_add_module_05_air_bookings.py`**

Revision: `43f9a55765ff`
Down revision: `b07cdf4be1af` (add_module_04_road_bookings)

Creates 5 tables with proper FKs and indexes. Spurious diff operations (from worktree being on older commit) were removed — migration is clean, only adds new tables.

---

## Key Design Notes

1. **`from __future__ import annotations`** on all 4 new Python files — required for Python 3.9 `X | Y` union syntax
2. **`operator_name`** is denormalized in the list response (looked up from operators table per page)
3. **`CharterQuote.total_minor`** stored on insert, computed as sum of all fare components — no lazy computed property
4. **MTOW validation** uses stored `aircraft_mtow_kg` on booking (denormalized at assign time) or defaults to 2722 kg; empty aircraft weight hardcoded at 1860 kg
5. **Stats** use 7-day window for cancellations and today-only for gross_revenue
6. All import tests pass — 17 routes verified correct
