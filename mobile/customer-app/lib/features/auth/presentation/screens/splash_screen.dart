import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_theme/utbp_theme.dart';

// SCREEN 1.1 — Splash
// Forest background with BrandMark, serif heading, decorative SVG,
// paging dots, and version label.
// Navigation is handled entirely by GoRouter redirect — never calls context.go().

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ??
        AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      backgroundColor: brand.forest,
      body: Stack(
        children: [
          // Decorative layer
          Positioned.fill(
            child: CustomPaint(
              painter: _SplashDecorPainter(primaryColor: cs.primary),
            ),
          ),
          // Main content
          SafeArea(
            child: Column(
              children: [
                // Center lockup
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsetsDirectional.symmetric(
                        horizontal: 40,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // BrandMark
                          _BrandMark(),
                          const SizedBox(height: 32),
                          // "Acme"
                          Text(
                            'Acme',
                            style: theme.textTheme.displayLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w300,
                              fontSize: 52,
                              height: 1,
                              letterSpacing: -0.03 * 52,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          // "Mobility" italic
                          Text(
                            'Mobility',
                            style: theme.textTheme.displayLarge?.copyWith(
                              color: Colors.white.withOpacity(0.72),
                              fontWeight: FontWeight.w300,
                              fontStyle: FontStyle.italic,
                              fontSize: 52,
                              height: 1,
                              letterSpacing: -0.03 * 52,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 20),
                          // Tagline
                          Text(
                            'Your journey, elevated.',
                            style: theme.textTheme.displaySmall?.copyWith(
                              color: Colors.white.withOpacity(0.45),
                              fontStyle: FontStyle.italic,
                              fontSize: 18,
                              height: 1.4,
                              letterSpacing: 0.01 * 18,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                // Bottom section
                Padding(
                  padding: const EdgeInsetsDirectional.only(
                    start: 40,
                    end: 40,
                    bottom: 56,
                  ),
                  child: Column(
                    children: [
                      // Paging dots
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _Dot(active: true, primaryColor: cs.primary),
                          const SizedBox(width: 8),
                          _Dot(active: false, primaryColor: cs.primary),
                          const SizedBox(width: 8),
                          _Dot(active: false, primaryColor: cs.primary),
                        ],
                      ),
                      const SizedBox(height: 14),
                      // Version label
                      Text(
                        'ACME MOBILITY · V1.0',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.white.withOpacity(0.25),
                          fontSize: 11,
                          letterSpacing: 0.14 * 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets (kept small to stay within 200-line limit on root widget)
// ---------------------------------------------------------------------------

class _BrandMark extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withOpacity(0.35),
          width: 1,
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.explore,
          color: Colors.white,
          size: 46,
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  final bool active;
  final Color primaryColor;

  const _Dot({required this.active, required this.primaryColor});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: active ? 28 : 8,
      height: 8,
      decoration: BoxDecoration(
        color: active ? primaryColor : Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Decorative painter: concentric circles + dashed arcs + endpoint dots
// ---------------------------------------------------------------------------

class _SplashDecorPainter extends CustomPainter {
  final Color primaryColor;

  const _SplashDecorPainter({required this.primaryColor});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Concentric circles
    final circlePaint = Paint()
      ..color = Colors.white.withOpacity(0.04)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.6;

    for (final r in [310.0, 210.0, 110.0]) {
      canvas.drawCircle(Offset(cx, cy), r, circlePaint);
    }

    // Dashed arc 1
    _drawDashedPath(
      canvas,
      _buildArc1(size),
      Colors.white.withOpacity(0.08),
    );
    // Dashed arc 2
    _drawDashedPath(
      canvas,
      _buildArc2(size),
      Colors.white.withOpacity(0.06),
    );

    // Endpoint dots (small, white)
    final dotPaint1 = Paint()
      ..color = Colors.white.withOpacity(0.18)
      ..style = PaintingStyle.fill;
    final dotPaint2 = Paint()
      ..color = Colors.white.withOpacity(0.12)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(
      Offset(55 / 390 * size.width, 700 / 844 * size.height),
      4,
      dotPaint1,
    );
    canvas.drawCircle(
      Offset(345 / 390 * size.width, 180 / 844 * size.height),
      4,
      dotPaint1,
    );
    canvas.drawCircle(
      Offset(40 / 390 * size.width, 500 / 844 * size.height),
      3,
      dotPaint2,
    );
    canvas.drawCircle(
      Offset(355 / 390 * size.width, 330 / 844 * size.height),
      3,
      dotPaint2,
    );

    // Aircraft dot (primary colored)
    final acX = 250 / 390 * size.width;
    final acY = 305 / 844 * size.height;

    canvas.drawCircle(
      Offset(acX, acY),
      7,
      Paint()
        ..color = primaryColor.withOpacity(0.9)
        ..style = PaintingStyle.fill,
    );
    canvas.drawCircle(
      Offset(acX, acY),
      14,
      Paint()
        ..color = primaryColor.withOpacity(0.25)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    canvas.drawCircle(
      Offset(acX, acY),
      22,
      Paint()
        ..color = primaryColor.withOpacity(0.10)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.6,
    );
  }

  Path _buildArc1(Size size) {
    return Path()
      ..moveTo(55 / 390 * size.width, 700 / 844 * size.height)
      ..quadraticBezierTo(
        195 / 390 * size.width,
        300 / 844 * size.height,
        345 / 390 * size.width,
        180 / 844 * size.height,
      );
  }

  Path _buildArc2(Size size) {
    return Path()
      ..moveTo(40 / 390 * size.width, 500 / 844 * size.height)
      ..quadraticBezierTo(
        200 / 390 * size.width,
        560 / 844 * size.height,
        355 / 390 * size.width,
        330 / 844 * size.height,
      );
  }

  void _drawDashedPath(Canvas canvas, Path path, Color color) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    const dashLen = 5.0;
    const gapLen = 10.0;
    final metrics = path.computeMetrics();
    for (final metric in metrics) {
      double dist = 0;
      while (dist < metric.length) {
        final end = (dist + dashLen).clamp(0.0, metric.length);
        canvas.drawPath(
          metric.extractPath(dist, end),
          paint,
        );
        dist += dashLen + gapLen;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SplashDecorPainter old) =>
      old.primaryColor != primaryColor;
}
