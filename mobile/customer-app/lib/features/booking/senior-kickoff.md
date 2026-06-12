# Senior Kickoff — Module 03 Booking (Customer App)
**Date:** 2026-06-12
**Branch:** mobile/customer-module-03-booking
**Phase:** flutter-senior-dev scaffold complete

---

## Module Summary

Module 03 implements the 7-screen air booking flow (helicopter + shuttle). Users pick a destination,
select a date and time slot, configure passengers and fare class, view search results, pick seats
on a visual seat map, fill passenger details (P1 pre-filled from profile), and reach a booking
summary with fare breakdown and payment confirmation.

The flow maps directly to the screens in the spec (screens.jsx):
  3.1 DestinationPicker → 3.2 DateTime → 3.3 PassengerCount → 3.4 SearchResults
  → 3.5 SeatMap → 3.6 PassengerDetails → 3.7 BookingSummary

---

## Spec vs Product Document Alignment

The task brief described Module 03 as the booking flow matching the screens.jsx spec.
The customer_app_product_document.md labels Module 03 as "Home & Service Selector" and
the air booking flow as Module 9 ("Air Booking"). The screens.jsx file is the PRIMARY
implementation reference per the execution brief. These 7 screens are confirmed as the
implementation target for this task regardless of product document numbering.

---

## Backend Contract Assessment

ALL booking flow endpoints are MISSING from the backend. The existing:
  - backend/app/api/v1/endpoints/air_bookings.py → admin-only (AdminUser dependency)
  - backend/app/api/v1/endpoints/pricing.py → admin-only
  - backend/app/api/v1/endpoints/catalog.py → admin-only

None are accessible to a customer JWT. Zero /api/v1/app/ endpoints exist currently.

Full backend change request documented in:
  mobile/customer-app/lib/features/booking/BACKEND_CHANGE_REQUEST.md

---

## Architecture Decisions

1. BookingDraft as a flat Notifier<BookingDraft> (not AsyncNotifier) — the draft is pure
   in-memory state accumulating across screens, not loaded from backend.

2. Separate provider per data entity (flights, seats, estimate, payment methods) rather than
   one monolithic booking provider — this gives screens independent loading states.

3. availableFlightsProvider uses a simple fetch() method rather than a family param because:
   - Record-type family params require Dart 3 + Riverpod 2.5+ — available but unnecessarily complex
   - The flight list is always for one route+date at a time (one at a time use case)
   - Simplifies flutter-developer consumption

4. No Freezed code-gen for booking models — keeping plain Dart classes avoids build_runner
   complexity during this scaffold phase. Can be migrated to Freezed in a later polish pass.

5. No offline queue for booking creation — the createAirBooking call uses an Idempotency-Key
   (UUID generated client-side before the call) which gives retry safety without needing drift
   queue. If connectivity is lost mid-call, the same key is reused on retry.

---

## Files Created

### data/models/
  booking_models.dart — AirRoute, AirFlight, SeatInfo/SeatState, PassengerInput,
                         FareLineItem, FareEstimate, AirBookingCreated, PaymentMethod,
                         RecentDestination, PopularDestination, BookingDraft, FareClass

### data/services/
  booking_service.dart — BookingService with 8 PENDING endpoint stubs

### domain/providers/
  booking_providers.dart — bookingServiceProvider, recentDestinationsProvider,
                            popularDestinationsProvider, availableFlightsProvider,
                            seatMapProvider, fareEstimateProvider, paymentMethodsProvider,
                            bookingFlowProvider (BookingDraft), createBookingProvider

### presentation/widgets/
  booking_widgets.dart — RoutePill, BookingFlowStep, BookingCTA, PassengerStepperRow,
                          BookingInputField, SeatTile, FareRow

### presentation/screens/ (stubs — flutter-developer fills bodies)
  destination_picker_screen.dart
  date_time_screen.dart
  passenger_count_screen.dart
  search_results_screen.dart
  seat_map_screen.dart
  passenger_details_screen.dart
  booking_summary_screen.dart

### Router (app_router.dart)
  Added 7 route constants and GoRoute entries:
  /booking/destination, /booking/date-time, /booking/passengers, /booking/results,
  /booking/seats, /booking/passenger-details, /booking/summary

---

## Cross-Surface Impacts Raised

  mobile/customer-app/lib/features/booking/CROSS_SURFACE_IMPACT.md

Key items:
  - Admin needs a flight scheduling UI (P1, blocking for live data)
  - Operator panel booking queue must handle customer-app source bookings
  - Admin aircraft types needs seat map configuration

---

## flutter analyze Status

Flutter/Dart not installed in this environment — manual review performed.
Key correctness checks:
  - All imports use correct relative paths matching actual file locations.
  - Riverpod: AsyncNotifier, Notifier, AsyncNotifierProvider, NotifierProvider — correct API.
  - No family providers (simplified to stateful notifier with fetch method).
  - BookingDraft.copyWith covers all fields.
  - Enum switch in _resolveSubtype: all FareClass cases covered — no missing branch.
  - No const constructor on BookingService (UtbpApiClient is not const).
  - All SeatInfo enum values covered in SeatTile widget.

---

## Deferred Items

1. Payment method creation (Razorpay SDK integration) — deferred to Module 14 (Payments).
   Screen 3.7 shows saved methods only; "Add payment method" flows into Module 14.

2. Promo code input — UI placeholder only; not wired to backend in this scaffold.
   Full promo integration in Module 16.

3. Offline queue for booking creation — Idempotency-Key provides retry safety;
   drift offline queue can be added when Module 06 road booking is built (shared spine).

4. Screen 3.4 filter bottom sheet — sort is implemented (client-side); filter by aircraft
   type / price range bottom sheet is a V2 enhancement.

5. Seat map auto-layout from aircraft type — backend needs seat_layout JSON field on AircraftType
   (raised in CROSS_SURFACE_IMPACT). Current implementation generates a dynamic grid from
   seatCapacity with generic seat codes.
