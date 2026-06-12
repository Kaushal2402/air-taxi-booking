// 3.7 Booking Summary Screen
// IMPLEMENTATION BRIEF: see .claude/module-logs/mobile-customer-03-booking/IMPLEMENTATION_BRIEF.md

import 'package:flutter/material.dart';

/// Screen 3.7 — Review & Pay (Booking Summary)
///
/// FlowStep header: Seats (done) → Details (done) → Payment (current).
///
/// Forest gradient flight summary card:
///   BOM → PNQ with dep/arr times + "Seats 2A & 3A" chip.
///   Passenger name pills at the bottom of the card.
///
/// Fare breakdown card (FareRow widgets):
///   Base fare × N, Airport fees, Platform fee, GST (5%).
///   Divider, then Total row (larger font, cs.primary color).
///
/// Payment method row: saved card/UPI/wallet display + "Change" button.
///   Tapping "Change" opens payment method selector (bottom sheet).
///
/// CTA "Confirm & pay ₹{total}" — 58px height.
///   On tap: generate UUID idempotencyKey,
///   call createBookingProvider.notifier.confirm(...),
///   on success: navigate to booking confirmation (future module).
///   on failure: show SnackBar with error.
///
/// Legal footnote with Terms + Cancellation policy links.
///
/// Providers:
///   - bookingFlowProvider (fareEstimate, selectedSeats, passengers)
///   - paymentMethodsProvider
///   - createBookingProvider (AsyncNotifier<AirBookingCreated?>)
class BookingSummaryScreen extends StatelessWidget {
  const BookingSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(flutter-developer): implement full screen per IMPLEMENTATION_BRIEF
    return const Scaffold(
      body: Center(child: Text('Booking Summary — to be implemented')),
    );
  }
}
