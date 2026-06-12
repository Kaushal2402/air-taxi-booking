// 3.3 Passenger Count Screen
// IMPLEMENTATION BRIEF: see .claude/module-logs/mobile-customer-03-booking/IMPLEMENTATION_BRIEF.md

import 'package:flutter/material.dart';

/// Screen 3.3 — Passenger Count + Fare Class
///
/// Uses PassengerStepperRow widgets for Adults/Children/Infants.
/// Fare class selector: Standard | Business | Charter (3 chips).
/// Shows price preview panel: {count} adults × ₹{perSeat} = ₹{total}
///   (computed from selectedFlight.fareMinor × adultCount — displayed only,
///    authoritative fare is confirmed in screen 3.7 from backend estimate).
///
/// Capacity note: max per flight's seatCapacity.
///
/// On "Search flights": bookingFlowProvider.notifier.setPassengerCounts(...)
///   then navigate to SearchResultsScreen (same flight list, just filtered)
class PassengerCountScreen extends StatelessWidget {
  const PassengerCountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(flutter-developer): implement full screen per IMPLEMENTATION_BRIEF
    return const Scaffold(
      body: Center(child: Text('Passenger Count — to be implemented')),
    );
  }
}
