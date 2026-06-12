# Implementation Brief — Module 03 Booking (Customer App)
**Prepared by:** flutter-senior-dev
**Date:** 2026-06-12
**For:** flutter-developer

---

## Overview

Implement 7 screens for the air booking flow. The architecture layer (providers, services,
models, router entries) is complete. You write the screens and widgets only.

All screens are stubs at:
  mobile/customer-app/lib/features/booking/presentation/screens/

Shared widgets are at:
  mobile/customer-app/lib/features/booking/presentation/widgets/booking_widgets.dart

---

## Critical Rules (enforce on every screen)

1. ALL colors from Theme.of(context).colorScheme — NEVER Color(0xFF...) or hex strings.
2. ALL padding with EdgeInsetsDirectional — NEVER EdgeInsets.only(left:...).
3. NO business logic in widgets — call providers only.
4. NO raw Dio — services handle all HTTP.
5. Every screen needs: loading state (CircularProgressIndicator or Shimmer), empty state
   (EmptyState widget with descriptive message), error state (retry button + error message).
6. flutter analyze must be clean — no warnings.

---

## Color Reference (from Theme.of(context).colorScheme)

| Design token (screens.jsx) | Flutter equivalent |
|---|---|
| var(--forest) / var(--forest-3) | cs.primary.withOpacity(0.15) for headers use a gradient Container with cs.primary darkened |
| var(--emerald) | cs.primary |
| var(--ink) | cs.onSurface |
| var(--ink-3) | cs.onSurface.withOpacity(0.55) |
| var(--ink-4) | cs.onSurface.withOpacity(0.38) |
| var(--surface) | cs.surface |
| var(--surface-2) / surface-sunk | cs.surfaceContainerHighest |
| var(--bg) | cs.scaffoldBackgroundColor (Theme.of(context).scaffoldBackgroundColor) |
| var(--rule) | cs.outline |
| var(--rule-soft) | cs.outline.withOpacity(0.5) |
| var(--mint) | cs.primary.withOpacity(0.12) |
| var(--mint-2) | cs.primary.withOpacity(0.08) |
| #fff (button text on primary) | cs.onPrimary |
| var(--warn) | Theme.of(context).colorScheme.error |
| var(--info) | Colors.blue (only acceptable hardcoded value — info semantic) |

Forest gradient header: use a Container with BoxDecoration gradient using
  colors: [cs.primary darkened via HSLColor, cs.primary.withOpacity(0.9)]
  (see utbp_theme.dart UtbpColors.forest extension)

Import utbp_theme to access brand extension:
  import 'package:utbp_theme/utbp_theme.dart';
  final brand = ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
  final forest = brand.forest;     // darkened primary
  final jade = brand.jade;         // lighter primary

---

## Provider API

```dart
// Import from:
import '../../domain/providers/booking_providers.dart';

// --- Draft state (all screens read/write this) ---
final draft = ref.watch(bookingFlowProvider);                // BookingDraft
ref.read(bookingFlowProvider.notifier).setDestination(...)   // 3.1
ref.read(bookingFlowProvider.notifier).setDateAndFlight(...) // 3.2
ref.read(bookingFlowProvider.notifier).setPassengerCounts(...)// 3.3
ref.read(bookingFlowProvider.notifier).setSelectedSeats(...) // 3.5
ref.read(bookingFlowProvider.notifier).updatePassenger(i, p) // 3.6
ref.read(bookingFlowProvider.notifier).setFareEstimate(...)  // 3.7
ref.read(bookingFlowProvider.notifier).setPaymentMethod(...) // 3.7
ref.read(bookingFlowProvider.notifier).reset()               // post-booking

// --- Screen 3.1 ---
final recents  = ref.watch(recentDestinationsProvider);      // AsyncValue<List<RecentDestination>>
final popular  = ref.watch(popularDestinationsProvider);     // AsyncValue<List<PopularDestination>>

// --- Screen 3.2 ---
// Load on screen open:
ref.read(availableFlightsProvider.notifier).fetch(routeId: draft.routeId!, date: 'YYYY-MM-DD');
final flights  = ref.watch(availableFlightsProvider);        // AsyncValue<List<AirFlight>>

// --- Screen 3.5 ---
// Load on screen open:
ref.read(seatMapProvider.notifier).fetch(flightId);
final seats    = ref.watch(seatMapProvider);                 // AsyncValue<List<SeatInfo>>

// --- Screen 3.6 / 3.7 ---
// P1 profile pre-fill: read from authNotifierProvider
final auth     = ref.watch(authNotifierProvider).valueOrNull;
final profile  = auth?.profile;

// --- Screen 3.7 ---
final paymentMethods = ref.watch(paymentMethodsProvider);   // AsyncValue<List<PaymentMethod>>
final fareAsync      = ref.watch(fareEstimateProvider);     // AsyncValue<FareEstimate?>
// Trigger estimate fetch on screen open (if not already fetched):
ref.read(fareEstimateProvider.notifier).fetch(
  routeId: draft.routeId!, date: ..., paxCount: ..., fareClass: ..., seatCodes: ...
);
// Confirm booking:
final idempotencyKey = const Uuid().v4(); // use uuid package or generate from dart:math
final booking = await ref.read(createBookingProvider.notifier).confirm(idempotencyKey: idempotencyKey);
```

