import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';
import '../../domain/home_models.dart';
import '../../domain/home_providers.dart';
import '../widgets/avail_badge.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/shimmer_card.dart';

// ---------------------------------------------------------------------------
// Screen 2.3 — Explore Routes
// ---------------------------------------------------------------------------

class ExploreRoutesScreen extends ConsumerStatefulWidget {
  const ExploreRoutesScreen({super.key});

  @override
  ConsumerState<ExploreRoutesScreen> createState() =>
      _ExploreRoutesScreenState();
}

class _ExploreRoutesScreenState extends ConsumerState<ExploreRoutesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCity = 'All routes';

  static const _cities = [
    'All routes',
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Goa',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<PopularRoute> _filter(List<PopularRoute> routes) {
    var filtered = routes;
    if (_selectedCity != 'All routes') {
      filtered = filtered
          .where((r) =>
              r.fromCity.contains(_selectedCity) ||
              r.toCity.contains(_selectedCity))
          .toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filtered = filtered
          .where((r) =>
              r.fromCity.toLowerCase().contains(q) ||
              r.toCity.toLowerCase().contains(q) ||
              r.fromCode.toLowerCase().contains(q) ||
              r.toCode.toLowerCase().contains(q))
          .toList();
    }
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final asyncRoutes = ref.watch(popularRoutesProvider);

    return Scaffold(
      backgroundColor: cs.background,
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                          18, 20, 18, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Headline
                          RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: 'Explore ',
                                  style: theme.textTheme.headlineMedium?.copyWith(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w400,
                                    color: cs.onSurface,
                                  ),
                                ),
                                TextSpan(
                                  text: 'routes.',
                                  style: theme.textTheme.headlineMedium?.copyWith(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w300,
                                    fontStyle: FontStyle.italic,
                                    color: cs.onSurface.withOpacity(0.55),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Search bar
                          _SearchBar(
                            controller: _searchController,
                            onChanged: (v) =>
                                setState(() => _searchQuery = v),
                          ),
                          const SizedBox(height: 12),
                          // City filter chips
                          SizedBox(
                            height: 36,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: _cities.length,
                              itemBuilder: (context, i) {
                                final city = _cities[i];
                                final isActive = _selectedCity == city;
                                return Padding(
                                  padding: const EdgeInsetsDirectional.only(
                                      end: 8),
                                  child: _FilterChip(
                                    label: city,
                                    isActive: isActive,
                                    onTap: () => setState(
                                        () => _selectedCity = city),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Route count label
                          asyncRoutes.when(
                            loading: () => const SizedBox.shrink(),
                            error: (_, __) => const SizedBox.shrink(),
                            data: (routes) {
                              final count = _filter(routes).length;
                              return Text(
                                '${count.toString().padLeft(2, '0')} ROUTES FOUND',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  fontSize: 12,
                                  color: cs.onSurface.withOpacity(0.38),
                                  letterSpacing: 0.5,
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                        ],
                      ),
                    ),
                  ),
                ),
                // Route list
                SliverPadding(
                  padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 24),
                  sliver: asyncRoutes.when(
                    loading: () => SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, __) => Padding(
                          padding:
                              const EdgeInsetsDirectional.only(bottom: 10),
                          child: ShimmerCard(height: 76, borderRadius: 20),
                        ),
                        childCount: 5,
                      ),
                    ),
                    error: (_, __) => const SliverToBoxAdapter(
                      child: _EmptyRoutesState(message: 'Unable to load routes'),
                    ),
                    data: (routes) {
                      final filtered = _filter(routes);
                      if (filtered.isEmpty) {
                        return const SliverToBoxAdapter(
                          child: _EmptyRoutesState(
                              message: 'No routes found'),
                        );
                      }
                      return SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, i) => Padding(
                            padding:
                                const EdgeInsetsDirectional.only(bottom: 10),
                            child: _RouteRow(route: filtered[i]),
                          ),
                          childCount: filtered.length,
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          UtbpBottomNav(activeTab: 'explore'),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final void Function(String) onChanged;

  const _SearchBar({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(24),
        border:
            Border.all(color: cs.onSurface.withOpacity(0.22), width: 1.5),
      ),
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 14, end: 8),
            child: Icon(
              Icons.search,
              size: 20,
              color: cs.onSurface.withOpacity(0.38),
            ),
          ),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: theme.textTheme.bodyMedium,
              decoration: InputDecoration(
                hintText: 'Search routes, cities...',
                hintStyle: theme.textTheme.bodyMedium?.copyWith(
                  color: cs.onSurface.withOpacity(0.38),
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 36,
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: isActive ? cs.primary : cs.surface,
          borderRadius: BorderRadius.circular(18),
          border:
              isActive ? null : Border.all(color: cs.onSurface.withOpacity(0.14)),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            fontSize: 13,
            color: isActive ? Colors.white : cs.onSurface.withOpacity(0.75),
            fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _EmptyRoutesState extends StatelessWidget {
  final String message;
  const _EmptyRoutesState({required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return SizedBox(
      height: 200,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off, size: 40, color: cs.onSurface.withOpacity(0.25)),
            const SizedBox(height: 12),
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: cs.onSurface.withOpacity(0.55),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RouteRow extends ConsumerWidget {
  final PopularRoute route;
  const _RouteRow({required this.route});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final price = (route.priceMinorUnits / 100).toStringAsFixed(0);

    final isHelicopter = route.serviceType.toLowerCase().contains('heli');
    final iconBg = isHelicopter ? brand.mint : brand.forest.withOpacity(0.85);
    final iconColor = isHelicopter ? cs.primary : brand.jade;

    return GestureDetector(
      onTap: () => context.go(AppRoutes.routePreviewPath(route.id)),
      child: Container(
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
        child: Row(
          children: [
            // Type icon
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.flight, color: iconColor, size: 22),
            ),
            const SizedBox(width: 12),
            // Route info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        '${route.fromCity} → ${route.toCity}',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      AvailBadge(
                        label: route.badgeType == 'warn'
                            ? '${route.availSeats} left'
                            : route.serviceType,
                        type: route.badgeType,
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        Icons.access_time,
                        size: 12,
                        color: cs.onSurface.withOpacity(0.38),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '${route.durationMin}m',
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${route.fromCode}–${route.toCode}',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: cs.onSurface.withOpacity(0.38),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Price
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '₹$price',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: cs.primary,
                  ),
                ),
                Text(
                  'per seat',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontSize: 11,
                    color: cs.onSurface.withOpacity(0.38),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
