// 3.5 Seat Map Screen
// IMPLEMENTATION BRIEF: see .claude/module-logs/mobile-customer-03-booking/IMPLEMENTATION_BRIEF.md

import 'package:flutter/material.dart';

/// Screen 3.5 — Seat Map
///
/// Forest gradient header with aircraft name + "N / M selected" pill.
/// Cockpit nose SVG at top.
/// Dashed aircraft body outline containing SeatTile grid.
///   Rows × 2 cols, row count from flight seat capacity.
/// Legend: Available | Selected | Taken.
/// Selected seats summary bar at bottom with seat codes + total price.
///
/// Providers:
///   - seatMapProvider(flightId) — family, List<SeatInfo>
///   - bookingFlowProvider (reads selectedSeats, paxCount)
///
/// Tap SeatTile (available): toggle selection, max = totalPassengers.
/// On "Continue to details": bookingFlowProvider.notifier.setSelectedSeats(...)
///   then navigate to PassengerDetailsScreen
class SeatMapScreen extends StatelessWidget {
  const SeatMapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(flutter-developer): implement full screen per IMPLEMENTATION_BRIEF
    return const Scaffold(
      body: Center(child: Text('Seat Map — to be implemented')),
    );
  }
}
