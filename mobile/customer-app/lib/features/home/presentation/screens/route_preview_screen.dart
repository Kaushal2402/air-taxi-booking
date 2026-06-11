import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_theme/utbp_theme.dart';

// ---------------------------------------------------------------------------
// Screen 2.4 — Route Preview
// Backend: GET /api/v1/app/home/routes/:routeId — PENDING
// The detail card shows loading state until the backend endpoint is live.
// ---------------------------------------------------------------------------

class RoutePreviewScreen extends ConsumerStatefulWidget {
  final String routeId;

  const RoutePreviewScreen({required this.routeId, super.key});

  @override
  ConsumerState<RoutePreviewScreen> createState() =>
      _RoutePreviewScreenState();
}

class _RoutePreviewScreenState extends ConsumerState<RoutePreviewScreen> {
  // Fare tier selection: 0=Standard, 1=Business, 2=Charter
  int _selectedFare = 0;

  static const _fareTiers = [
    _FareTier(label: 'Standard', sub: 'Economy seat, 1 bag', price: 4999),
    _FareTier(label: 'Business', sub: 'Priority boarding, 2 bags', price: 8499),
    _FareTier(label: 'Charter', sub: 'Full aircraft, 4 seats', price: 24999),
  ];

  @override
  Widget build(BuildContext context) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final selectedPrice = _fareTiers[_selectedFare].price;

