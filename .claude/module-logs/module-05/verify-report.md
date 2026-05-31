# Module 05 — Booking Management (Air) · Verify Report

Verified: 2026-05-31

---

## ✅ Passed

### API contract → backend routes (air_bookings.py)
- `GET /api/v1/bookings/air` → `list_air_bookings` endpoint present with all query params (page, page_size, search, status, service_subtype, operator_id, date_from, date_to, flagged)
- `GET /api/v1/bookings/air/{booking_id}` → `get_air_booking` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/assign-operator` → `assign_operator` endpoint present
- `GET /api/v1/bookings/air/{booking_id}/cancel-preview` → `cancel_preview` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/cancel` → `cancel_booking` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/reschedule` → `reschedule_booking` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/refund` → `process_refund` endpoint present
- `GET /api/v1/bookings/air/{booking_id}/manifest` → `get_manifest` endpoint present
- `PATCH /api/v1/bookings/air/{booking_id}/manifest` → `update_manifest` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/manifest/lock` → `lock_manifest` endpoint present
- `GET /api/v1/bookings/air/{booking_id}/quotes` → `list_quotes` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/quotes` → `add_quote` endpoint (201 status_code) present
- `POST /api/v1/bookings/air/{booking_id}/quotes/{quote_id}/push` → `push_quote` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/quotes/{quote_id}/decline` → `decline_quote` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/notes` → `add_note` endpoint present
- `POST /api/v1/bookings/air/{booking_id}/advance-status` → `advance_status` endpoint present
- `PATCH /api/v1/bookings/air/{booking_id}/flag` → `flag_booking` endpoint present

### API contract → service methods (air_bookings_service.py)
- All 17 service methods present and matching: `list_air_bookings`, `get_air_booking`, `assign_operator`, `cancel_preview`, `cancel_booking`, `reschedule_booking`, `process_refund`, `get_manifest`, `update_manifest`, `lock_manifest`, `list_quotes`, `add_quote`, `push_quote`, `decline_quote`, `add_note`, `advance_status`, `flag_booking`

### API contract → frontend service calls (airBookingsService.ts)
- All 17 service methods present: `listAirBookings`, `getAirBooking`, `assignOperator`, `cancelBooking`, `getCancelPreview`, `rescheduleBooking`, `processRefund`, `getManifest`, `updateManifest`, `lockManifest`, `listQuotes`, `addQuote`, `pushQuote`, `declineQuote`, `addNote`, `advanceStatus`, `flagBooking`

### Screens → page components
- Screen 5.1 (AirBookingsListScreen) → `AirBookingsPage.tsx` ✅
- Screen 5.2 (AirBookingDetailScreen) → `AirBookingDetailPage.tsx` ✅
- Screen 5.3 (QuoteOversightScreen) → `AirBookingQuotePage.tsx` ✅
- Screen 5.4 (AirCancelRescheduleScreen) → implemented as `CancelRescheduleModal` inside `AirBookingDetailPage.tsx` ✅

### Routes registered in App.tsx
- `/bookings/air` → `AirBookingsPage` ✅
- `/bookings/air/:id` → `AirBookingDetailPage` ✅
- `/bookings/air/:id/quotes` → `AirBookingQuotePage` ✅

### Responsive hooks
- `AirBookingsPage.tsx`: `useIsMobile()` and `useIsTablet()` imported and used ✅
- `AirBookingDetailPage.tsx`: `useIsMobile()` and `useIsTablet()` imported and used ✅
- `AirBookingQuotePage.tsx`: `useIsMobile()` and `useIsTablet()` imported and used ✅

### Shell wrapper
- `AirBookingsPage` wrapped in `<Shell activeId="bookings-a" ...>` ✅
- `AirBookingDetailPage` wrapped in `<Shell activeId="bookings-a" ...>` (including loading/error states) ✅
- `AirBookingQuotePage` wrapped in `<Shell activeId="bookings-a" ...>` ✅

### ConfirmDialog usage
- No `<ConfirmDialog>` is used in any of the three pages — cancel/reschedule is handled via a custom `CancelRescheduleModal` inline component, which avoids the ConfirmDialog prop pitfall entirely ✅

### import type for TypeScript interfaces
- `airBookingsService.ts` uses `export interface` for all types (not `import type` needed here — the types are defined locally in the file, not imported). No mixed-import violations.
- Pages use `import type { AirBookingDetail, AirBookingStatus, ... }` from the service file — correct pattern followed:
  - `AirBookingsPage.tsx` line 7: `import type { AirBookingListItem, AirBookingStats, AirBookingStatus }`
  - `AirBookingDetailPage.tsx` lines 7–12: `import type { AirBookingDetail, AirBookingStatus, CancelPreviewResponse, ManifestResponse }`
  - `AirBookingQuotePage.tsx` line 7: `import type { CharterQuote, AirBookingDetail }`

### from __future__ import annotations (Python)
- `backend/app/api/v1/endpoints/air_bookings.py` line 1: present ✅
- `backend/app/services/air_bookings_service.py` line 1: present ✅
- `backend/app/models/air_booking.py` line 1: present ✅

### Auth guard on every endpoint
- All 17 endpoints in `air_bookings.py` include `_: AdminUser = Depends(get_current_admin_user)` ✅

### Table overflow wrapping
- `AirBookingsPage.tsx`: `<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>` wrapping the table ✅
- `AirBookingDetailPage.tsx`: same pattern on manifest table ✅

---

## ⚠️ Issues

- `AirBookingDetailPage.tsx:642` — `manifest.total_weight_kg.toLocaleString()` and `manifest.mtow_kg.toLocaleString()` called without null guard. The `ManifestResponse` schema defines `total_weight_kg` and `mtow_kg` as non-optional (`number`), but the service implementation (`_manifest_response`) can pass `None` for `fuel_weight_kg` and `total_weight_kg` when they are zero. If the API returns `null` for these fields (due to schema mismatch), this will throw a runtime error.

- `AirBookingDetailPage.tsx:644` — `manifest.utilization_pct.toFixed(1)` called without null guard. The service can return `None` for `utilization_pct` (when `mtow` is null or zero), but the frontend TypeScript schema declares it as `number`. This would crash if the backend returns `null`.

- `airBookingsService.ts` (line ~283) — `listAirBookings` accepts `params?: ListAirBookingsParams` but `AirBookingsPage.tsx` passes `params: Record<string, string | number | boolean | undefined>` (a looser type) at line 112. This works at runtime but bypasses type safety for the query params.

- Screen 5.4 (`AirCancelRescheduleScreen`) is implemented as an inline modal inside `AirBookingDetailPage` rather than a standalone page. This matches the wireframe intent (overlay-on-list), but the `Object.assign(window, { AirCancelRescheduleScreen })` export in screens.jsx suggests it was meant as a discrete navigable screen. No dedicated route `/bookings/air/:id/cancel` exists. This is a minor structural deviation from the spec, but the functionality is present.

- `AirBookingDetailPage.tsx:658` — `s.v / manifest.mtow_kg` in the weight bar: `s.v` can be `null` (e.g. `manifest.aircraft_empty_weight_kg` is declared `number | null` in backend but `number` in frontend schema). Potential `NaN` bar widths.

---

## 🔴 Build errors

None detected from static analysis. All imports resolve to existing exports. No missing pages or broken routes identified. No prohibited ConfirmDialog props found. Python `from __future__ import annotations` guards are in place on all files using union types.
