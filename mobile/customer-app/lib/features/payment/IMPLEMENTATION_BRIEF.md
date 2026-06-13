# Implementation Brief — Module 04 Payment & Confirmation
**For:** flutter-developer
**Date:** 2026-06-13
**App:** Customer

## What is already built

The Senior has scaffolded the entire module. You should run the app, compare against
the screens.jsx wireframe, and fill in any visual/interaction gaps the brief calls out.
All architecture (providers, service stubs, router) is done. You should NOT:
- Add new providers
- Make raw Dio calls
- Hardcode Color(0xFF...) values or fontFamily strings other than 'IBMPlexMono'
- Add EdgeInsets.only/symmetric (use EdgeInsetsDirectional always)

## File map

```
mobile/customer-app/lib/features/payment/
├── data/
│   ├── models/payment_models.dart          ← DTOs — do not modify
│   └── services/payment_service.dart       ← Stubs — do not modify
├── domain/
│   └── providers/payment_providers.dart    ← Providers — do not modify
└── presentation/
    ├── screens/
    │   ├── payment_methods_screen.dart     ← 4.1 — CHECK AND POLISH
    │   ├── add_card_screen.dart            ← 4.2 — CHECK AND POLISH
    │   ├── upi_wallet_screen.dart          ← 4.3 — CHECK AND POLISH
    │   ├── processing_screen.dart          ← 4.4 — CHECK AND POLISH
    │   └── booking_confirmed_screen.dart   ← 4.5 — CHECK AND POLISH
    └── widgets/
        └── payment_widgets.dart            ← Shared — CHECK AND POLISH
```

## Color mapping (design token → Flutter)

| Design token (screens.jsx) | Flutter equivalent |
|---|---|
| var(--forest) | HSLColor.fromColor(cs.primary).withLightness(0.12).toColor() |
| var(--canopy) | HSLColor.fromColor(cs.primary).withLightness(0.18).toColor() |
| var(--jade) | HSLColor.fromColor(cs.primary).withLightness(0.51).toColor() |
| var(--emerald) | cs.primary |
| var(--ink) | cs.onSurface |
| var(--ink-2) | cs.onSurface.withOpacity(0.7) |
| var(--ink-3) | cs.onSurface.withOpacity(0.55) |
| var(--ink-4) | cs.onSurface.withOpacity(0.38) |
| var(--surface) | cs.surface |
| var(--surface-2) | cs.surfaceContainerHighest |
| var(--bg) | Theme.of(context).scaffoldBackgroundColor |
| var(--rule) | cs.outline |
| var(--rule-strong) | cs.onSurface.withOpacity(0.20) |
| var(--mint) | cs.primary.withOpacity(0.08) |
| var(--mint-2) | cs.primary.withOpacity(0.06) |
| var(--ok) | cs.secondary |
| var(--ok-soft) | cs.secondary.withOpacity(0.12) |
| var(--focus-ring) | BoxShadow(color: cs.primary.withOpacity(0.15), blurRadius: 8) |
| var(--shadow-sm) | BoxShadow(color: cs.onSurface.withOpacity(0.04), blurRadius: 4) |
| var(--shadow-lg) | BoxShadow(color: cs.onSurface.withOpacity(0.08), blurRadius: 20, offset: Offset(0, 4)) |
| var(--r-lg) | BorderRadius.circular(16) |
| var(--r-md) | BorderRadius.circular(14) |
| var(--r-sm) | BorderRadius.circular(10) |
| var(--r-pill) | BorderRadius.circular(100) or StadiumBorder() |
| var(--font-mono) | fontFamily: 'IBMPlexMono' |
| var(--font-serif) | Theme.of(context).textTheme.displaySmall (uses displayFont from config) |
| var(--font-sans) | Theme.of(context).textTheme.bodyMedium (uses textFont from config) |

NEVER use Color(0xFF...) directly in screens or widgets.

## Provider API reference

