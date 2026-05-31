# Module 06 — Live Dispatch & Exception Console — Orchestrator Log

## Phase 1 — Summary

Module 6 is a real-time operations cockpit for dispatchers. It has three screens:
- **6.1 Dispatch Console**: Three-panel split — left: live request queue (bookings in `Requested` status sorted by time-in-state), center: city map with driver/request pins and radius rings, right: ranked eligible drivers for the selected request with manual-assign action.
- **6.2 Exceptions**: Table of dispatch failures (no-driver found, repeated rejections, stuck-in-state SLA breach, route blocked), each with severity and recommended action (expand radius, manual assign, notify customer, cancel-and-refund). Includes a pattern analysis strip and supply bar chart.
- **6.3 Supply & Surge Monitor**: Zone heatmap (demand-to-supply ratio), manual surge override form with slider, and an override history table.

## Phase 2 — Audit

### What does NOT exist (everything for this module):
- `backend/app/models/dispatch.py` — needed (DispatchState, DispatchException, SurgeOverride)
- `backend/app/schemas/dispatch.py` — needed
- `backend/app/services/dispatch_service.py` — needed
- `backend/app/api/v1/endpoints/dispatch.py` — needed
- `admin-panel/src/services/dispatchService.ts` — needed
- `admin-panel/src/pages/dispatch/` — needed (3 page files)

### What already exists that dispatch will READ:
- `backend/app/models/booking.py` (RoadBooking) — has status, fare, pickup/drop coords, driver_id, surge_multiplier
- `backend/app/models/driver.py` (Driver) — has online_status, rating, acceptance_rate, status
- Driver model MISSING: `current_lat`, `current_lng` — need to add columns
- Booking model MISSING: `dispatch_attempts`, `zone_id`, `zone_name` — need to add columns (or use DispatchState)

Decision: Add `dispatch_attempts`, `zone_id` to RoadBooking via migration (simpler for admin reads). Add `current_lat`, `current_lng` to Driver model.

## Phase 3 — Task List

### Backend
- BE-01: Add `dispatch_attempts`, `zone_id`, `zone_name` columns to RoadBooking model + migration
- BE-02: Add `current_lat`, `current_lng` to Driver model + migration
- BE-03: Create DispatchException model (dispatch_exceptions table)
- BE-04: Create SurgeOverride model (surge_overrides table)
- BE-05: Create dispatch schemas (Pydantic v2)
- BE-06: Create dispatch_service.py with all business logic
- BE-07: Create dispatch endpoints + register router

### Frontend
- FE-01: Create dispatchService.ts with all API calls
- FE-02: Build DispatchConsolePage (6.1) with three-panel layout
- FE-03: Build DispatchExceptionsPage (6.2) with exception table + analytics
- FE-04: Build SupplySurgePage (6.3) with zone heatmap + surge override
- FE-05: Register routes in App.tsx + sidebar link

## Phase 4 — API Contract

See api-contract.md

## Clarifications

- No real-time WebSocket for MVP — polling with reasonable refresh (every 5s for queue, 30s for supply)
- Driver location is simulated (stored in DB, not from live GPS cache)
- Eligible drivers computed by: online_status='online', status='active', vehicle_class match, within radius (haversine from pickup coords), docs valid approximated by driver.status='active'
- Exception SLA threshold: 60 seconds (configurable in settings but hardcoded fallback)
- Exception auto-generation: handled on GET (compute on-the-fly from bookings aged > 60s with 0 driver)
- Sidebar nav ID for dispatch: "dispatch"

## Agent Results

(filled after agents complete)
