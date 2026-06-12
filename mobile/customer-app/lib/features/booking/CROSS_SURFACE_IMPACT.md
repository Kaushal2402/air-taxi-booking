# Cross-Surface Impact — Module 03 Booking (Customer App)
**Date:** 2026-06-12
**Raised by:** flutter-senior-dev

## Admin Panel Changes Needed

| Screen | What to Add | Why | Priority |
|---|---|---|---|
| Admin > Bookings > Air | New customer-originated bookings appear with source="customer_app" badge | When the customer app POST /api/v1/app/air/bookings endpoint is built, new bookings will be created by customers directly, not by admin staff. The existing air bookings list must show and distinguish these. | P1 |
| Admin > Bookings > Air | "Assign operator" workflow still required for customer-app bookings that need routing | Customer app creates the booking in Requested status; admin still needs to assign an operator and aircraft. No new screen needed — existing assign-operator action covers this. | P1 (already exists) |
| Admin > Pricing | Flight scheduling UI: create/manage scheduled_flights records | The new /api/v1/app/air/flights endpoint reads from a scheduled_flights table that has no admin management UI yet. Admins need to create flight schedules (route, departure_time, seat_capacity). | P1 — BLOCKING for live data |
| Admin > Catalog | Seat map configuration per aircraft type | The seat map (screen 3.5) requires a seat layout configuration. The AircraftType model needs a seat_layout JSON column, and the admin aircraft types editor needs a seat map builder. | P2 |

## Operator Panel Changes Needed

| Screen | What to Add | Why | Priority |
|---|---|---|---|
| Operator > Bookings | Customer-app booking notifications appear in operator's booking queue | When a customer creates a booking, it enters Requested state and needs to be routed to the operator. The operator panel already has an incoming requests view; confirm it handles bookings created by the customer app (source flag). | P1 |
| Operator > Flight Management | Seat hold visibility | Operators need to see which seats are held (but not yet confirmed) so they don't manually override holds. | P2 |

## Backend Impact Already Raised?

Yes — see BACKEND_CHANGE_REQUEST.md in this folder.

## Blocking Mobile Work?

No — mobile screens render stub/empty states and will activate once backend endpoints
are implemented. The admin flight scheduling UI (P1 above) IS blocking for end-to-end
testing — without scheduled_flights records, the /api/v1/app/air/flights endpoint
will always return empty, making screen 3.2 and 3.4 appear empty even after the backend
customer endpoints are built.
