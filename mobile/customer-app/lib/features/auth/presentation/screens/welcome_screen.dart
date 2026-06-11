import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';

// SCREEN 1.2 — Welcome / Onboarding
// Forest gradient hero with SVG cityscape, service chips,
// and overlapping content card.

class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ??
        AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      // ignore: deprecated_member_use
      backgroundColor: theme.colorScheme.background,
      body: Column(
        children: [
          // Forest hero
          _WelcomeHero(brand: brand, cs: cs, theme: theme),
          // Overlapping content card
          Expanded(
            child: _WelcomeCard(cs: cs, theme: theme),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Hero section
// ---------------------------------------------------------------------------

class _WelcomeHero extends StatelessWidget {
  final AppBrandConfig brand;
  final ColorScheme cs;
  final ThemeData theme;

  const _WelcomeHero({
    required this.brand,
    required this.cs,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 460,
      child: Stack(
        children: [
          // Gradient background
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [brand.forest, brand.forestDeep],
                ),
              ),
            ),
          ),
          // SVG cityscape illustration
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: CustomPaint(
              size: const Size(390, 370),
              painter: _CityscapePainter(
                primaryColor: cs.primary,
                jadeColor: brand.jade,
              ),
            ),
          ),
          // Skip button
          Positioned(
            top: MediaQuery.of(context).padding.top + 14,
            right: 20,
            child: _SkipButton(),
          ),
          // Service chips
          Positioned(
            bottom: 62,
            left: 22,
            right: 0,
            child: _ServiceChipsRow(),
          ),
        ],
      ),
    );
  }
}

