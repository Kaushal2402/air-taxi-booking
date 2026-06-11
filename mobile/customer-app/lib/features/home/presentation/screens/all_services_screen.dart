import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../domain/home_models.dart';
import '../../domain/home_providers.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/shimmer_card.dart';

// ---------------------------------------------------------------------------
// Screen 2.2 — All Services
// ---------------------------------------------------------------------------

class AllServicesScreen extends ConsumerWidget {
  const AllServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final asyncTypes = ref.watch(serviceTypesProvider);

    return Scaffold(
      backgroundColor: cs.background,
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                // Header
                SliverToBoxAdapter(
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                          18, 12, 18, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            height: 52,
                            child: Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: Text(
                                'Our Services',
                                style: theme.textTheme.headlineSmall?.copyWith(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                            ),
                          ),
                          asyncTypes.when(
                            loading: () => const SizedBox.shrink(),
                            error: (_, __) => const SizedBox.shrink(),
                            data: (types) => Text(
                              '${types.length} mobility types available',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: cs.onSurface.withOpacity(0.55),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                  ),
                ),
                // Service list
                SliverPadding(
                  padding:
                      const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                  sliver: asyncTypes.when(
                    loading: () => SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, __) => Padding(
                          padding:
                              const EdgeInsetsDirectional.only(bottom: 14),
                          child: ShimmerCard(height: 88, borderRadius: 20),
                        ),
                        childCount: 4,
                      ),
                    ),
                    error: (_, __) => const SliverToBoxAdapter(
                      child: _EmptyServicesState(),
                    ),
                    data: (types) {
                      if (types.isEmpty) {
                        return const SliverToBoxAdapter(
                          child: _EmptyServicesState(),
                        );
                      }
                      return SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, i) {
                            if (i == types.length) {
                              return const Padding(
                                padding: EdgeInsetsDirectional.only(top: 14),
                                child: _LoyaltyCard(),
                              );
                            }
                            return Padding(
                              padding:
                                  const EdgeInsetsDirectional.only(bottom: 14),
                              child: _ServiceCard(
                                serviceType: types[i],
                                isDark: i < 2,
                              ),
                            );
                          },
                          childCount: types.length + 1,
                        ),
                      );
                    },
                  ),
                ),
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

class _EmptyServicesState extends StatelessWidget {
  const _EmptyServicesState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return SizedBox(
      height: 240,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.flight_outlined,
              size: 40,
              color: cs.onSurface.withOpacity(0.25),
            ),
            const SizedBox(height: 12),
            Text(
              'No services available',
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

// ---------------------------------------------------------------------------
// Service card
// ---------------------------------------------------------------------------

class _ServiceCard extends ConsumerWidget {
  final ServiceType serviceType;
  final bool isDark;

  const _ServiceCard({required this.serviceType, required this.isDark});

  IconData _iconForType(String icon) {
    switch (icon) {
      case 'helicopter':
        return Icons.flight;
      case 'charter':
        return Icons.airplanemode_active;
      case 'cargo':
        return Icons.inventory_2_outlined;
      case 'ambulance':
        return Icons.medical_services_outlined;
      default:
        return Icons.flight_outlined;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final price = (serviceType.basePrice / 100).toStringAsFixed(0);

    if (isDark) {
      return Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [brand.forest, brand.forestDeep],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsetsDirectional.all(16),
        child: _ServiceCardContent(
          icon: _iconForType(serviceType.icon),
          iconColor: brand.jade,
          iconBg: Colors.white.withOpacity(0.12),
          title: serviceType.name,
          titleColor: Colors.white,
          sub: serviceType.description,
          subColor: Colors.white.withOpacity(0.60),
          price: price,
          priceColor: Colors.white,
          fromColor: Colors.white.withOpacity(0.50),
          currency: serviceType.currency,
        ),
      );
    }

    return Container(
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
      padding: const EdgeInsetsDirectional.all(16),
      child: _ServiceCardContent(
        icon: _iconForType(serviceType.icon),
        iconColor: cs.primary,
        iconBg: cs.primary.withOpacity(0.10),
        title: serviceType.name,
        titleColor: cs.onSurface,
        sub: serviceType.description,
        subColor: cs.onSurface.withOpacity(0.55),
        price: price,
        priceColor: cs.primary,
        fromColor: cs.onSurface.withOpacity(0.38),
        currency: serviceType.currency,
      ),
    );
  }
}

class _ServiceCardContent extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final Color titleColor;
  final String sub;
  final Color subColor;
  final String price;
  final Color priceColor;
  final Color fromColor;
  final String currency;

  const _ServiceCardContent({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.titleColor,
    required this.sub,
    required this.subColor,
    required this.price,
    required this.priceColor,
    required this.fromColor,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(icon, color: iconColor, size: 26),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: titleColor,
                ),
              ),
              if (sub.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  sub,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontSize: 13,
                    color: subColor,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'from',
              style: theme.textTheme.labelSmall?.copyWith(
                color: fromColor,
                fontSize: 10.5,
              ),
            ),
            Text(
              '₹$price',
              style: theme.textTheme.titleSmall?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: priceColor,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Loyalty card
// ---------------------------------------------------------------------------

class _LoyaltyCard extends ConsumerWidget {
  const _LoyaltyCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Wallet coming soon')),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: brand.mint,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: cs.secondary.withOpacity(0.22)),
        ),
        padding: const EdgeInsetsDirectional.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: cs.secondary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.account_balance_wallet_outlined,
                  color: cs.secondary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Acme Miles',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  Text(
                    'Earn miles on every flight',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.55),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: cs.onSurface.withOpacity(0.38),
            ),
          ],
        ),
      ),
    );
  }
}
