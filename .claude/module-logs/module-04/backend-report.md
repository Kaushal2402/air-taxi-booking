# Module 04 — Backend Report

**Status: COMPLETE**
**Date: 2026-05-31**

---

## Tasks Completed

### BE-01 — Models (`backend/app/models/booking.py`)
Created 5 ORM models registered in `__init__.py`:

| Model | Table | Key Fields |
|---|---|---|
| `RoadBooking` | `road_bookings` | booking_ref, customer_id FK, driver_id FK, status, fare fields, GPS coords, surge, promo, flag, scheduled_at, denormalized snapshots |
| `BookingTimelineEvent` | `booking_timeline_events` | booking_id FK, event, message, tone, created_at |
| `BookingFareComponent` | `booking_fare_components` | booking_id FK, label, rule_ref, amount_minor, created_at |
| `BookingAdminNote` | `booking_admin_notes` | booking_id FK, note + TimestampMixin |
| `Dispute` | `disputes` | dispute_ref (unique), booking_id FK (unique), reason, priority, stage, resolution fields + TimestampMixin |

**Note:** Used `Optional[X]` instead of `X | None` in all `Mapped[]` annotations — required for Python 3.9 + SQLAlchemy 2.0 compatibility (SQLAlchemy's de_stringify_annotation cannot evaluate `str | None` at runtime on Python 3.9).

### BE-02 — Schemas (`backend/app/schemas/bookings.py`)
Full Pydantic v2 schema set with `from __future__ import annotations`:
- Response models: `RoadBookingListItem`, `RoadBookingDetail`, `TimelineEventResponse`, `FareComponentResponse`, `AdminNoteResponse`, `DisputeResponse`, `DisputeListItem`
- Paginated containers: `BookingListResponse` (with `BookingStats`), `DisputeListResponse`
- Request bodies: `AssistedBookingCreate`, `CancelBookingBody`, `ReassignBody`, `AdjustFareBody`, `RefundBody`, `OpenDisputeBody`, `ResolveDisputeBody`, `FlagBookingBody`, `AddNoteBody`
- All response models have `model_config = {"from_attributes": True}`

### BE-03 — Service (`backend/app/services/bookings_service.py`)
All 13 async functions implemented:
- `list_bookings` — paginated with filters (search, status, service_type, date_from/to, flagged, payment_method) + real-time stats (live_count, scheduled_count, cancelled_today, disputed_count, refund_pending_count, gross_revenue_minor)
- `get_booking` — loads with `selectinload` for timeline_events, fare_components, admin_notes, dispute
- `create_assisted_booking` — auto-generates booking_ref ("AC-" + 7 random hex uppercase), inserts first timeline event
- `cancel_booking` — validates not Completed/Cancelled/Refunded, computes fee as max(5000, estimate*10//100)
- `reassign_driver` — validates Accepted/Arrived status, denormalizes new driver plate+model
- `adjust_fare` — validates Completed/InProgress status
- `process_refund` — validates Cancelled/Completed/Disputed; sets status to Refunded if Cancelled
- `open_dispute` — validates no existing dispute, auto-generates dispute_ref ("D-NNNN"), sets booking to Disputed
- `resolve_dispute` — updates stage to resolved, sets action/amounts
- `add_note` — creates BookingAdminNote
- `flag_booking` — updates flagged + flag_reason
- `get_telemetry` — returns dict with coords + empty gps_points list
- `list_disputes` — paginated with stage/priority filters + JOIN to road_bookings for booking_ref

### BE-04 — Endpoints (`backend/app/api/v1/endpoints/bookings.py`)
`road_bookings_router = APIRouter()` with all 13 endpoints in correct order (static `/disputes` registered BEFORE `/{booking_id}`):
- `GET /` — list bookings
- `POST /` — create assisted booking (201)
- `GET /disputes` — list disputes (STATIC, first)
- `GET /{booking_id}` — detail
- `POST /{booking_id}/cancel`
- `POST /{booking_id}/reassign`
- `POST /{booking_id}/adjust-fare`
- `POST /{booking_id}/refund`
- `POST /{booking_id}/dispute`
- `POST /{booking_id}/dispute/resolve`
- `POST /{booking_id}/notes`
- `PATCH /{booking_id}/flag`
- `GET /{booking_id}/telemetry`

All endpoints have `_: AdminUser = Depends(get_current_admin_user)` guard.

### BE-05 — Router registration (`backend/app/api/v1/router.py`)
```python
from app.api.v1.endpoints.bookings import road_bookings_router
api_router.include_router(road_bookings_router, prefix="/bookings/road", tags=["Bookings Road"])
```

### BE-06 — Alembic migration
Generated: `backend/alembic/versions/b07cdf4be1af_add_module_04_road_bookings.py`
- Down-revision: `daab56248ef4` (module-14 promotions/referrals)
- Creates 5 tables with all indexes
- Migration manually trimmed to remove false-positive drops (autogenerate picked up tables not in worktree's model scope)
- NOT run (`upgrade head` not executed per instructions)

---

## Key Design Decisions
1. `Optional[X]` used in Mapped annotations (not `str | None`) — avoids SQLAlchemy Python 3.9 annotation resolution bug
2. Dispute ref uses max+1 counter from DB (not a sequence) — simple and portable across MySQL
3. Denormalized customer/driver names resolved from DB on each list call (batched per page, not N+1)
4. `selectinload` used for detail loading — avoids lazy-load async issues
5. `disputes.booking_id` has `unique=True` enforcing one dispute per booking at DB level

---

## Files Created/Modified
- CREATED: `backend/app/models/booking.py`
- CREATED: `backend/app/schemas/bookings.py`
- CREATED: `backend/app/services/bookings_service.py`
- CREATED: `backend/app/api/v1/endpoints/bookings.py`
- CREATED: `backend/alembic/versions/b07cdf4be1af_add_module_04_road_bookings.py`
- MODIFIED: `backend/app/models/__init__.py` (added 5 booking models)
- MODIFIED: `backend/app/api/v1/router.py` (registered road_bookings_router)
