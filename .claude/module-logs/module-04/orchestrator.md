# Module 04 — Booking Management (Road) · Orchestrator Log

## Summary
Module 04 provides complete operational control over all road bookings (cab, bike, rental, outstation, scheduled). Admins can view a filterable live list (Screen 4.1), inspect full booking detail with tabs for overview/timeline/fare breakdown/payments/communications/audit (Screen 4.2), create bookings on behalf of customers via an assisted-booking wizard (Screen 4.3), cancel with refund preview (Screen 4.4 — modal on detail page), and manage disputes with evidence, resolution actions, and driver clawback (Screen 4.5). The NavRail ID is `bookings-r` → path `/bookings/road`.

---

## Phase 1 — Scope (COMPLETE)
Files read:
- `Docs/ui/project/Acme Mobility Admin/Module 04 - screens.jsx` ✅ — 5 screens, 1,108 lines
- `Docs/admin_panel_product_document.md` → Module 4 section (lines 305–370) ✅
- `NavRail.tsx` → `bookings-r` → `/bookings/road` confirmed ✅

---

## Phase 2 — Audit (COMPLETE)

### Backend — NOTHING EXISTS
- No booking model, endpoint, schema, or service
- No `bookings.py` anywhere in backend

### Frontend — EMPTY
- `admin-panel/src/pages/bookings/` directory exists but is empty
- No `bookingsService.ts` in services/
- No routes registered in App.tsx for /bookings/*

---

## Phase 3 — Task Breakdown (COMPLETE)

### Backend Tasks
- **BE-01** Create `backend/app/models/booking.py` — RoadBooking + BookingTimelineEvent + BookingFareComponent + BookingAdminNote + Dispute models
- **BE-02** Create `backend/app/schemas/bookings.py` — All Pydantic schemas
- **BE-03** Create `backend/app/services/bookings_service.py` — CRUD, cancel, adjust-fare, refund, dispute, stats
- **BE-04** Create `backend/app/api/v1/endpoints/bookings.py` — All endpoints
- **BE-05** Register router in `backend/app/api/v1/router.py`
- **BE-06** Create Alembic migration

### Frontend Tasks
- **FE-01** Create `admin-panel/src/services/bookingsService.ts`
- **FE-02** Build `admin-panel/src/pages/bookings/RoadBookingsPage.tsx` — Screen 4.1
- **FE-03** Build `admin-panel/src/pages/bookings/BookingDetailPage.tsx` — Screen 4.2 + 4.4 (cancel modal)
- **FE-04** Build `admin-panel/src/pages/bookings/AssistedBookingPage.tsx` — Screen 4.3
- **FE-05** Build `admin-panel/src/pages/bookings/DisputesPage.tsx` — Screen 4.5
- **FE-06** Register routes in `App.tsx`

---

## Phase 4 — API Contract (COMPLETE)
See `api-contract.md`

---

## Phase 5 — Clarifications
No blocking ambiguities. Implementation decisions:
- Cancellation fee: computed as max(50_00, fare_minor * 10%) but overridable by admin
- Fare breakdown stored as JSON on booking (not separate table) — `fare_components` field
- Map / telemetry: pickup/drop displayed as leaflet markers; no live GPS tracking (app not built yet)
- Assisted booking: estimate is entered/computed manually; no real-time driver supply API
- Timeline events auto-inserted on each state transition
- Dispute is a 1:0..1 on booking; disputes can be listed separately via GET /bookings/road/disputes
- Screen 4.4 (cancellation) is a modal, not a separate route — built inside BookingDetailPage
- Status polling: refresh button (no WebSocket needed for admin panel)
- `bookings-r` activeId confirmed in NavRail

---

## Phase 6 — Agents Spawned
Both BE and FE agents spawned in parallel (background, worktree isolation).
