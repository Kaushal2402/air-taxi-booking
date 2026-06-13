// 4.5 — Booking Confirmed Screen
//
// Full success screen shown after payment is confirmed.
// Uses bookingConfirmationProvider (set by ProcessingScreen) to render
// the e-ticket card.
//
// Layout:
//   - Forest gradient hero with check circle + sparkle dots + booking ref
//   - E-ticket card (overlapping hero): route, seats, passengers, aircraft
//   - Perforated divider + QR placeholder + reference
//   - Action row: Download E-Ticket / Share / Add to Calendar
//   - "Back to home" text button → pops all booking + payment screens
//
// If bookingConfirmation is null (e.g. arrived here via deep link without
// a live session), show a fallback EmptyState with "Back to home" CTA.
//
// No business logic here — all state from providers.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../data/models/payment_models.dart';
import '../../domain/providers/payment_providers.dart';
import '../widgets/payment_widgets.dart';
import '../../../booking/domain/providers/booking_providers.dart';

class BookingConfirmedScreen extends ConsumerWidget {
  const BookingConfirmedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final confirmAsync = ref.watch(bookingConfirmationProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: confirmAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _FallbackState(cs: cs, tt: tt),
        data: (confirmation) {
          if (confirmation == null) {
            return _FallbackState(cs: cs, tt: tt);
          }
          return _ConfirmedBody(confirmation: confirmation, cs: cs, tt: tt);
        },
      ),
    );
  }
}

// ── Confirmed body ────────────────────────────────────────────────────────────

class _ConfirmedBody extends StatelessWidget {
  const _ConfirmedBody({
    required this.confirmation,
    required this.cs,
    required this.tt,
  });

  final BookingConfirmation confirmation;
  final ColorScheme cs;
  final TextTheme tt;

  void _onBackToHome(BuildContext context, WidgetRef ref) {
    // Reset booking flow and payment state on the way out
    ref.read(bookingFlowProvider.notifier).reset();
    ref.read(bookingConfirmationProvider.notifier).reset();
    ref.read(customerPaymentMethodsProvider.notifier).reset();
    context.go(AppRoutes.home);
  }