class _SkipButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go(AppRoutes.signIn),
      child: Container(
        height: 34,
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.12),
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: Colors.white.withOpacity(0.2),
          ),
        ),
        child: Center(
          child: Text(
            'Skip',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.white.withOpacity(0.75),
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}

class _ServiceChipsRow extends StatelessWidget {
  static const _chips = ['Helicopter', 'Charter', 'Shuttle', 'VIP'];

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: EdgeInsets.zero,
      child: Row(
        children: _chips.map((label) {
          return Container(
            margin: const EdgeInsetsDirectional.only(end: 8),
            padding: const EdgeInsetsDirectional.symmetric(
              horizontal: 13,
              vertical: 7,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.11),
              borderRadius: BorderRadius.circular(100),
              border: Border.all(
                color: Colors.white.withOpacity(0.17),
              ),
            ),
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Colors.white.withOpacity(0.82),
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Content card
// ---------------------------------------------------------------------------

class _WelcomeCard extends StatelessWidget {
  final ColorScheme cs;
  final ThemeData theme;

  const _WelcomeCard({required this.cs, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: -24),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.45),
            blurRadius: 56,
            offset: const Offset(0, -28),
          ),
        ],
      ),
      padding: const EdgeInsetsDirectional.fromSTEB(28, 28, 28, 36),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Slide dots
          Row(
            children: [
              for (int i = 0; i < 3; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                _SlideDot(active: i == 0, cs: cs),
              ],
            ],
          ),
          const SizedBox(height: 22),
          // Heading
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'Book your sky.',
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontSize: 38,
                    fontWeight: FontWeight.w400,
                    height: 1.08,
                    letterSpacing: -0.025 * 38,
                    color: cs.onSurface,
                  ),
                ),
                TextSpan(
                  text: ' Any time.',
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontSize: 38,
                    fontWeight: FontWeight.w300,
                    fontStyle: FontStyle.italic,
                    height: 1.08,
                    color: cs.onSurface.withOpacity(0.55),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // Subtitle
          Text(
            'Helicopters, private charters, and executive shuttles — '
            'booked in minutes. Premium air mobility, at your fingertips.',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontSize: 15.5,
              color: cs.onSurface.withOpacity(0.55),
              height: 1.65,
            ),
          ),
          const Spacer(),
          // CTA buttons
          ElevatedButton(
            onPressed: () => context.go(AppRoutes.signUp),
            child: const Text('Get started →'),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => context.go(AppRoutes.signIn),
              style: TextButton.styleFrom(
                foregroundColor: cs.onSurface.withOpacity(0.55),
                textStyle: theme.textTheme.bodyMedium?.copyWith(fontSize: 15),
              ),
              child: const Text('I already have an account'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SlideDot extends StatelessWidget {
  final bool active;
  final ColorScheme cs;

  const _SlideDot({required this.active, required this.cs});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: active ? 28 : 10,
      height: 4,
      decoration: BoxDecoration(
        color: active ? cs.primary : cs.onSurface.withOpacity(0.22),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Cityscape custom painter
// ---------------------------------------------------------------------------

class _CityscapePainter extends CustomPainter {
  final Color primaryColor;
  final Color jadeColor;

  const _CityscapePainter({
    required this.primaryColor,
    required this.jadeColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Building silhouettes
    final buildingPaint = Paint()..style = PaintingStyle.fill;

    void building(double x, double y, double w, double h, double opacity) {
      buildingPaint.color = Colors.white.withOpacity(opacity);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, y, w, h),
          const Radius.circular(2),
        ),
        buildingPaint,
      );
    }

    final H = size.height;
    building(18, H - 110, 28, 110, 0.04);
    building(52, H - 150, 38, 150, 0.06);
    building(98, H - 130, 24, 130, 0.04);
    building(130, H - 170, 32, 170, 0.05);
    building(230, H - 160, 36, 160, 0.05);
    building(274, H - 135, 24, 135, 0.04);
    building(306, H - 155, 44, 155, 0.06);
    building(358, H - 120, 32, 120, 0.04);

    // Route arcs (dashed)
    _drawDashed(
      canvas,
      Path()
        ..moveTo(75, H - 60)
        ..quadraticBezierTo(195, H - 280, 328, H - 180),
      Colors.white.withOpacity(0.14),
      1.4,
    );
    _drawDashed(
      canvas,
      Path()
        ..moveTo(50, H - 10)
        ..quadraticBezierTo(195, H - 240, 355, H - 120),
      Colors.white.withOpacity(0.07),
      1,
    );

    // Helipad A
    _helipad(canvas, 75, H - 60, primaryColor);
    // Helipad B
    _helipad(canvas, 328, H - 180, jadeColor);

    // Aircraft
    canvas.drawCircle(
      Offset(200, H - 196),
      7,
      Paint()
        ..color = Colors.white.withOpacity(0.95)
        ..style = PaintingStyle.fill,
    );
    canvas.drawCircle(
      Offset(200, H - 196),
      16,
      Paint()
        ..color = Colors.white.withOpacity(0.22)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8,
    );
  }

  void _helipad(Canvas canvas, double x, double y, Color color) {
    canvas.drawCircle(
      Offset(x, y),
      10,
      Paint()
        ..color = color.withOpacity(0.85)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4,
    );
    canvas.drawCircle(
      Offset(x, y),
      4,
      Paint()
        ..color = color.withOpacity(0.75)
        ..style = PaintingStyle.fill,
    );
    final linePaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 1.5;
    canvas.drawLine(Offset(x - 4, y), Offset(x + 4, y), linePaint);
    canvas.drawLine(Offset(x, y - 4), Offset(x, y + 4), linePaint);
  }

  void _drawDashed(Canvas canvas, Path path, Color color, double width) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = width;
    const dash = 7.0;
    const gap = 11.0;
    final metrics = path.computeMetrics();
    for (final m in metrics) {
      double d = 0;
      while (d < m.length) {
        final end = (d + dash).clamp(0.0, m.length);
        canvas.drawPath(m.extractPath(d, end), paint);
        d += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _CityscapePainter old) =>
      old.primaryColor != primaryColor || old.jadeColor != jadeColor;
}
