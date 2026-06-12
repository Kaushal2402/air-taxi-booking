// 3.4 Search Results Screen
// IMPLEMENTATION BRIEF: see .claude/module-logs/mobile-customer-03-booking/IMPLEMENTATION_BRIEF.md

import 'package:flutter/material.dart';

/// Screen 3.4 — Search Results
///
/// Shows the list of AirFlight objects returned by availableFlightsProvider
/// for the chosen route + date. Sort bar: Price | Departure | Duration.
/// Filter button (bottom sheet — future).
///
/// Each flight card shows:
///   dep time, arr time, aircraft, seats left, price per seat
///   badge: "Best value" (lowest fare), "2 left" (≤2 seats), "Premium" (charter).
///
/// Forest header with BOM → PNQ summary + "Edit" button (returns to 3.2).
///
/// On flight card tap: bookingFlowProvider.notifier.setDateAndFlight(...)
///   then navigate to SeatMapScreen
class SearchResultsScreen extends StatelessWidget {
  const SearchResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(flutter-developer): implement full screen per IMPLEMENTATION_BRIEF
    return const Scaffold(
      body: Center(child: Text('Search Results — to be implemented')),
    );
  }
}
