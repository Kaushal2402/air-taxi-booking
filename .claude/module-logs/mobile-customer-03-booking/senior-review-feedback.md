# Senior Review Feedback — Module 03 Booking
Date: 2026-06-12
Verdict: CHANGES REQUIRED — 4 P1, 5 P2, 2 P3

---

## P1 Issues (blocking — must fix before QA)

### P1-1 — destination_picker_screen.dart:52 — Hardcoded origin 'BOM' + fake routeId
```dart
originCode: draft.originCode ?? 'BOM',
originName: draft.originName ?? 'Mumbai Juhu',
routeId: '${draft.originCode ?? 'BOM'}-$code',  // not a real UUID
```
Fix: Origin must come from auth profile home pad. routeId must be resolved by calling
`bookingService.getAirRoutes(originCode:, destinationCode:)` inside `_onDestinationSelected`
and using the returned route's real ID (backend UUID).

### P1-2 — search_results_screen.dart:596,680 — Hardcoded pad names 'Juhu' / 'Lohegaon'
```dart
Text('Juhu', ...)     // line 596
Text('Lohegaon', ...) // line 680
```
Fix: Add `originName` and `destinationName` params to `_FlightCard`. Pass `draft.originName ?? '—'`
and `draft.destinationName ?? '—'` from the ListView.builder call site.

### P1-3 — search_results_screen.dart:531-534 — `Colors.blue` hardcoded
```dart
return Colors.blue; // breaks white-label
```
Fix: Replace with `return cs.tertiary` or remove dead branch (it's unreachable since
`_badge` returns null when neither condition is true).

### P1-4 — booking_summary_screen.dart:795 — `Navigator.of(ctx).pop()` bypasses go_router
```dart
Navigator.of(ctx).pop();
```
Fix: Replace with `ctx.pop()` (go_router extension already imported).

---

## P2 Issues (fix in same pass)

### P2-1 — booking_widgets.dart:89,497 — Non-directional EdgeInsets.only()
Replace both with `EdgeInsetsDirectional.only(...)`.

### P2-2 — passenger_details_screen.dart:353-368 — initialValue + onChanged breaks on rebuild
`initialValue: controller.text` does not re-apply after first build.
Fix: Add `controller` param to `BookingInputField` and pass `_dobCtrl[idx]` / `_idCtrl[idx]` directly.

### P2-3 — booking_providers.dart:35-39 — Silent catch(_) swallows errors, retry buttons unreachable
Fix: Remove generic `catch (_)` fallback; only catch `UnimplementedError`.

### P2-4 — booking_summary_screen.dart:317 — Time from date-only DateTime always shows 12:00 AM
Fix:
```dart
final datePart = DateFormat('EEE, MMM d').format(draft.selectedDate!);
final timePart = draft.departureTime != null
    ? DateFormat('hh:mm a').format(DateTime.parse(draft.departureTime!).toLocal())
    : '';
final dateStr = timePart.isNotEmpty ? '$datePart · $timePart' : datePart;
```

### P2-5 — booking_models.dart — Hand-written copyWith can't clear nullable fields (locked stack violation)
Fix: Add explicit `clearFlight()` / `clearFareEstimate()` methods to `BookingFlowNotifier`
so stale state is cleared when user navigates back.

---

## P3 Issues (cleanup)

### P3-1 — Integer division truncates paise
`fareMinor ~/ 100` → use `(fareMinor / 100).toStringAsFixed(0)` consistently.

### P3-2 — fontFamily: 'IBMPlexMono' hardcoded in 8+ files
Deferred — will be swept in shared utbp_theme helper sprint.