---

## Screen 3.1 — Destination Picker (destination_picker_screen.dart)

Entry from HomeScreen when user taps a helicopter service.

**Layout:**
- Forest gradient header (152deg, forest → forest-3).
  - SafeArea top padding.
  - Back button (chevron left, white).
  - Sub-label: "{originCode} → ?" (monospace, uppercase, white 38% opacity).
  - Title: "Flying to?" (serif display font, white, 30px).
- Search input (focused state by default, autoFocus: true):
  - 52px pill-shaped container.
  - 2px emerald border.
  - Mint-2 background.
  - emerald search icon left.
  - Text field + cursor.
- Scrollable list below:
  - "RECENT" section header (monospace uppercase, ink-4).
  - RecentDestination items: clock icon in surface-2 circle, city+pad, code mono.
  - "POPULAR DESTINATIONS" section header.
  - PopularDestination items: location icon in mint circle, city+"N routes available", code mono.
- MockKeyboard NOT needed — Flutter's native keyboard handles this.

**Interaction:**
- Search filters both lists by city/code match (client-side filter on fetched data).
- Tapping any item: calls notifier.setDestination(...) then context.push(AppRoutes.bookingDateTime).
- Loading state: shimmer rows for recents and popular.
- Empty popular state: "No destinations available" with refresh icon.

**Navigation:**
  context.push(AppRoutes.bookingDateTime)  — no extra needed (draft has routeId)

---

## Screen 3.2 — Date & Time (date_time_screen.dart)

**Layout:**
- StatusBar (light) + NavBar showBack title "Date & time".
- Route recap RoutePill("{originCode} → {destinationCode}").
- Calendar card (surface, rounded-xl, shadow-md):
  - Month nav: chevLeft, "Month Year" in serif, chevRight.
  - Day headers: S M T W T F S (monospace, ink-4).
  - 7-column grid of date cells. Today: mint bg + emerald border. Selected: primary bg white text. Past: ink-5 text (tappable=false).
- "Available times" subheader + date label.
- Horizontal row of time chips (72x52px). Each chip shows HH:MM + "N seats" subtitle.
  Selected chip: primary bg white text. Unselected: surface + rule border.
- Continue CTA pinned to bottom (BookingCTA).

**Interaction:**
- On month nav: advance/retreat selectedMonth state variable.
- On date tap: set selectedDate, call flights notifier fetch.
- On time chip tap: set selectedFlight from flights list.
- Continue enabled only when date + flight both selected.
- On continue: notifier.setDateAndFlight → context.push(AppRoutes.bookingPassengers).

---

## Screen 3.3 — Passenger Count (passenger_count_screen.dart)

**Layout:**
- StatusBar + NavBar title "Passengers".
- RoutePill with flight summary "{originCode} → {destinationCode} · {date} · {time}".
- Passenger card (surface, rounded-xl, rule border):
  - PassengerStepperRow for Adults (Age 12+), min 1, max 6.
  - PassengerStepperRow for Children (Age 2–11), min 0, max 5.
  - PassengerStepperRow for Infants (Under 2), min 0, max 2.
  - Dividers between rows.
- Info note (mint bg, emerald info icon, canopy text): "Aircraft carries up to N passengers."
  — populate N from draft.selectedFlight?.seatCapacity.
- Fare class selector: 3 horizontally arranged buttons (Standard | Business | Charter).
  Selected: primary bg. Unselected: surface + rule.
- Price preview panel (surface, rule border): "{adultCount} adults × ₹{perSeat}" + total.
  perSeat = draft.selectedFlight?.fareMinor / 100 formatted as integer.
  NOTE: this is a preview only — authoritative total is from backend estimate in 3.7.
- "Search flights" CTA.

