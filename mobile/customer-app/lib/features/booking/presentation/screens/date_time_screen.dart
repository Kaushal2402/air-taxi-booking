// 3.2 Date & Time Screen
// IMPLEMENTATION BRIEF: see .claude/module-logs/mobile-customer-03-booking/IMPLEMENTATION_BRIEF.md

import 'package:flutter/material.dart';

/// Screen 3.2 — Date & Time Selector
///
/// Calendar + time slot picker. Calendar shows available month; time chips
/// show available flight slots returned from getAvailableFlights.
///
/// Entry params (from GoRouter extra):
///   routeId (String) — selected route from 3.1
///
/// Providers:
///   - bookingFlowProvider (reads .routeId, .originCode, .destinationCode)
///   - availableFlightsProvider(routeId, date) — family notifier
///
/// On continue: bookingFlowProvider.notifier.setDateAndFlight(...)
///   then navigate to PassengerCountScreen
class DateTimeScreen extends StatelessWidget {
  const DateTimeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(flutter-developer): implement full screen per IMPLEMENTATION_BRIEF
    return const Scaffold(
      body: Center(child: Text('Date & Time — to be implemented')),
    );
  }
}
