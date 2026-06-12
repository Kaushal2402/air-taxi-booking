# QA Audit Report — Module 03 Booking Flow (Customer App)
App: Customer | Audited: 2026-06-12 | Verdict: PARTIAL

---

## VERDICT: PARTIAL
Zero P1 blockers. 7 P2 issues must be resolved before release.
Shippable for internal testing only.

---

## P1 Blockers
None.

---

## P2 Issues (must fix before release)

### P2-1 — booking_providers.dart:365-374 — _resolveSubtype maps fareClass→serviceSubtype incorrectly
`FareClass.business` → `'helicopter_on_demand'` is a product-logic assumption with no spec backing.
`service_subtype` must come from route category (`AirRoute.category`), not fare class.
Fix (Senior): Store `routeCategory` on `BookingDraft` from route resolution. Refactor `_resolveSubtype` to use `draft.routeCategory`.

### P2-2 — booking_summary_screen.dart:29-31 — Idempotency key is not a UUID
`'${DateTime.now().millisecondsSinceEpoch}-${math.Random().nextInt(999999)}'` — not UUID format, collision-unsafe.
Fix (Dev): Add `uuid: ^4.4.0` to pubspec.yaml. Replace with `const Uuid().v4()`.

### P2-3 — auth_provider.dart:151-154 — Booking providers not reset on logout (PII leak)
`signOut()` does not clear `bookingFlowProvider`, `fareEstimateProvider`, `paymentMethodsProvider`, etc.
Passenger names and ID numbers persist across sessions — PII leak between users on same device.
Fix (Dev): Add `ref.read(bookingFlowProvider.notifier).reset()` + `ref.invalidate(...)` for all booking providers after `clearTokens()`.

### P2-4 — booking_service.dart:95-108 — getFareEstimate missing `service` field
Spec requires `service: "helicopter_shuttle" | "helicopter_on_demand"` in POST body.
All three call sites omit this field — will 422 when backend is live.
Fix (Senior): Tied to P2-1 resolution. Add `required String service` param, populate from `draft.routeCategory`.

### P2-5 — destination_picker_screen.dart:55-63 — No origin picker UI exists
`originCode` guard shows snackbar "select origin first" but there is no screen to select origin.
A new user can never proceed past this guard.
Fix (Senior): Add origin-picker screen (3.0) before DestinationPicker OR convert DestinationPicker to two-step combined picker.

### P2-6 — booking_widgets.dart:539 — FareRow currency missing grouping separators
`(amountMinor / 100).toStringAsFixed(0)` → outputs ₹100000 with no grouping (lakh/thousand separators).
Fix (Dev): Use `NumberFormat('#,##,##0', 'en_IN').format(amountMinor ~/ 100)`.

### P2-7 — passenger_details_screen.dart:98-112,353-369 — ID type not collected or sent
UI shows ID number field but no type selector. `id_type` never set in `PassengerInput`. Backend spec requires it.
Fix (Dev): Add `DropdownButtonFormField<String>` for Aadhar/Passport/PAN. Include in `updatePassenger` call.

---

## P3 Issues (cleanup, non-blocking)
- booking_summary_screen.dart:209 — 'Confirm & pay' hardcoded string (i18n)
- destination_picker_screen.dart:57 — Snackbar text hardcoded (i18n)
- passenger_count_screen.dart:47-49 — Price preview uses per-seat fareMinor not fare-class-adjusted price
- seat_map_screen.dart:216-222 — Seat map error fallback has no retry button

---

## Spec Coverage Summary

| Screen / Feature | Status |
|---|---|
| 3.1 Destination picker (search, recent, popular) | Covered |
| 3.1 Origin selection | MISSING (P2-5) |
| 3.2 Date & Time (calendar, slots) | Covered |
| 3.3 Passenger count + fare class | Covered |
| 3.4 Search results (sort, badges, states) | Covered |
| 3.4 Filter button | Partial (renders, no functionality) |
| 3.5 Seat map (grid, legend, FIFO) | Covered |
| 3.5 Seat map error/retry | Partial (P3-4) |
| 3.6 Passenger details + P1 pre-fill | Covered |
| 3.6 ID type selector | MISSING (P2-7) |
| 3.7 Booking summary + fare breakdown | Partial |
| 3.7 Promo code input | MISSING |
| 3.7 Fare estimate expiry check + countdown | MISSING (Senior) |
| 3.7 Idempotency key (UUID) | Partial (P2-2) |
| E-ticket / boarding pass after confirm | MISSING (Module 9 scope) |

---

## Backend Contract

| Endpoint | Path | Fields | Status |
|---|---|---|---|
| GET /app/search-history/air | Correct | OK | Stub |
| GET /app/air/destinations/popular | Correct | OK | Stub |
| GET /app/air/routes | Correct | OK | Stub |
| GET /app/air/flights | Correct | OK | Stub |
| GET /app/air/flights/{id}/seats | Correct | OK | Stub |
| POST /app/pricing/estimate | Correct | Missing `service` field (P2-4) | Stub |
| POST /app/air/bookings | Correct | Non-UUID idempotency key (P2-2), wrong service_subtype mapping (P2-1) | Stub |
| GET /app/payment-methods | Correct | OK | Stub |

Note: UtbpApiClient is a stub with no Dio instance or auth interceptor. Must be implemented before any endpoint works.

---

## State Hygiene

| Check | Result |
|---|---|
| Draft resets on logout | FAIL (P2-3) |
| clearFlight() on destination change | PASS |
| clearFareEstimate() available | PASS |
| Double-tap confirm guard | PASS |
| No dangling subscriptions/controllers | PASS |

---

## Cross-Surface Gaps (pre-existing, in CROSS_SURFACE_IMPACT.md)

| Surface | Gap | Priority |
|---|---|---|
| Admin Panel | No flight scheduling UI — flights list always empty | P1 for e2e testing |
| Admin Panel | `source="customer_app"` badge on bookings list | P1 |
| Admin Panel | Seat map configuration per aircraft type | P2 |
| Operator Panel | Customer booking notifications in operator queue | P1 |

---

## Sign-off Conditions

P2 #1, #2, #3, #4, #5, #6, #7 must all be fixed and re-audited.
Items #1, #4, #5 require flutter-senior-dev (architectural decisions).
Items #2, #3, #6, #7 can be fixed by flutter-developer.