```dart
// All from: ../../domain/providers/payment_providers.dart

// Payment methods list
final customerPaymentMethodsProvider = AsyncNotifierProvider<CustomerPaymentMethodsNotifier, List<CustomerPaymentMethod>>
  .refresh()  // re-fetch after add/delete
  .deleteMethod(String id)  // optimistic delete
  .reset()  // on logout

// Selected method for this transaction
final selectedPaymentMethodIdProvider = StateProvider<String?>
  // set: ref.read(selectedPaymentMethodIdProvider.notifier).state = id;
  // read: ref.watch(selectedPaymentMethodIdProvider)

// Razorpay order
final razorpayOrderProvider = AsyncNotifierProvider<RazorpayOrderNotifier, RazorpayOrder?>
  .initiate({estimateRef, paymentMethodId, bookingSummary})
  .reset()

// Booking confirmation (set by ProcessingScreen after confirm succeeds)
final bookingConfirmationProvider = AsyncNotifierProvider<BookingConfirmationNotifier, BookingConfirmation?>
  .confirm({razorpayPaymentId, razorpayOrderId, razorpaySignature, bookingRef})
  .reset()

// UPI VPA verification
final upiVerificationProvider = AsyncNotifierProvider<UpiVerificationNotifier, UpiVerificationResult?>
  .verify(String vpa)  // debounce 800ms in screen
  .clear()

// Acme Miles toggle
final acmeMilesAppliedProvider = StateProvider<bool>
```

## Per-screen implementation notes

### 4.1 PaymentMethodsScreen (payment_methods_screen.dart)

Navigation entry: GoRouter extra {'fareAmountMinor': int, 'estimateRef': String}

Loading state: CircularProgressIndicator.
Error state: Column with error icon + message + Retry button (calls notifier.refresh()).
Empty state (no saved methods): show "No saved cards yet." text + Add new card button prominent.

Saved cards list:
- Show only methods where type == 'card' in the PaymentMethodTile list
- UPI methods saved from 4.3 should be shown in a separate "Saved UPI" section below
  (use type == 'upi' filter). Add this section after the divider if any UPI methods exist.
- The default method should be auto-selected when selectedPaymentMethodIdProvider is null

UPI apps grid:
- 4 buttons in a Row with equal flex — PhonePe, GPay, Paytm, BHIM
- Colors are brand-specific (hardcoded in the constant record list) — this is correct
- Tapping any UPI app navigates to UPIWalletScreen with preferredApp set

Acme Miles toggle:
- Balance and credit come from walletProvider (Module 15) — for now hardcoded to 2450 pts = ₹245
- When acmeMilesAppliedProvider is true, add visual "₹245 applied" hint under the total

Pay CTA:
- Label: "Pay ₹{amount} securely" with lock icon
- If no method selected and no methods exist, CTA navigates to AddCardScreen instead of ProcessingScreen

RTL: All padding/margin via EdgeInsetsDirectional. FlowStep connector line direction is RTL-aware.

### 4.2 AddCardScreen (add_card_screen.dart)

CardPreviewWidget updates live as user types (already wired via setState).
Expiry field: auto-format to "MM / YY" — digits only input, insert " / " after 2 digits.
CVV field: obscureText: true, max 4 digits.
"Save for future payments" Switch: green when on (cs.primary).
CTA disabled until all 4 fields pass format validation.

On submit (stub):
- Show snackbar: "Card tokenization requires Razorpay SDK — backend pending."
- Navigate to ProcessingScreen with paymentMethodId: null

When backend is live: Replace stub with Razorpay.openCheckout for card tokenization,
then call PaymentService.addCard(token, saveCard), then navigate to ProcessingScreen
with the returned CustomerPaymentMethod.id.

RTL: Card preview fields (name + expiry) use Row with MainAxisAlignment.spaceBetween.

### 4.3 UPIWalletScreen (upi_wallet_screen.dart)

UPI ID input:
- Debounce verification at 800ms using Timer (already implemented in initState/onChange)
- Show loading spinner in suffix during verification
- Show green checkmark + account name when verified (upiVerificationProvider.value?.isValid == true)
- Show red error when invalid

Quick UPI app row: 4 equal-flex buttons. Tapping navigates directly to ProcessingScreen
with a 'preferredUpiApp' extra param (Razorpay SDK will open that specific app).

