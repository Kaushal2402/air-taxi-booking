# Module 8 — Vehicle & Fleet Management — Orchestrator Log

## Summary

Module 8 manages the full lifecycle of ground vehicles on the platform. It provides: (1) a **Vehicle Directory** (Screen 8.1) — searchable/filterable DataTable showing all registered vehicles with plate, make/model/year, vehicle class, owner/vendor, linked driver, document validity badge, odometer, and status; (2) a **Vehicle Detail page** (Screen 8.2) — hero stats card (odometer, trips, gross fare, last/next service), tabbed detail (Overview, Documents, Maintenance, Driver history, Trips, Audit), document compliance table (RC, Insurance, Permit, Fitness, PUC), vehicle class card, linked-driver card, owner card, and upcoming service card; and (3) a **Fleet Owners/Vendors page** (Screen 8.3) — summary strip, vendor cards with fleet composition bar, stats, commission, payout info, and action buttons. Business rules: vehicles with any expired mandatory document cannot be dispatched, linking/unlinking drivers is audit-logged, class reassignment recomputes eligibility.

---

## Phase 1 — Scope complete ✅

Files read:
- `Docs/ui/project/Acme Mobility Admin/Module 08 - screens.jsx`
- `Docs/admin_panel_product_document.md` — Module 8 section (lines 560–615)
- `memory/project_stack.md`
- `CLAUDE.md`

---

## Phase 2 — Audit ✅

### What already exists

**Backend:**
| Layer | File | Status |
|---|---|---|
| Model — Vehicle | `backend/app/models/vehicle.py` | ❌ Does not exist |
| Model — Vendor | `backend/app/models/vendor.py` | ❌ Does not exist |
| Schema — Vehicle | `backend/app/schemas/vehicle.py` | ❌ Does not exist |
| Service — Vehicle | `backend/app/services/vehicle_service.py` | ❌ Does not exist |
| Endpoint | `backend/app/api/v1/endpoints/vehicles.py` | ❌ Does not exist |
| Router | `backend/app/api/v1/router.py` | ❌ Not registered |
| VehicleClass (FK dep) | `backend/app/models/catalog.py` | ✅ Exists |
| Driver model (link dep) | `backend/app/models/driver.py` | ✅ Exists (has vehicle_class/plate strings) |

**Frontend:**
| Layer | File | Status |
|---|---|---|
| Service | `admin-panel/src/services/vehicleService.ts` | ❌ Does not exist |
| Vehicle Directory page | `admin-panel/src/pages/vehicles/` | ❌ Does not exist |
| Vehicle Detail page | — | ❌ Does not exist |
| Vendor Directory page | — | ❌ Does not exist |
| Routes in App.tsx | — | ❌ Not registered |
| NavRail entry | `id: 'vehicles', path: '/vehicles'` | ✅ Already in NavRail |

---

## Phase 6 — Agents complete ✅
- Backend agent: 4 models, 24 endpoints, migration file
- Frontend agent: 4 pages, vehicleService.ts, routes, 0 TS errors

## Phase 7 — Verification ✅
- Build: ZERO TypeScript errors
- 1 fix applied: migration UTCDateTime → sa.DateTime()
- 1 fix applied: VendorDirectoryPage useIsTablet added + used
- All API contract endpoints covered
- All screens covered
- All routes registered correctly (vendors before :id)

---

## Phase 3 — Task Breakdown ✅

### Backend Tasks
| ID | Task | File |
|---|---|---|
| BE-01 | Create Vehicle + VehicleDocument SQLAlchemy models | `backend/app/models/vehicle.py` |
| BE-02 | Create Vendor SQLAlchemy model | `backend/app/models/vendor.py` |
| BE-03 | Create Pydantic schemas (Vehicle, VehicleDocument, Vendor) | `backend/app/schemas/vehicle.py` |
| BE-04 | Create vehicle_service.py (all CRUD + actions) | `backend/app/services/vehicle_service.py` |
| BE-05 | Create vehicles.py endpoint (all routes incl. /vendors) | `backend/app/api/v1/endpoints/vehicles.py` |
| BE-06 | Register vehicles router in router.py | `backend/app/api/v1/router.py` |
| BE-07 | Create Alembic migration (create file only, do NOT run) | `backend/alembic/versions/` |

### Frontend Tasks
| ID | Task | File |
|---|---|---|
| FE-01 | Create vehicleService.ts (types + all API calls) | `admin-panel/src/services/vehicleService.ts` |
| FE-02 | Build VehicleDirectoryPage (Screen 8.1) | `admin-panel/src/pages/vehicles/VehicleDirectoryPage.tsx` |
| FE-03 | Build VehicleDetailPage (Screen 8.2) | `admin-panel/src/pages/vehicles/VehicleDetailPage.tsx` |
| FE-04 | Build VendorDirectoryPage (Screen 8.3) | `admin-panel/src/pages/vehicles/VendorDirectoryPage.tsx` |
| FE-05 | Register routes in App.tsx | `admin-panel/src/App.tsx` |

### Verify Task
| ID | Task |
|---|---|
| VF-01 | TypeScript build check + API contract coverage + screen coverage |

---

## Phase 5 — Clarifications ✅

### User decisions received:
1. **Detail tabs scope**: Documents only — only Documents tab is fully built; Maintenance tab, Driver history, Trips, Audit all show "Coming soon" placeholder
2. **Maintenance card**: Simple log — build `vehicle_maintenances` table; service card on right panel of detail page shows real records (add/edit)
3. **Vendor onboard UX**: Dedicated page → `/vehicles/vendors/new`
4. **Vehicle doc upload**: Full upload — multipart endpoint saves to `static/documents/`, stores `image_url` (same pattern as driver docs)

## Decisions Log
- Vehicle document types: rc, insurance, permit, fitness, puc
- Vehicle status enum: pending | active | suspended | retired
- Vehicle doc status: pending | ok | expiring | rejected | expired
- Maintenance simple log: milestone_label, milestone_km, scheduled_date, service_center, notes, status (pending/done/skipped)
- Vendor: name, city, phone, email, status, commission_rate, commission_type (percentage/flat)
- Vendor onboard: dedicated page `/vehicles/vendors/new`
- Driver link stored as `vehicle.linked_driver_id` FK; back-compat update `driver.vehicle_plate` + `driver.vehicle_class` on link
- Routes: `/vehicles`, `/vehicles/vendors`, `/vehicles/vendors/new`, `/vehicles/:id`
- `doc_status` is a computed field (worst status across vehicle's documents): ok | expiring | expired
