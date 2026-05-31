# Module 02 — Dashboard & Live Operations — Orchestrator Log

## Summary
Module 02 is the admin platform's operational nerve-center. It renders two screens: (2.1) a full-width dashboard with an 8-card KPI strip, a live CityMap SVG of driver/trip markers with route polylines, a collapsible alerts/exceptions feed, a 14-day rolling bookings+revenue trend chart, and a live-bookings sidebar; and (2.2) a full-screen live operations map with a floating filter bar, a left stats column (driver counts + demand-vs-supply bars per zone + recent exceptions), and a right trip-detail drawer with reassign/message/cancel actions. Static decorative data is used for any metrics (online driver counts, pickup ETA, demand/surge) that depend on unimplemented modules (Drivers online status, real-time dispatch engine, pricing surge), with inline `// TODO:` comments so the real feed can be wired in later.

---

## Phase 2 — Audit

### Already exists
- `backend/app/api/v1/endpoints/dashboard.py` — partial: live road/air trip counts, today bookings, GBV, completed, cancel rate, 14d sparklines. Missing: online_drivers, pickup_eta_median, active_operators (returns 0).
- `admin-panel/src/pages/dashboard/DashboardPage.tsx` — partial: 4 KPI cards (missing 4), static decorative city SVG (no markers/routes), alerts panel, trend chart, live bookings list.
- Route `/dashboard` registered in App.tsx.

### Missing / needs building
- Backend: enhance `KpiStats` with `online_drivers`, `online_drivers_idle`, `online_drivers_on_trip`, `pickup_eta_median_sec`, `active_operators_total`, `active_operators_paused`.
- Frontend: expand KPI strip from 4 to 8 cards.
- Frontend: upgrade static SVG to spec-matching CityMap (animated markers, route polylines, legend).
- Frontend: new `LiveMapPage.tsx` (Screen 2.2) at `/dashboard/live`.
- App.tsx: add `/dashboard/live` route.

---

## Phase 3 — Task breakdown

- BE-01: Enhance `KpiStats` schema + dashboard endpoint with online_drivers, pickup_eta, active_operators (static/placeholder for unimplemented modules with TODO notes)
- FE-01: Upgrade DashboardPage KPI strip to 8 cards with real data from enhanced API
- FE-02: Upgrade CityMap SVG to match spec (markers by kind, route polylines, legend, corner stats)
- FE-03: Create LiveMapPage.tsx (Screen 2.2) — full-screen map with filter bar, left stats, right detail drawer
- FE-04: Register `/dashboard/live` route in App.tsx

---

## Phase 4 — API contract
See `api-contract.md`

---

## Clarifications
- Online drivers count: Driver module (Module 7) is implemented but online/offline status may not be tracked in DB. Use static placeholder `0` with TODO comment.
- Pickup ETA median: Requires real-time dispatch data. Use static `0` with TODO comment.
- Active operators: Operator module implemented. Can query `Operator.status == 'active'`.
- Demand/surge bars on LiveMapPage: Static data, TODO for Pricing module (Module 13).
- Trip detail drawer on LiveMapPage: Static selected booking demo (first live booking), no click-to-select interaction needed for v1 (static).