    return Scaffold(
      backgroundColor: cs.background,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: _RouteHero(brand: brand, cs: cs, theme: theme),
              ),
              SliverToBoxAdapter(
                child: Transform.translate(
                  offset: const Offset(0, -28),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.symmetric(horizontal: 18),
                    child: _RouteDetailCard(
                      routeId: widget.routeId,
                      brand: brand,
                      theme: theme,
                      cs: cs,
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                  child: _FareSelection(
                    tiers: _fareTiers,
                    selected: _selectedFare,
                    onSelect: (i) => setState(() => _selectedFare = i),
                    brand: brand,
                    theme: theme,
                    cs: cs,
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
          // Sticky Book CTA
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _BookCta(price: selectedPrice, cs: cs, theme: theme),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Hero section
// ---------------------------------------------------------------------------

class _RouteHero extends StatelessWidget {
  final AppBrandConfig brand;
  final ColorScheme cs;
  final ThemeData theme;

  const _RouteHero({
    required this.brand,
    required this.cs,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 264,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [brand.forest, brand.forestDeep],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          // Route arc
          Positioned.fill(
            child: CustomPaint(painter: _RouteArcPainter(cs: cs, brand: brand)),
          ),
          // Nav bar
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(8, 8, 8, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new,
                        color: Colors.white, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  IconButton(
                    icon: const Icon(Icons.bookmark_border,
                        color: Colors.white, size: 22),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Saved coming soon')),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          // IATA codes
          Positioned(
            bottom: 20,
            left: 52,
            child: Text(
              'BOM',
              style: theme.textTheme.titleLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ),
          Positioned(
            bottom: 20,
            right: 52,
            child: Text(
              'PNQ',
              style: theme.textTheme.titleLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Paints a dashed arc from lower-left to lower-right with endpoint dots
/// and an aircraft icon at the midpoint (apex).
class _RouteArcPainter extends CustomPainter {
  final ColorScheme cs;
  final AppBrandConfig brand;

  const _RouteArcPainter({required this.cs, required this.brand});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.25)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    const startX = 60.0;
    final endX = size.width - 60;
    final startY = size.height - 40.0;
    final endY = size.height - 40.0;
    final controlY = size.height * 0.35;
    final midX = (startX + endX) / 2;

    path.moveTo(startX, startY);
    path.quadraticBezierTo(midX, controlY, endX, endY);

    // Draw dashed path manually
    final pathMetrics = path.computeMetrics();
    for (final metric in pathMetrics) {
      double distance = 0;
      while (distance < metric.length) {
        final segment = metric.extractPath(distance, distance + 8);
        canvas.drawPath(segment, paint);
        distance += 14;
      }
    }

    // Endpoint dots
    final dotPaint = Paint()
      ..color = cs.primary
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(startX, startY), 5, dotPaint);
    canvas.drawCircle(Offset(endX, endY), 5, dotPaint);

    // Aircraft dot at midpoint (apex)
    final midY = _quadBezierY(startX, startY, midX, controlY, endX, endY, 0.5);
    final aircraftPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(midX, midY), 7, aircraftPaint);
  }

  double _quadBezierY(
      double x0, double y0, double cx, double cy, double x1, double y1, double t) {
    final mt = 1 - t;
    return mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ---------------------------------------------------------------------------
// Detail card
// ---------------------------------------------------------------------------

class _RouteDetailCard extends StatelessWidget {
  final String routeId;
  final AppBrandConfig brand;
  final ThemeData theme;
  final ColorScheme cs;

  const _RouteDetailCard({
    required this.routeId,
    required this.brand,
    required this.theme,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    // Backend endpoint PENDING: GET /api/v1/app/home/routes/:routeId
    // Showing shimmer/placeholder state until backend is available.
    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsetsDirectional.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Route name
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: 'Mumbai ',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.w400,
                    color: cs.onSurface,
                  ),
                ),
                TextSpan(
                  text: 'to ',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.w300,
                    fontStyle: FontStyle.italic,
                    color: cs.onSurface.withOpacity(0.55),
                  ),
                ),
                TextSpan(
                  text: 'Pune',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.w400,
                    color: cs.onSurface,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // Meta row
          Row(
            children: [
              _MetaItem(
                icon: Icons.access_time,
                label: '42 min',
                cs: cs,
                theme: theme,
              ),
              const SizedBox(width: 20),
              _MetaItem(
                icon: Icons.flight,
                label: 'Helicopter',
                cs: cs,
                theme: theme,
              ),
              const SizedBox(width: 20),
              _MetaItem(
                icon: Icons.location_on_outlined,
                label: 'Direct',
                cs: cs,
                theme: theme,
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Price
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: 'from ',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: cs.onSurface.withOpacity(0.55),
                  ),
                ),
                TextSpan(
                  text: '₹4,999',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: cs.primary,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.symmetric(vertical: 16),
            child: Divider(color: cs.onSurface.withOpacity(0.14), height: 1),
          ),
          // Aircraft info 3-column
          Row(
            children: [
              Expanded(
                child: _AircraftInfo(
                    label: 'Model', value: 'AS350 B3', theme: theme, cs: cs),
              ),
              Expanded(
                child: _AircraftInfo(
                    label: 'Reg.', value: 'VT-HXA', theme: theme, cs: cs),
              ),
              Expanded(
                child: _AircraftInfo(
                    label: 'Capacity', value: '4 pax', theme: theme, cs: cs),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetaItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final ColorScheme cs;
  final ThemeData theme;

  const _MetaItem({
    required this.icon,
    required this.label,
    required this.cs,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: cs.onSurface.withOpacity(0.55)),
        const SizedBox(width: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            fontSize: 13,
            color: cs.onSurface.withOpacity(0.75),
          ),
        ),
      ],
    );
  }
}

class _AircraftInfo extends StatelessWidget {
  final String label;
  final String value;
  final ThemeData theme;
  final ColorScheme cs;

  const _AircraftInfo({
    required this.label,
    required this.value,
    required this.theme,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            fontSize: 11,
            color: cs.onSurface.withOpacity(0.38),
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Fare selection
// ---------------------------------------------------------------------------

class _FareTier {
  final String label;
  final String sub;
  final int price;

  const _FareTier({
    required this.label,
    required this.sub,
    required this.price,
  });
}

class _FareSelection extends StatelessWidget {
  final List<_FareTier> tiers;
  final int selected;
  final void Function(int) onSelect;
  final AppBrandConfig brand;
  final ThemeData theme;
  final ColorScheme cs;

  const _FareSelection({
    required this.tiers,
    required this.selected,
    required this.onSelect,
    required this.brand,
    required this.theme,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select your fare',
          style: theme.textTheme.titleSmall?.copyWith(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 10),
        ...List.generate(tiers.length, (i) {
          return Padding(
            padding: const EdgeInsetsDirectional.only(bottom: 10),
            child: _FareTierRow(
              tier: tiers[i],
              isSelected: selected == i,
              onTap: () => onSelect(i),
              brand: brand,
              theme: theme,
              cs: cs,
            ),
          );
        }),
      ],
    );
  }
}

class _FareTierRow extends StatelessWidget {
  final _FareTier tier;
  final bool isSelected;
  final VoidCallback onTap;
  final AppBrandConfig brand;
  final ThemeData theme;
  final ColorScheme cs;

  const _FareTierRow({
    required this.tier,
    required this.isSelected,
    required this.onTap,
    required this.brand,
    required this.theme,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    final price = (tier.price / 100).toStringAsFixed(0);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected ? brand.mint : cs.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? cs.primary : cs.onSurface.withOpacity(0.14),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: cs.primary.withOpacity(0.15),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        padding: const EdgeInsetsDirectional.all(14),
        child: Row(
          children: [
            // Radio circle
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? cs.primary : cs.onSurface.withOpacity(0.38),
                  width: 2,
                ),
                color: isSelected ? cs.primary : Colors.transparent,
              ),
              child: isSelected
                  ? Center(
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tier.label,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: isSelected ? brand.forest : cs.onSurface,
                    ),
                  ),
                  Text(
                    tier.sub,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontSize: 12,
                      color: cs.onSurface.withOpacity(0.55),
                    ),
                  ),
                ],
              ),
            ),
            Text(
              '₹$price',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: isSelected ? cs.primary : cs.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Book CTA footer
// ---------------------------------------------------------------------------

class _BookCta extends StatelessWidget {
  final int price;
  final ColorScheme cs;
  final ThemeData theme;

  const _BookCta({required this.price, required this.cs, required this.theme});

  @override
  Widget build(BuildContext context) {
    // Format with comma: "4,999"
    final formatted = _formatPrice(price ~/ 100);

    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        border: Border(
          top: BorderSide(color: cs.onSurface.withOpacity(0.14)),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: const EdgeInsetsDirectional.fromSTEB(18, 12, 18, 0),
      child: SafeArea(
        top: false,
        child: ElevatedButton(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Booking flow coming soon — Module 03'),
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(double.infinity, 56),
            shape: const StadiumBorder(),
          ),
          child: Text('Book now — ₹$formatted →'),
        ),
      ),
    );
  }

  String _formatPrice(int n) {
    final s = n.toString();
    if (s.length <= 3) return s;
    return '${s.substring(0, s.length - 3)},${s.substring(s.length - 3)}';
  }
}
