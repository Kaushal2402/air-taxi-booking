// 3.1 Destination Picker Screen
// IMPLEMENTATION BRIEF: see .claude/module-logs/mobile-customer-03-booking/IMPLEMENTATION_BRIEF.md
// This stub file is created by flutter-senior-dev.
// flutter-developer must replace the body with the full implementation.

import 'package:flutter/material.dart';

/// Screen 3.1 — Destination Picker
///
/// Entry point into the booking flow. The user types a destination and
/// sees recent destinations (last 10) and popular destinations.
///
/// Navigation:
///   - Back: context.pop()
///   - On destination selected: navigate to DateTimeScreen with routeId
///     context.push(AppRoutes.bookingDateTime, extra: {'routeId': routeId})
///
/// Providers to watch:
///   - recentDestinationsProvider (AsyncNotifierProvider<_, List<RecentDestination>>)
///   - popularDestinationsProvider (AsyncNotifierProvider<_, List<PopularDestination>>)
///
/// Also updates: bookingFlowProvider.notifier.setDestination(...)
class DestinationPickerScreen extends StatelessWidget {
  const DestinationPickerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO(flutter-developer): implement full screen per IMPLEMENTATION_BRIEF
    return const Scaffold(
      body: Center(child: Text('Destination Picker — to be implemented')),
    );
  }
}
