# Module 05 — Air Booking Management · Backend Report

## Status: COMPLETE

## Files Created

| File | Purpose |
|---|---|
| `backend/app/models/air_booking.py` | ORM models: AirBooking, AirBookingPassenger, CharterQuote, AirBookingNote, AirBookingTimeline |
| `backend/app/schemas/air_bookings.py` | All Pydantic v2 schemas (list item, detail, manifest, quotes, notes, timeline, all request bodies) |
| `backend/app/services/air_bookings_service.py` | All 17 service methods with full business logic |
| `backend/app/api/v1/endpoints/air_bookings.py` | FastAPI router with all 18 endpoints, auth-guarded |
| `backend/alembic/versions/e5a1f2c3b4d5_add_air_booking_tables.py` | Migration (hand-written; DB not available locally) |

## Files Modified

| File | Change |
|---|---|
| `backend/app/api/v1/router.py` | Registered `air_bookings_router` at prefix `/bookings/air` |
| `backend/app/models/__init__.py` | Exported 5 new models |

## Endpoints implemented (all auth-guarded)

- `GET /bookings/air` — paginated list + stats
- `GET /bookings/air/{id}` — detail
- `POST /bookings/air/{id}/assign-operator`
- `GET /bookings/air/{id}/cancel-preview` — fee tier calculation
- `POST /bookings/air/{id}/cancel`
- `POST /bookings/air/{id}/reschedule`
- `POST /bookings/air/{id}/refund`
- `GET /bookings/air/{id}/manifest`
- `PATCH /bookings/air/{id}/manifest`
- `POST /bookings/air/{id}/manifest/lock`
- `GET /bookings/air/{id}/quotes`
- `POST /bookings/air/{id}/quotes`
- `POST /bookings/air/{id}/quotes/{qid}/push`
- `POST /bookings/air/{id}/quotes/{qid}/decline`
- `POST /bookings/air/{id}/notes`
- `POST /bookings/air/{id}/advance-status`
- `PATCH /bookings/air/{id}/flag`

## Key implementation notes

- Cancellation tiers: >48h=0%, 24-48h=25%, 4-24h=50%, <4h=100%
- Status transition guard enforces: Requested→Confirmed→Manifest locked→Boarding→Departed→Arrived→Completed
- Manifest locked check prevents edits on locked manifests
- `total_minor` on CharterQuote is computed (not stored): sum of all 6 fare components
- Migration is hand-written (MySQL not running locally); run `alembic upgrade head` when DB is available
- All files use `from __future__ import annotations` for Python 3.9 union type compatibility
