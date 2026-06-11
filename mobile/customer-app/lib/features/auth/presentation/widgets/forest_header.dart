import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_theme/utbp_theme.dart';

/// Reusable forest-gradient header used by SignUpScreen and ProfileSetupScreen.
/// Shows an optional top nav row, an optional mono label, and a serif heading.
/// Decorative SVG rings are rendered via [CustomPaint].
///
/// [preHeadingContent] — appears between navBar and monoLabel (e.g. step tracker)
/// [extraContent] — appears after heading (legacy slot, kept for compatibility)
class ForestHeader extends ConsumerWidget {
  final Widget? navBar;
  final String? monoLabel;
  final String heading;
  final String? headingItalicSuffix;
  /// Rendered between the navBar and the mono label (e.g. step progress tracker).
  final Widget? preHeadingContent;
  /// Rendered after the heading (deprecated slot — prefer preHeadingContent).
  final Widget? extraContent;

  const ForestHeader({
    this.navBar,
    this.monoLabel,
    required this.heading,
    this.headingItalicSuffix,
    this.preHeadingContent,
    this.extraContent,
    super.key,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ??
        AppBrandConfig.fallback();
    final theme = Theme.of(context);

    return Container(
      clipBehavior: Clip.hardEdge,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [brand.forest, brand.forestDeep],
        ),
      ),
      child: Stack(
        children: [
          // Decorative rings
          Positioned.fill(
            child: CustomPaint(
              painter: _ForestRingsPainter(),
            ),
          ),
          // Content
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsetsDirectional.only(bottom: 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (navBar != null) navBar!,
                  Padding(
                    padding: const EdgeInsetsDirectional.only(
                      start: 28,
                      end: 28,
                      top: 4,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (preHeadingContent != null) ...[
                          preHeadingContent!,
                          const SizedBox(height: 12),
                        ],
                        if (monoLabel != null) ...[
                          Text(
                            monoLabel!.toUpperCase(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: Colors.white.withOpacity(0.38),
                              letterSpacing: 0.14 * 11,
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: heading,
                                style: theme.textTheme.displaySmall?.copyWith(
                                  color: Colors.white,
                                  fontSize: 36,
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                              if (headingItalicSuffix != null)
                                TextSpan(
                                  text: ' $headingItalicSuffix',
                                  style: theme.textTheme.displaySmall?.copyWith(
                                    color: Colors.white.withOpacity(0.72),
                                    fontSize: 36,
                                    fontWeight: FontWeight.w300,
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (extraContent != null) ...[
                          const SizedBox(height: 12),
                          extraContent!,
                        ],
                      ],
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

class _ForestRingsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.6;

    // Two rings anchored at top-right corner area
    canvas.drawCircle(
      Offset(size.width - 50, 20),
      120,
      paint,
    );
    canvas.drawCircle(
      Offset(size.width - 50, 20),
      80,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