**Interaction:**
- Stepper min/max enforced by PassengerStepperRow onDecrement/onIncrement callbacks.
- Total pax = adults + children must not exceed flight seatCapacity.
- On search flights: notifier.setPassengerCounts(...) → context.push(AppRoutes.bookingResults).

---

## Screen 3.4 — Search Results (search_results_screen.dart)

Reads the already-loaded availableFlightsProvider list and displays all flights for the
chosen route+date. This is NOT a new API call — data loaded in 3.2 is reused.

**Layout:**
- Forest header (full width):
  - NavBar dark + filter icon button (right).
  - BOM → PNQ with date + pax count (calendar + users icons).
  - "Edit" pill button that pops back to 3.2.
- Sort bar (below header): "Price" | "Departure" | "Duration" pills. Selected pill has
  surface-sunk bg + rule-strong border. Price is default sort.
- Filter button (forest bg).
- "N flights found" label (monospace uppercase ink-4).
- ListView of flight cards:
  - Card: surface bg, rounded-lg, rule border (1.5px).
    First card (best value): emerald border + focus-ring shadow.
  - Badge (absolute, top: -10): "Best value" (emerald), "2 left" (error/warn), "Premium" (info blue).
  - Dep time (24px bold) + origin pad name. Route line + helicopter icon + duration. Arr time + dest pad name.
  - Bottom divider row: aircraft model, seats left count | price (emerald, bold 18px).

**Interaction:**
- Sort: client-side sort of the flight list by price/departure/duration.
- On flight card tap: notifier.setDateAndFlight(date: selectedDate, flight: tappedFlight)
  → context.push(AppRoutes.bookingSeatMap).
- Loading: shimmer cards. Empty: "No flights available for this date" with date-picker hint.

---

## Screen 3.5 — Seat Map (seat_map_screen.dart)

**Layout:**
- Forest gradient header:
  - NavBar dark showBack title "Select seats".
  - Aircraft name (bold 22px white) + "{BOM} → {PNQ} · {time} · {tailNumber}" (mono, 45% white).
  - "N / M selected" pill (emerald border, emerald text).
- Main content card (surface, rounded-xl, shadow-md, rule border):
  - Cockpit nose: Container width 80, height 32, borderRadius 40/40/0/0, primary bg, helicopter icon.
  - Dashed aircraft body (rule-strong 2px dashed border, rounded-lg padding):
    - Grid of SeatTile widgets: 2 per row, rows from seatsAvailable length / 2.
      If seatMapProvider is empty/unimplemented: generate a 3-row×2-col grid from flight.seatCapacity.
  - Legend row: Available (emerald border) | Selected (emerald fill) | Taken (surface-sunk).
- Selected summary bar (surface, rule border):
  - "Seats {X} & {Y} selected" + position description.
  - Total price (emerald, bold 18px).
- "Continue to details" CTA.

**Interaction:**
- Tap available SeatTile: toggle to selected. Max selected = draft.totalPassengers.
- If max already selected, tapping another available seat deselects the earliest selected one
  (FIFO replacement) — UX decision: one-tap replacement.
- On continue: notifier.setSelectedSeats(selectedCodes) → context.push(AppRoutes.bookingPassengerDetails).

---

## Screen 3.6 — Passenger Details (passenger_details_screen.dart)

**Layout:**
- StatusBar + NavBar title "Passenger details".
- BookingFlowStep steps=['Seats','Details','Payment'] currentStep=1.
- ListView of passenger cards (count = draft.totalPassengers):
  - P1 card: 2px emerald border + focus-ring. Header with P1 badge (emerald circle) + "From account"
    checkCircle badge. Pre-fill from auth profile (name, DOB, Aadhar last 4 if available).
    "From account" badge visible only if P1 fields are pre-filled.
  - P2..N cards: 1.5px rule border. "Required" label. Empty fields.
  - Each card: BookingInputField for Full name, Date of birth (DD MMM YYYY format hint), ID/Passport.

**Interaction:**
- P1 pre-fill: on screen init, if draft.passengers[0].fullName is empty AND profile != null,
  call notifier.updatePassenger(0, PassengerInput(fullName: profile.name, ...)).
- Validation on "Review booking":
  - fullName: required, length >= 2.
  - At least name required; DOB + ID optional per deployment (do not block if empty — backend validates).
- On "Review booking": save all passenger inputs via notifier, call
  ref.read(fareEstimateProvider.notifier).fetch(...) with draft data,
  → context.push(AppRoutes.bookingSummary).