Wallet list: Radio-selectable. Selecting a wallet deselects UPI ID and vice versa
(if wallet is selected, VPA field is visually de-focused).

Pay CTA enabled when:
- upiVerificationProvider.value?.isValid == true, OR
- _selectedWalletName != null

RTL: Wallet radio button is at the end (trailing).

### 4.4 ProcessingScreen (processing_screen.dart)

Non-dismissible (PopScope canPop: false — already set).
ProcessingSpinner uses SingleTickerProviderStateMixin — already implemented.
ProgressDots use their own SingleTickerProviderStateMixin — already implemented.

The screen auto-advances via _startPaymentFlow() called in initState → postFrameCallback.
Do NOT add any user-interactive elements.

In stub mode (UnimplementedError): waits 3 seconds, then navigates to bookingConfirmed.

When backend is live: The Razorpay.open() call goes here, with success/failure callbacks
wired to _onRazorpaySuccess / _onRazorpayFailure. Do not add Razorpay SDK calls yet —
that work is deferred to when the backend exists.

Amount display: forest background means text must be white or white with opacity.
cs.secondary (emerald) for the amount text.

Security note: Colors.white.withOpacity(0.30) — monospace font.

### 4.5 BookingConfirmedScreen (booking_confirmed_screen.dart)

If bookingConfirmationProvider.value is null: show _FallbackState (already implemented).

E-ticket card:
- ETicketCard widget receives confirmation + scaffoldBg (for notch circles)
- QR code is a placeholder icon — the real QR data would be bookingRef encoded
  (implement qr_flutter once that package is approved, or keep as placeholder)
- Perforated notch circles: use scaffoldBg color so they visually "punch out" of the card

Action buttons:
- "E-Ticket" (primary/forest): onTap shows "coming soon" snackbar
- "Share": onTap shows "coming soon" snackbar
- "Add to cal": onTap shows "coming soon" snackbar

"Back to home":
- Calls bookingFlowProvider.reset() + bookingConfirmationProvider.reset() + customerPaymentMethodsProvider.reset()
- Then context.go(AppRoutes.home)  — NOT context.pop() (must clear the whole stack)

RTL: The action row buttons use equal Expanded flex. The hero sparkle dots are positioned
using hard offsets from the check circle center — these are RTL-neutral (visual decoration only).

## Error / Loading / Empty state requirements

| Screen | Loading | Error | Empty |
|---|---|---|---|
| 4.1 | CircularProgressIndicator centered | _ErrorState with Retry | Text "No saved cards yet." + Add button prominent |
| 4.2 | ElevatedButton spinner | Snackbar (cs.error bg) | N/A |
| 4.3 | Suffix spinner in UPI field | Text below field in cs.error | N/A |
| 4.4 | Always in loading state (no retry — just shows spinner until done) | Pop + snackbar | N/A |
| 4.5 | CircularProgressIndicator | _FallbackState | _FallbackState |

## RTL requirements

1. All padding: EdgeInsetsDirectional.fromSTEB() — NOT EdgeInsets.only()
2. All symmetric padding: EdgeInsetsDirectional.symmetric() or fromSTEB(x,y,x,y)
3. FlowStep connector lines: already use EdgeInsetsDirectional.only(bottom: 18) in BookingFlowStep
4. Row children that have a "start" and "end" concept: verify with Directionality.rtl wrap in tests
5. The e-ticket card Route (BOM → PNQ) uses Icons.arrow_forward_rounded — this should be
   Icons.arrow_forward_rounded in LTR and swapped to Icons.arrow_back_rounded in RTL.
   Use Directionality.of(context) to check, or use a Bidirectional arrow icon.

## Files to create or modify

You must only modify these files (already created):
- payment_methods_screen.dart
- add_card_screen.dart
- upi_wallet_screen.dart
- processing_screen.dart
- booking_confirmed_screen.dart
- payment_widgets.dart

Do NOT create new files. Do NOT modify:
- payment_models.dart
- payment_service.dart
- payment_providers.dart
- app_router.dart

## Before marking work done

Run `flutter analyze mobile/customer-app` — must be zero warnings, zero errors.
