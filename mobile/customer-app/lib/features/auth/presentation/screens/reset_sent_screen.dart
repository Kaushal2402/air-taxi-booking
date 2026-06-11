import 'package:flutter/material.dart';

// SCREEN 1.8 — Reset Link Sent
// Full spec: .claude/module-logs/mobile-customer-01-auth/IMPLEMENTATION_BRIEF.md
// Implement: centered success ring (checkCircle icon, mint bg, outer ring),
// serif headline "Check your inbox.", email address in mono font,
// "Open email app" CTA, resend countdown button,
// spam/expiry tip card, "Back to sign in" link.

class ResetSentScreen extends StatelessWidget {
  final String email;

  const ResetSentScreen({super.key, required this.email});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('ResetSentScreen($email) — TODO')),
    );
  }
}
