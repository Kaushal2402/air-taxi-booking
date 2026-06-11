import 'package:flutter/material.dart';

// SCREEN 1.7 — Forgot Password
// Full spec: .claude/module-logs/mobile-customer-01-auth/IMPLEMENTATION_BRIEF.md
// Implement: lock icon circle (mint bg), serif headline "Forgot your password?",
// body copy ("valid for 15 minutes"), email input (focused state),
// "Send reset link" CTA, "Back to sign in" footer link.

class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('ForgotPasswordScreen — TODO')),
    );
  }
}