---

## Screen 3.7 — Booking Summary (booking_summary_screen.dart)

**Layout:**
- StatusBar + NavBar title "Review & pay".
- BookingFlowStep steps=['Seats','Details','Payment'] currentStep=2.
- Forest gradient flight summary card:
  - Date + time label (mono uppercase, 38% white).
  - Seats pill (emerald bg, emerald border, seat codes text).
  - BOM time + Juhu. Route line with plane icon + duration. PNQ time + destination.
  - Passenger name pills at bottom (each: user icon + name in white/translucent container).
- Fare breakdown card (surface, rounded-xl, rule border):
  - "Fare breakdown" section title.
  - FareRow for each line item in fareEstimate.lineItems.
  - Horizontal divider.
  - FareRow isTotal=true for Total.
  - If fareEstimate is null/loading: show shimmer rows.
- Payment method row (surface, rounded-xl, rule border):
  - Payment type icon + display text + sub-label.
  - "Change" button that shows a bottom sheet of paymentMethods.
  - If no payment methods: show "Add payment method" link.
- "Confirm & pay ₹{total}" CTA (58px, primary bg):
  - isLoading when createBookingProvider is loading.
  - On tap: if fareEstimate == null, re-fetch then confirm.
  - Generate UUID idempotency key before calling confirm.
  - On success: show success SnackBar, call notifier.reset(), navigate home.
  - On error: show error SnackBar with message, do NOT navigate.
- Legal footnote: "By confirming you agree to our Terms & Cancellation policy"
  (Terms + Cancellation policy in primary color, TextButton style).

---

## Navigation Flow Summary

  Home (tap helicopter)
    → 3.1 DestinationPickerScreen (push)
      → 3.2 DateTimeScreen (push, routeId in draft)
        → 3.3 PassengerCountScreen (push)
          → 3.4 SearchResultsScreen (push)
            → 3.5 SeatMapScreen (push)
              → 3.6 PassengerDetailsScreen (push)
                → 3.7 BookingSummaryScreen (push)
                  → Home (pop all on success)

All navigation uses context.push() not context.go() so back navigation works correctly.

---

## Error / Empty / Loading Requirements per Screen

| Screen | Loading | Empty | Error |
|---|---|---|---|
| 3.1 | Shimmer rows for recents + popular | "No destinations available" + retry | Generic error + retry |
| 3.2 | Shimmer time chips | "No flights available for this date — try another date" | Error + retry (re-fetches flights) |
| 3.3 | None (uses draft data) | N/A | Cap validation error shown inline |
| 3.4 | Shimmer cards | "No flights found — adjust filters or date" | Error + retry |
| 3.5 | CircularProgressIndicator centered | "Seat map unavailable" (show generic 2x3 grid disabled) | Error + retry |
| 3.6 | None (form screen) | N/A | Inline field validation only |
| 3.7 | Shimmer fare rows | "Could not load fare — tap to retry" | SnackBar on confirm failure |

---

## RTL Requirements

- All paddings: EdgeInsetsDirectional.fromSTEB(start, top, end, bottom).
- All Row children that have directional meaning: use MainAxisAlignment.start with Directionality-aware icon placement.
- Seat grid: use GridView, not manual Row — it auto-handles RTL.
- Route line "BOM → PNQ": swap arrow for RTL using Directionality.of(context) == TextDirection.rtl.

---

## Files to Create / Modify

### Create (implement screen bodies):
- mobile/customer-app/lib/features/booking/presentation/screens/destination_picker_screen.dart
- mobile/customer-app/lib/features/booking/presentation/screens/date_time_screen.dart
- mobile/customer-app/lib/features/booking/presentation/screens/passenger_count_screen.dart
- mobile/customer-app/lib/features/booking/presentation/screens/search_results_screen.dart
- mobile/customer-app/lib/features/booking/presentation/screens/seat_map_screen.dart
- mobile/customer-app/lib/features/booking/presentation/screens/passenger_details_screen.dart
- mobile/customer-app/lib/features/booking/presentation/screens/booking_summary_screen.dart

### Already created (DO NOT MODIFY):
- mobile/customer-app/lib/features/booking/data/models/booking_models.dart
- mobile/customer-app/lib/features/booking/data/services/booking_service.dart
- mobile/customer-app/lib/features/booking/domain/providers/booking_providers.dart
- mobile/customer-app/lib/features/booking/presentation/widgets/booking_widgets.dart
- mobile/customer-app/lib/core/router/app_router.dart (booking routes added)
