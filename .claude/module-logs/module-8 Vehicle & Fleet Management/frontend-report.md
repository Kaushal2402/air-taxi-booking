# Module 8 — Vehicle & Fleet Management — Frontend Report

## Files Created

### Service layer
- `admin-panel/src/services/vehicleService.ts` — All types (Vehicle, VehicleDocument, VehicleMaintenance, VehicleDetail, VehicleListResponse, Vendor, VendorListResponse) and full service object covering vehicles, documents, maintenances, and vendors.

### Pages (all in `admin-panel/src/pages/vehicles/`)
- `VehicleDirectoryPage.tsx` — Screen 8.1: Segmented tabs, filter bar with search/status/doc_status selects, sort dropdown, responsive table (desktop) + card view (mobile), row ⋮ menu (Ground/Reactivate/Edit), GroundModal with reason input, AddVehicleModal with full form including class & vendor selects, CSV export.
- `VehicleDetailPage.tsx` — Screen 8.2: Hero card with car SVG silhouette + plate badge + 5-stat grid, tab bar (6 tabs), Overview tab (property grid), Documents tab (table per doc type with progress bar + days left + upload/lightbox actions) + side column cards (vehicle class, linked driver, owner, upcoming maintenance), status-conditional action buttons (Approve/Ground/Reactivate/Unlink), 6 modals (ReasonModal, ConfirmDialog ×3, LinkDriverModal, AddMaintenanceModal, ChangeClassModal, AddDocumentModal).
- `VendorDirectoryPage.tsx` — Screen 8.3: 4-stat hero strip, responsive 2-column card grid (1-col on mobile), each card with initials avatar, stats row, composition bar (placeholder 52/28/20%), contact info, Activate/Suspend/Reactivate actions, SuspendModal, CSV export.
- `VendorNewPage.tsx` — Vendor onboarding form with Company info section (name, city, phone, email) and Commercial section (commission_rate, commission_type, status), error banner, save/cancel in Shell actions and inline at bottom.

## Routes Registered in App.tsx

```
/vehicles              → VehicleDirectoryPage  (PrivateRoute)
/vehicles/vendors      → VendorDirectoryPage   (PrivateRoute)  ← registered BEFORE :id
/vehicles/vendors/new  → VendorNewPage         (PrivateRoute)
/vehicles/:id          → VehicleDetailPage     (PrivateRoute)
```

## TypeScript Issues Found and Fixed

1. **`getInitials` unused in VehicleDirectoryPage** — Function was defined but never used (VehicleCard built its own initials inline). Removed the dead function.
2. **`reloadDocs` unused in DriverDetailPage** (pre-existing, shown in git status as modified) — The function was declared but its only caller was replaced with a direct inline call. Removed the unused declaration to unblock the build.

## Design Decisions

- **VehicleDetailPage default tab** set to `'documents'` (index 1) per spec — the hero card/overview content is visible at all times, so Documents is the most useful landing tab.
- **Documents table** uses DOC_TYPE_ORDER to always show all 5 doc rows (rc, insurance, permit, fitness, puc), showing "Not uploaded" for missing docs rather than only showing existing records — matches the wireframe's fixed 5-row layout.
- **Days-left progress bar** normalized to 365 days max (capped at 100%) with warn color at <30 days and danger color when expired.
- **Composition bar** uses fixed placeholder percentages (52/28/20%) as specified — backend does not compute per-vendor composition.
- **Stats stubs** in VehicleDetailPage for Trips and Gross fare show '0' / '₹0' with a clear label indicating they're stubs pending the bookings module.
- **VehicleCard mobile initials** built from make+model (not a driver name) to keep cards contextually correct.
- **GroundModal and SuspendModal** follow the exact same ReasonModal pattern established in DriverDetailPage for UI consistency.
- **Upload inputs** per document in the documents table use hidden `<input type="file">` refs triggered by a button click, accepting image/* and application/pdf per the API spec.
- **Lightbox** implemented inline — clicking the eye icon on a document with an image_url shows the image fullscreen with a click-to-close overlay.
