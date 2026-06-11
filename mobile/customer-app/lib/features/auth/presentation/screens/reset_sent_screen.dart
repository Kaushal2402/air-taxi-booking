import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';

// SCREEN 1.8 — Reset Link Sent
// Centered success ring, email address in mono style, "Open email app" CTA,
// resend countdown button (disabled), spam/expiry tip card.

class ResetSentScreen extends ConsumerWidget {
  final String email;

  const ResetSentScreen({required this.email, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ??
        AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(28, 24, 28, 56),
          child: Column(
            children: [
              // Success ring
              _SuccessRing(cs: cs, brand: brand),
              const SizedBox(height: 32),
              Text(
                'Check your inbox.',
                style: theme.textTheme.displaySmall?.copyWith(
                  fontSize: 36,
                  fontWeight: FontWeight.w400,
                  height: 1.1,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'A reset link has been sent to',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: cs.onSurface.withOpacity(0.55),
                  fontSize: 15,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                email,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: cs.onSurface.withOpacity(0.75),
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              // CTA buttons
              ElevatedButton(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Opening mail app...')),
                ),
                child: const Text('Open email app'),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: null,
                  style: TextButton.styleFrom(
                    disabledForegroundColor: cs.onSurface.withOpacity(0.38),
                    textStyle: theme.textTheme.bodyMedium?.copyWith(
                      fontSize: 14,
                    ),
                  ),
                  child: const Text('Resend in 00:48'),
                ),
              ),
              const Spacer(),
              // Info tip card
              _InfoTipCard(cs: cs, theme: theme),
              const SizedBox(height: 20),
              // Back to sign in
              TextButton.icon(
                onPressed: () => context.go(AppRoutes.signIn),
                icon: const Icon(Icons.arrow_back, size: 16),
                label: const Text('Back to sign in'),
                style: TextButton.styleFrom(
                  foregroundColor: cs.onSurface.withOpacity(0.75),
                  textStyle: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                    fontSize: 15,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

class _SuccessRing extends StatelessWidget {
  final ColorScheme cs;
  final AppBrandConfig brand;

  const _SuccessRing({required this.cs, required this.brand});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Outer ring
        Container(
          width: 116,
          height: 116,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: cs.primary.withOpacity(0.12),
              width: 1.5,
            ),
          ),
        ),
        // Inner circle
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: brand.mint,
            border: Border.all(
              color: cs.primary.withOpacity(0.2),
              width: 2,
            ),
          ),
          child: Center(
            child: Icon(
              Icons.check_circle_outline,
              size: 52,
              color: cs.primary,
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoTipCard extends StatelessWidget {
  final ColorScheme cs;
  final ThemeData theme;

  const _InfoTipCard({required this.cs, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsetsDirectional.fromSTEB(18, 16, 18, 16),
      decoration: BoxDecoration(
        color: cs.onSurface.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.info_outline,
            size: 18,
            color: cs.onSurface.withOpacity(0.55),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: "Check your spam folder if you don't see it. "
                        'The link expires in ',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.55),
                      fontSize: 13,
                      height: 1.55,
                    ),
                  ),
                  TextSpan(
                    text: '15 minutes',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.75),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  TextSpan(
                    text: '.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.55),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
