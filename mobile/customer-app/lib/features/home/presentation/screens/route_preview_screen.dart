import 'package:flutter/material.dart';

// SCREEN 2.4 — Route Preview
// Full spec: .claude/module-logs/mobile-customer-02-home/IMPLEMENTATION_BRIEF.md
// Implement: forest hero with route-arc SVG (BOM→PNQ dots + aircraft),
// detail card overlapping hero (-28px), aircraft info row (model/reg/capacity),
// pricing tier radio list (Standard/Business/Charter), sticky "Book now" CTA.

class RoutePreviewScreen extends StatelessWidget {
  final String routeId;

  const RoutePreviewScreen({super.key, required this.routeId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('RoutePreviewScreen($routeId) — TODO')),
    );
  }
}