  void _onDownload(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('E-Ticket download — coming soon')),
    );
  }

  void _onShare(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Share — coming soon')),
    );
  }

  void _onAddToCalendar(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Add to Calendar — coming soon')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scaffoldBg = Theme.of(context).scaffoldBackgroundColor;
    final forestColor =
        HSLColor.fromColor(cs.primary).withLightness(0.12).toColor();
    final forestDeepColor =
        HSLColor.fromColor(cs.primary).withLightness(0.09).toColor();

    return Consumer(
      builder: (context, ref, _) => CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // ── Forest hero (SliverToBoxAdapter, not an AppBar so it doesn't shrink) ──
          SliverToBoxAdapter(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                // Forest gradient background
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: const Alignment(-0.5, -1.0),
                      end: const Alignment(0.5, 1.0),
                      colors: [forestColor, forestDeepColor],
                    ),
                  ),
                  child: SafeArea(
                    bottom: false,
                    child: Stack(
                      children: [
                        // Decorative rings
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _HeroRingsPainter(),
                          ),
                        ),

                        // Hero content
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                              40, 10, 40, 68),
                          child: Column(
                            children: [
                              // Check circle + sparkle dots
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  Container(
                                    width: 80,
                                    height: 80,
                                    decoration: BoxDecoration(
                                      color: cs.secondary.withOpacity(0.20),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: cs.secondary.withOpacity(0.40),
                                        width: 2,
                                      ),
                                    ),
                                    child: Icon(
                                      Icons.check_circle_rounded,
                                      size: 44,
                                      color: cs.secondary,
                                    ),
                                  ),
                                  // Sparkle dots
                                  for (final pos in [
                                    (-24.0, -10.0),
                                    (28.0, -14.0),
                                    (-18.0, 26.0),
                                    (26.0, 22.0),
                                  ])
                                    Positioned(
                                      left: pos.$1,
                                      top: pos.$2,
                                      child: Container(
                                        width: 6,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: HSLColor.fromColor(cs.primary)
                                              .withLightness(0.51)
                                              .toColor(),
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ),
                                ],
                              ),

                              const SizedBox(height: 16),

                              // "You're booked." serif headline
                              Text(
                                "You're booked.",
                                textAlign: TextAlign.center,
                                style: tt.displaySmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w400,
                                  letterSpacing: -0.025,
                                  height: 1.1,
                                ),
                              ),

                              const SizedBox(height: 6),

                              // Booking reference mono label
                              Text(
                                confirmation.bookingRef,
                                style: TextStyle(
                                  fontFamily: 'IBMPlexMono',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: HSLColor.fromColor(cs.primary)
                                      .withLightness(0.51)
                                      .toColor(),
                                  letterSpacing: 0.1,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── E-ticket card (overlapping hero by 44px) ───────────────────────
          SliverToBoxAdapter(
            child: Transform.translate(
              offset: const Offset(0, -44),
              child: Padding(
                padding:
                    const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                child: ETicketCard(
                  confirmation: confirmation,
                  scaffoldBg: scaffoldBg,
                ),
              ),
            ),
          ),

          // ── Action buttons row ─────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Transform.translate(
              offset: const Offset(0, -44),
              child: Padding(
                padding:
                    const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: _ActionButton(
                        icon: Icons.download_rounded,
                        label: 'E-Ticket',
                        isPrimary: true,
                        cs: cs,
                        tt: tt,
                        onTap: () => _onDownload(context),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ActionButton(
                        icon: Icons.share_rounded,
                        label: 'Share',
                        isPrimary: false,
                        cs: cs,
                        tt: tt,
                        onTap: () => _onShare(context),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ActionButton(
                        icon: Icons.calendar_today_rounded,
                        label: 'Add to cal',
                        isPrimary: false,
                        cs: cs,
                        tt: tt,
                        onTap: () => _onAddToCalendar(context),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Back to home ───────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Transform.translate(
              offset: const Offset(0, -44),
              child: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(
                    0, 16, 0, 36),
                child: Center(
                  child: TextButton.icon(
                    onPressed: () => _onBackToHome(context, ref),
                    icon: const Icon(Icons.home_rounded, size: 16),
                    label: const Text('Back to home'),
                    style: TextButton.styleFrom(
                      foregroundColor: cs.onSurface.withOpacity(0.6),
                      textStyle: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Action button ─────────────────────────────────────────────────────────────

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.isPrimary,
    required this.cs,
    required this.tt,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isPrimary;
  final ColorScheme cs;
  final TextTheme tt;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: isPrimary
              ? HSLColor.fromColor(cs.primary).withLightness(0.12).toColor()
              : cs.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isPrimary ? Colors.transparent : cs.outline,
            width: 1.5,
          ),
          boxShadow: isPrimary
              ? [
                  BoxShadow(
                    color: cs.primary.withOpacity(0.18),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isPrimary
                  ? Colors.white
                  : cs.onSurface.withOpacity(0.6),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: tt.labelSmall?.copyWith(
                fontWeight: FontWeight.w500,
                color: isPrimary
                    ? Colors.white
                    : cs.onSurface.withOpacity(0.6),
                letterSpacing: 0.04,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Fallback when confirmation is null ────────────────────────────────────────

class _FallbackState extends StatelessWidget {
  const _FallbackState({required this.cs, required this.tt});
  final ColorScheme cs;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) => Center(
        child: Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(40, 0, 40, 0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.check_circle_outline_rounded,
                size: 64,
                color: cs.primary.withOpacity(0.45),
              ),
              const SizedBox(height: 20),
              Text(
                'Booking confirmed',
                style: tt.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your booking details will appear here once '
                'the payment service is fully live.',
                textAlign: TextAlign.center,
                style: tt.bodyMedium?.copyWith(
                  color: cs.onSurface.withOpacity(0.55),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),
              OutlinedButton.icon(
                onPressed: () {
                  ref.read(bookingFlowProvider.notifier).reset();
                  ref.read(bookingConfirmationProvider.notifier).reset();
                  context.go(AppRoutes.home);
                },
                icon: const Icon(Icons.home_rounded),
                label: const Text('Back to home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Hero rings painter ────────────────────────────────────────────────────────

class _HeroRingsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.7
      ..color = Colors.white.withOpacity(0.04);

    canvas.drawCircle(Offset(cx, cy), 200, paint);
    canvas.drawCircle(Offset(cx, cy), 130, paint);
  }

  @override
  bool shouldRepaint(_HeroRingsPainter old) => false;
}
