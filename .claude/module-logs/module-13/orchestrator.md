# Module 13 — Orchestrator Log

## Phase 1 — Scope summary

Module 13 is the **Pricing & Fare Rules** control surface. It lets finance/super-admins
configure every pricing lever for road and air transport. Four screens are in scope for this
delivery (confirmed by screens.jsx + HTML wireframe):

- **13.1 Road Fare Rules** — versioned rule library (list + editor). Each rule scopes to a
  service zone + vehicle class. Fields: base_fare, per_km, per_min, min_fare, free_km,
  free_min, waiting_per_min, cancel_fee, surge_cap, effective_from/to, time-of-day modifiers
  (JSON). Rules have three states: live / draft / past.
- **13.2 Fare Simulator** — trip inputs → backend pricing engine → line-item fare breakdown,
  optionally comparing multiple rule versions side-by-side.
- **13.3 Air Fare Rules** — per-route × aircraft-type: per_seat_base, min_pax, hourly_rate,
  baggage_per_kg, excess_baggage_cap, positioning_charge, night_halt_charge,
  fuel_surcharge_pct, tax_gst_pct. Categories: Shuttle / On-demand / Charter / VIP.
- **13.4 Taxes** — name, hsn_code, rate, jurisdiction, inclusive/exclusive, active/reserved.
  Hero strip with live MTD stats.

---

## Phase 2 — Audit

### What already exists
- NavRail: `pricing` nav item already registered (`id: 'pricing'`, path `/pricing`)
- Catalog: `service_zones`, `vehicle_classes`, `aircraft_types` models already exist
- Frontend: `admin-panel/src/pages/pricing/` directory exists but **empty**

### What needs to be built — from scratch
Backend:
- `backend/app/models/pricing.py` (3 models: PricingRule, AirFareRule, TaxRule)
- `backend/app/schemas/pricing.py`
- `backend/app/services/pricing_service.py`
- `backend/app/api/v1/endpoints/pricing.py`
- Router registration in `backend/app/api/v1/router.py`
- Alembic migration

Frontend:
- `admin-panel/src/services/pricingService.ts`
- `admin-panel/src/pages/pricing/RoadFareRulesPage.tsx`
- `admin-panel/src/pages/pricing/FareSimulatorPage.tsx`
- `admin-panel/src/pages/pricing/AirFareRulesPage.tsx`
- `admin-panel/src/pages/pricing/TaxesPage.tsx`
- Routes in `admin-panel/src/App.tsx`

---

## Phase 3 — Task list

### Backend
- BE-01: Create `pricing.py` SQLAlchemy models (PricingRule, AirFareRule, TaxRule)
- BE-02: Create `pricing.py` Pydantic schemas
- BE-03: Create `pricing_service.py` with all service methods
- BE-04: Create `pricing.py` FastAPI endpoint file
- BE-05: Register router in `router.py`
- BE-06: Alembic autogenerate migration (do NOT run it)

### Frontend
- FE-01: Create `pricingService.ts` (TypeScript types + service)
- FE-02: Build `RoadFareRulesPage.tsx` (screen 13.1)
- FE-03: Build `FareSimulatorPage.tsx` (screen 13.2)
- FE-04: Build `AirFareRulesPage.tsx` (screen 13.3)
- FE-05: Build `TaxesPage.tsx` (screen 13.4)
- FE-06: Register 4 routes in `App.tsx`
- FE-07: Run `npm run build` — zero TS errors

### Verify
- VF-01: Build check + API surface check + screen coverage check

---

## Phase 5 — Clarifications

| Question | Answer |
|---|---|
| Fare simulator: frontend vs backend engine? | **Backend engine** — POST /api/v1/pricing/simulate |
| Versioning: immutable rows vs mutable? | **Immutable rows** — publish creates new row, old becomes status=past |
| Time-of-day modifiers: JSON vs child table? | **JSON column** on pricing_rules |
| Service area: FK to service_zones or string? | **FK to service_zones** |

---

## Phase 6 — Agent execution

Both agents spawned in parallel with `isolation: worktree`, `run_in_background: true`.

---

## Phase 7 / 8 — TBD after agents complete
