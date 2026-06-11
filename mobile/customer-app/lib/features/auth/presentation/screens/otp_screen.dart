import 'package:flutter/material.dart';

// SCREEN 1.4 — OTP Verification
// Full spec: .claude/module-logs/mobile-customer-01-auth/IMPLEMENTATION_BRIEF.md
// Implement: phone icon circle, 6-box OTP entry (font-mono 30px),
// 60-second countdown timer with resend button (inactive until expired),
// "Use email instead" link, security tip card, Verify CTA.

class OtpScreen extends StatelessWidget {
  final String phone;

  const OtpScreen({super.key, required this.phone});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('OtpScreen($phone) — TODO')),
    );
  }
}
