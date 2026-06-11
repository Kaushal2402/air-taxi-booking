import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../domain/home_models.dart';
import '../../domain/home_providers.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/shimmer_card.dart';

// ---------------------------------------------------------------------------
// Screen 2.5 — Promotions & Offers
// ---------------------------------------------------------------------------

class PromotionsScreen extends ConsumerWidget {
  const PromotionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final asyncPromos = ref.watch(promotionsProvider);

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
                    child: SizedBox(
                      height: 52,
                      child: Padding(
                        padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 18),
                        child: Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: Text(
                            'Offers & Promos',
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontSize: 19,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                // Hero banner
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(18, 8, 18, 20),
                    child: _HeroBanner(brand: brand, theme: theme, cs: cs),
                  ),
                ),
                // All Offers label
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 12),
                    child: Text(
                      'ALL OFFERS',
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontSize: 11,
                        color: cs.onSurface.withOpacity(0.38),
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                ),
                // Promos list
                SliverPadding(
                  padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                  sliver: asyncPromos.when(
                    loading: () => SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, __) => Padding(
                          padding: const EdgeInsetsDirectional.only(bottom: 10),
                          child: ShimmerCard(height: 82, borderRadius: 20),
                        ),
                        childCount: 3,
                      ),
                    ),
                    error: (_, __) => const SliverToBoxAdapter(
                      child: _EmptyPromosState(),
                    ),
                    data: (promos) {
                      if (promos.isEmpty) {
                        return const SliverToBoxAdapter(
                          child: _EmptyPromosState(),
                        );
                      }
                      return SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, i) {
                            if (i == promos.length) {
                              return const Padding(
                                padding: EdgeInsetsDirectional.only(top: 14),
                                child: _ReferralCard(),
                              );
                            }
                            return Padding(
                              padding:
                                  const EdgeInsetsDirectional.only(bottom: 10),
                              child: _CouponCard(
                                promo: promos[i],
                                isDark: i == 0,
                              ),
                            );
                          },
                          childCount: promos.length + 1,
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

// ---------------------------------------------------------------------------
// Hero banner
// ---------------------------------------------------------------------------

class _HeroBanner extends StatelessWidget {
  final AppBrandConfig brand;
  final ThemeData theme;
  final ColorScheme cs;

  const _HeroBanner({
    required this.brand,
    required this.theme,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    // Canopy = forest lightness ~0.20
    final canopy =
        HSLColor.fromColor(brand.primary).withLightness(0.20).toColor();

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [brand.forest, canopy],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsetsDirectional.all(20),
      child: Stack(
        children: [
          // Tag icon decorative top-right
          Positioned(
            top: 0,
            right: 0,
            child: Icon(
              Icons.local_offer,
              size: 80,
              color: Colors.white.withOpacity(0.08),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'FIRST FLIGHT OFFER',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: Colors.white.withOpacity(0.40),
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '20% off.',
                style: theme.textTheme.displaySmall?.copyWith(
                  fontSize: 38,
                  fontWeight: FontWeight.w300,
                  color: Colors.white,
                  fontStyle: FontStyle.italic,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'On your first booking with Acme Miles.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withOpacity(0.60),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  // Code pill
                  Container(
                    padding: const EdgeInsetsDirectional.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'FLY20',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Copy code button
                  FilledButton.tonal(
                    style: FilledButton.styleFrom(
                      backgroundColor: cs.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsetsDirectional.symmetric(
                          horizontal: 16, vertical: 8),
                      minimumSize: const Size(0, 34),
                      shape: const StadiumBorder(),
                      textStyle: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    onPressed: () async {
                      await Clipboard.setData(
                          const ClipboardData(text: 'FLY20'));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Code FLY20 copied!')),
                        );
                      }
                    },
                    child: const Text('Copy code'),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Coupon card
// ---------------------------------------------------------------------------

class _CouponCard extends ConsumerWidget {
  final Promotion promo;
  final bool isDark;

  const _CouponCard({required this.promo, required this.isDark});

  Color _accentColor(ColorScheme cs, String type) {
    switch (type) {
      case 'percent':
        return cs.primary;
      case 'referral':
        return cs.secondary;
      case 'flat':
      default:
        return const Color(0xFF1762BA);
    }
  }

  IconData _icon(String type) {
    switch (type) {
      case 'percent':
        return Icons.percent;
      case 'referral':
        return Icons.people_outline;
      case 'flat':
      default:
        return Icons.local_offer_outlined;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final accent = _accentColor(cs, promo.type);
    final icon = _icon(promo.type);

    final bgColor = isDark ? brand.forest : cs.surface;
    final titleColor = isDark ? Colors.white : cs.onSurface;
    final subColor = isDark
        ? Colors.white.withOpacity(0.60)
        : cs.onSurface.withOpacity(0.55);
    final codeColor = isDark ? Colors.white.withOpacity(0.75) : cs.onSurface;

    return Container(
      clipBehavior: Clip.hardEdge,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: isDark
            ? null
            : Border.all(color: cs.onSurface.withOpacity(0.14)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.15 : 0.05),
            blurRadius: isDark ? 12 : 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Accent strip
            Container(width: 5, color: accent),
            Expanded(
              child: Padding(
                padding: const EdgeInsetsDirectional.all(14),
                child: Row(
                  children: [
                    // Icon
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: accent.withOpacity(isDark ? 0.20 : 0.10),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(icon, color: accent, size: 20),
                    ),
                    const SizedBox(width: 12),
                    // Content
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            promo.label,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: titleColor,
                            ),
                          ),
                          if (promo.description.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              promo.description,
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontSize: 12,
                                color: subColor,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                          if (promo.expiresAt != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              'Expires ${_formatDate(promo.expiresAt!)}',
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontSize: 11,
                                color: subColor,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Code + copy
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          promo.code,
                          style: theme.textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: codeColor,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        GestureDetector(
                          onTap: () async {
                            await Clipboard.setData(
                                ClipboardData(text: promo.code));
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                    content:
                                        Text('Code ${promo.code} copied!')),
                              );
                            }
                          },
                          child: Text(
                            'Copy',
                            style: TextStyle(
                              fontSize: 12,
                              color: accent,
                              fontWeight: FontWeight.w600,
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
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return iso;
    }
  }
}

// ---------------------------------------------------------------------------
// Referral card
// ---------------------------------------------------------------------------

class _ReferralCard extends ConsumerWidget {
  const _ReferralCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Referral program coming soon')),
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
                color: cs.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.card_giftcard, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Refer a friend',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  Text(
                    'Earn ₹500 for every friend who flies',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontSize: 13,
                      color: cs.onSurface.withOpacity(0.55),
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: cs.onSurface.withOpacity(0.38)),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyPromosState extends StatelessWidget {
  const _EmptyPromosState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return SizedBox(
      height: 160,
      child: Center(
        child: Text(
          'No offers available right now',
          style: theme.textTheme.bodyMedium?.copyWith(
            fontSize: 13.5,
            color: cs.onSurface.withOpacity(0.55),
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
