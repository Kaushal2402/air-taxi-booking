import 'package:flutter/material.dart';

// SCREEN 2.6 — Notifications
// Full spec: .claude/module-logs/mobile-customer-02-home/IMPLEMENTATION_BRIEF.md
// Implement: serif "Notifications" header + "Mark all read" button,
// grouped by Today/Yesterday sections with date pill badge,
// notification item (colored icon circle, title/body, time, unread dot),
// read items at 60% opacity, empty state (bell icon + "You're all caught up."),
// bottom navigation bar.

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('NotificationsScreen — TODO')),
    );
  }
}
