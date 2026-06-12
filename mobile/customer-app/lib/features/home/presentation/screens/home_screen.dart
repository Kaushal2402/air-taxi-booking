import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';
import '../../../../features/auth/domain/auth_provider.dart';
import '../../domain/home_models.dart';
import '../../domain/home_providers.dart';
import '../widgets/avail_badge.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/section_header.dart';
import '../widgets/shimmer_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String? _selectedServiceType;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      backgroundColor: cs.background,
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _HomeHeader()),
                SliverToBoxAdapter(child: _QuickBookCard()),
                SliverToBoxAdapter(
                  child: _ServiceChipsRow(
                    selectedType: _selectedServiceType,
                    onTypeSelected: (id) {
                      setState(() => _selectedServiceType = id);
                      ref
                          .read(popularRoutesProvider.notifier)
                          .filterByServiceType(id);
                    },
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(18, 20, 18, 0),
                    child: _UpcomingTripSection(),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(18, 24, 18, 0),
                    child: _PopularRoutesHeader(),
                  ),
                ),
                SliverToBoxAdapter(child: _PopularRoutesSection()),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
          ),
          UtbpBottomNav(activeTab: 'home'),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Forest hero header
// ---------------------------------------------------------------------------

class _HomeHeader extends ConsumerWidget {
  const _HomeHeader();

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final authState = ref.watch(authNotifierProvider).valueOrNull;
    final profile = authState?.profile;
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    final firstName = profile?.name.split(' ').first ?? 'there';
    final initial =
        (profile?.name.isNotEmpty == true) ? profile!.name[0].toUpperCase() : 'A';

    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 48),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [brand.forest, brand.forestDeep],
        ),
      ),
      child: Stack(
        children: [
          // Decorative rings top-right
          Positioned(
            top: -40,
            right: -40,
            child: _DecorativeRing(size: 200),
          ),
          Positioned(
            top: 20,
            right: 60,
            child: _DecorativeRing(size: 120),
          ),
          // Content
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(22, 22, 22, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _greeting().toUpperCase(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            fontSize: 11,
                            color: Colors.white.withOpacity(0.38),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Hello, $firstName.',
                          style: theme.textTheme.headlineLarge?.copyWith(
                            fontSize: 32,
                            fontWeight: FontWeight.w400,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      // Notification bell
                      GestureDetector(
                        onTap: () => context.go(AppRoutes.notifications),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.10),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.notifications_none_outlined,
                                color: Colors.white,
                                size: 22,
                              ),
                            ),
                            // Unread dot
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: cs.primary,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: brand.forest,
                                    width: 1.5,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      // Avatar circle
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: cs.primary,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          initial,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
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

class _DecorativeRing extends StatelessWidget {
  final double size;
  const _DecorativeRing({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white.withOpacity(0.05),
          width: 1.5,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Quick book card
// ---------------------------------------------------------------------------

class _QuickBookCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Transform.translate(
      offset: const Offset(0, -40),
      child: Padding(
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 18),
        child: Container(
          decoration: BoxDecoration(
            color: cs.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.13),
                blurRadius: 40,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          padding: const EdgeInsetsDirectional.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'WHERE ARE YOU FLYING?',
                style: theme.textTheme.labelSmall?.copyWith(
                  fontSize: 10.5,
                  color: cs.onSurface.withOpacity(0.38),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 12),
              // From row
              _QuickBookRow(
                circleColor: cs.primary.withOpacity(0.12),
                icon: Icons.location_on_outlined,
                iconColor: cs.primary,
                label: 'From',
                value: 'Select heliport',
                valueColor: cs.onSurface,
              ),
              Padding(
                padding: const EdgeInsetsDirectional.symmetric(vertical: 10),
                child: Divider(
                  color: cs.onSurface.withOpacity(0.14),
                  height: 1,
                ),
              ),
              // To row
              _QuickBookRow(
                circleColor: cs.onSurface.withOpacity(0.05),
                icon: Icons.explore_outlined,
                iconColor: cs.onSurface.withOpacity(0.38),
                label: 'To',
                value: 'Choose destination',
                valueColor: cs.onSurface.withOpacity(0.38),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                ),
                onPressed: () => context.push(AppRoutes.bookingOrigin),
                child: const Text('Search flights'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickBookRow extends StatelessWidget {
  final Color circleColor;
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final Color valueColor;

  const _QuickBookRow({
    required this.circleColor,
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(color: circleColor, shape: BoxShape.circle),
          child: Icon(icon, size: 16, color: iconColor),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontSize: 10.5,
                  color: cs.onSurface.withOpacity(0.38),
                ),
              ),
              Text(
                value,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: valueColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        Icon(Icons.chevron_right, color: cs.onSurface.withOpacity(0.38), size: 20),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Service type chips
// ---------------------------------------------------------------------------

class _ServiceChipsRow extends ConsumerWidget {
  final String? selectedType;
  final void Function(String?) onTypeSelected;

  const _ServiceChipsRow({
    required this.selectedType,
    required this.onTypeSelected,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final asyncTypes = ref.watch(serviceTypesProvider);
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return asyncTypes.when(
      loading: () => Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
        child: Row(
          children: List.generate(
            4,
            (_) => Padding(
              padding: const EdgeInsetsDirectional.only(end: 8),
              child: ShimmerCard(width: 80, height: 36, borderRadius: 18),
            ),
          ),
        ),
      ),
      error: (_, __) => const SizedBox.shrink(),
      data: (types) {
        if (types.isEmpty) return const SizedBox.shrink();
        return SizedBox(
          height: 36,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
            itemCount: types.length,
            itemBuilder: (context, i) {
              final t = types[i];
              final isActive =
                  selectedType == t.id || (selectedType == null && i == 0);
              return Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: _ServiceChip(
                  label: t.name,
                  isActive: isActive,
                  brand: brand,
                  onTap: () => onTypeSelected(t.id),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _ServiceChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final AppBrandConfig brand;
  final VoidCallback onTap;

  const _ServiceChip({
    required this.label,
    required this.isActive,
    required this.brand,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 36,
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: isActive ? brand.forest : cs.surface,
          borderRadius: BorderRadius.circular(18),
          border: isActive
              ? null
              : Border.all(color: cs.onSurface.withOpacity(0.14)),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.10),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            fontSize: 13,
            color: isActive ? Colors.white : cs.onSurface.withOpacity(0.75),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Upcoming trip section
// ---------------------------------------------------------------------------

class _UpcomingTripSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncTrip = ref.watch(activeTripProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Upcoming trip',
          actionLabel: 'See all',
          onAction: () => context.go('/trips'),
        ),
        const SizedBox(height: 12),
        asyncTrip.when(
          loading: () => const ShimmerCard(height: 160, borderRadius: 20),
          error: (_, __) => const _EmptyTripCard(),
          data: (trip) =>
              trip == null ? const _EmptyTripCard() : _TripCard(trip: trip),
        ),
      ],
    );
  }
}

class _EmptyTripCard extends ConsumerWidget {
  const _EmptyTripCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Container(
      height: 160,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [brand.forest, brand.forestDeep],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.flight, color: Colors.white.withOpacity(0.40), size: 36),
          const SizedBox(height: 8),
          Text(
            'No upcoming trips',
            style: theme.textTheme.titleSmall?.copyWith(color: Colors.white),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => context.push(AppRoutes.bookingOrigin),
            child: Container(
              padding: const EdgeInsetsDirectional.symmetric(
                horizontal: 20,
                vertical: 8,
              ),
              decoration: BoxDecoration(
                color: cs.primary,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Book a flight',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TripCard extends ConsumerWidget {
  final ActiveTrip trip;
  const _TripCard({required this.trip});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [brand.forest, brand.forestDeep],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsetsDirectional.all(16),
      child: Stack(
        children: [
          // Decorative ring
          Positioned(
            right: -20,
            top: -30,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withOpacity(0.05),
                  width: 1,
                ),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status + time row
              Row(
                children: [
                  _StatusPill(label: trip.badgeLabel, cs: cs),
                  const Spacer(),
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: Colors.white.withOpacity(0.50),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatTime(trip.departureTime),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: Colors.white.withOpacity(0.50),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Route row
              Row(
                children: [
                  Text(
                    trip.fromCode,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Expanded(
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: cs.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Expanded(
                              child: Container(
                                height: 1,
                                color: Colors.white.withOpacity(0.25),
                              ),
                            ),
                            Icon(
                              Icons.flight,
                              color: Colors.white,
                              size: 18,
                            ),
                            Expanded(
                              child: Container(
                                height: 1,
                                color: Colors.white.withOpacity(0.25),
                              ),
                            ),
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: cs.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${trip.durationMin} min',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: Colors.white.withOpacity(0.60),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    trip.toCode,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Footer row
              Row(
                children: [
                  if (trip.aircraftModel != null)
                    Text(
                      trip.aircraftModel!,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white.withOpacity(0.55),
                      ),
                    ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Trip details coming soon'),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsetsDirectional.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: Colors.white.withOpacity(0.30),
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'View ticket',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) {
      return '--:--';
    }
  }
}

class _StatusPill extends StatelessWidget {
  final String label;
  final ColorScheme cs;
  const _StatusPill({required this.label, required this.cs});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: cs.primary.withOpacity(0.18),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: cs.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: cs.primary,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Popular routes section header (extracted to stay under 200 lines per widget)
// ---------------------------------------------------------------------------

class _PopularRoutesHeader extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SectionHeader(
      title: 'Popular routes',
      actionLabel: 'See all',
      onAction: () => context.go(AppRoutes.exploreRoutes),
    );
  }
}

// ---------------------------------------------------------------------------
// Popular routes
// ---------------------------------------------------------------------------

class _PopularRoutesSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncRoutes = ref.watch(popularRoutesProvider);
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Padding(
      padding: const EdgeInsetsDirectional.only(top: 12),
      child: asyncRoutes.when(
        loading: () => SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
            itemCount: 3,
            itemBuilder: (_, __) => Padding(
              padding: const EdgeInsetsDirectional.only(end: 12),
              child: ShimmerCard(width: 156, height: 180, borderRadius: 20),
            ),
          ),
        ),
        error: (_, __) => Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 18),
          child: Text(
            'Unable to load routes',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: cs.onSurface.withOpacity(0.55),
            ),
          ),
        ),
        data: (routes) {
          if (routes.isEmpty) {
            return Padding(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 18),
              child: Text(
                'No popular routes yet',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: cs.onSurface.withOpacity(0.55),
                ),
              ),
            );
          }
          return SizedBox(
            height: 180,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
              itemCount: routes.length,
              itemBuilder: (context, i) => Padding(
                padding: const EdgeInsetsDirectional.only(end: 12),
                child: _RouteCard(route: routes[i]),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _RouteCard extends StatelessWidget {
  final PopularRoute route;
  const _RouteCard({required this.route});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final price = (route.priceMinorUnits / 100).toStringAsFixed(0);

    return GestureDetector(
      onTap: () => context.go(AppRoutes.routePreviewPath(route.id)),
      child: Container(
        width: 156,
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: cs.onSurface.withOpacity(0.14)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsetsDirectional.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AvailBadge(
              label: route.badgeType == 'warn'
                  ? '${route.availSeats} left'
                  : route.serviceType,
              type: route.badgeType,
            ),
            const SizedBox(height: 10),
            Text(
              route.fromCity,
              style: theme.textTheme.titleSmall?.copyWith(
                fontSize: 15.5,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '→ ${route.toCity}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.55),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const Spacer(),
            Row(
              children: [
                Icon(
                  Icons.access_time,
                  size: 12,
                  color: cs.onSurface.withOpacity(0.38),
                ),
                const SizedBox(width: 3),
                Text(
                  '${route.durationMin} min',
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '₹$price',
              style: theme.textTheme.titleSmall?.copyWith(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: cs.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
