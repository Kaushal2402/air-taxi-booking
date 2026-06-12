// 3.6 Passenger Details Screen
// IMPLEMENTATION BRIEF: see .claude/module-logs/mobile-customer-03-booking/IMPLEMENTATION_BRIEF.md

import 'package:flutter/material.dart';

/// Screen 3.6 — Passenger Details
///
/// FlowStep header: Seats (done) → Details (current) → Payment.
/// Per passenger card (count = adultCount + childCount from draft).
///   P1: pre-filled from CustomerProfile (name, DOB, Aadhar from profile).
///     Header: "From account" with green checkCircle badge.
///   P2..N: empty fields, "Required" label.
///
/// Each card: Full name | Date of birth | ID / Passport fields.
/// Validation: fullName required, length ≥ 2; dateOfBirth format DD MMM YYYY.
///
/// On "Review booking": validate all fields,
///   bookingFlowProvider.notifier.updatePassenger(...) for each,
///   call fareEstimateProvider.notifier.fetch(...),
///   navigate to BookingSummaryScreen
class PassengerDetailsScreen extends StatelessWidget {
  const PassengerDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(flutter-developer): implement full screen per IMPLEMENTATION_BRIEF
    return const Scaffold(
      body: Center(child: Text('Passenger Details — to be implemented')),
    );
  }
}
