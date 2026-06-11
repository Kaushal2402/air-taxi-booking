import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_theme/utbp_theme.dart';

// SCREEN 1.1 — Splash
// Full spec: .claude/module-logs/mobile-customer-01-auth/IMPLEMENTATION_BRIEF.md
//
// This screen is shown while auth state and branding are loading.
// Navigation away is handled entirely by the GoRouter redirect in
// app_router.dart — do NOT add manual context.go() calls here.
//
// When implementing: replace the CircularProgressIndicator with the full
// branded splash (forest bg, BrandMark 80px, decorative SVG, paging dots,
// version label). The screen must remain stateless-equivalent — it just
// renders, never navigates itself.

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand = ref.watch(brandingNotifierProvider).valueOrNull ??
        AppBrandConfig.fallback();

    return Scaffold(
      backgroundColor: brand.forest,
      body: const Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
    );
  }
}
