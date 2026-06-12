// 3.0 — Origin Picker Screen
// First step of the booking flow. Sets BookingDraft.originCode/originName
// then navigates to DestinationPickerScreen.
//
// Mirrors the structure of destination_picker_screen.dart:
//   - Forest gradient header
//   - Search input (auto-focused)
//   - Recent destinations list (reuses recentDestinationsProvider)
//   - Popular destinations list (reuses popularDestinationsProvider)

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../data/models/booking_models.dart';
import '../../domain/providers/booking_providers.dart';

class OriginPickerScreen extends ConsumerStatefulWidget {
  const OriginPickerScreen({super.key});

  @override
  ConsumerState<OriginPickerScreen> createState() => _OriginPickerScreenState();
}

class _OriginPickerScreenState extends ConsumerState<OriginPickerScreen> {
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchFocus.requestFocus();
    });
    _searchController.addListener(() {
      final q = _searchController.text.toLowerCase().trim();
      if (q != _query) setState(() => _query = q);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _onOriginSelected({
    required String city,
    required String code,
    required String padName,
  }) {
    ref.read(bookingFlowProvider.notifier).setOrigin(
          originCode: code,
          originName: city,
        );
    context.push(AppRoutes.bookingDestination);
  }

  List<RecentDestination> _filterRecents(List<RecentDestination> list) {
    if (_query.isEmpty) return list;
    return list
        .where((r) =>
            r.city.toLowerCase().contains(_query) ||
            r.code.toLowerCase().contains(_query) ||
            r.padName.toLowerCase().contains(_query))
        .toList();
  }

  List<PopularDestination> _filterPopular(List<PopularDestination> list) {
    if (_query.isEmpty) return list;
    return list
        .where((p) =>
            p.city.toLowerCase().contains(_query) ||
            p.code.toLowerCase().contains(_query))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final recentsAsync = ref.watch(recentDestinationsProvider);
    final popularAsync = ref.watch(popularDestinationsProvider);

    return Scaffold(
      backgroundColor: cs.surface,
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Column(
          children: [
            _OriginHeader(cs: cs, theme: theme),
            _SearchInput(
              controller: _searchController,
              focusNode: _searchFocus,
              cs: cs,
            ),
            Expanded(
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  _SectionHeader(label: 'Recent', cs: cs),
                  recentsAsync.when(
                    loading: () => _ShimmerList(cs: cs, count: 3),
                    error: (e, _) => _ErrorRow(
                      cs: cs,
                      message: 'Could not load recent helipads',
                      onRetry: () =>
                          ref.invalidate(recentDestinationsProvider),
                    ),
                    data: (list) {
                      final filtered = _filterRecents(list);
                      if (filtered.isEmpty) {
                        return _EmptyRow(
                          cs: cs,
                          icon: Icons.history_rounded,
                          message: _query.isEmpty
                              ? 'No recent helipads'
                              : 'No matches for "$_query"',
                        );
                      }
                      return Column(
                        children: filtered
                            .map((r) => _RecentItem(
                                  recent: r,
                                  cs: cs,
                                  theme: theme,
                                  onTap: () => _onOriginSelected(
                                    city: r.city,
                                    code: r.code,
                                    padName: r.padName,
                                  ),
                                ))
                            .toList(),
                      );
                    },
                  ),
                  _SectionHeader(label: 'Popular departure helipads', cs: cs),
                  popularAsync.when(
                    loading: () => _ShimmerList(cs: cs, count: 5),
                    error: (e, _) => _ErrorRow(
                      cs: cs,
                      message: 'Could not load popular helipads',
                      onRetry: () =>
                          ref.invalidate(popularDestinationsProvider),
                    ),
                    data: (list) {
                      final filtered = _filterPopular(list);
                      if (filtered.isEmpty) {
                        return _EmptyRow(
                          cs: cs,
                          icon: Icons.flight_takeoff_rounded,
                          message: _query.isEmpty
                              ? 'No helipads available'
                              : 'No matches for "$_query"',
                          onRetry: () =>
                              ref.invalidate(popularDestinationsProvider),
                        );
                      }
                      return Column(
                        children: filtered
                            .map((p) => _PopularItem(
                                  popular: p,
                                  cs: cs,
                                  theme: theme,
                                  onTap: () => _onOriginSelected(
                                    city: p.city,
                                    code: p.code,
                                    padName: p.city,
                                  ),
                                ))
                            .toList(),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

class _OriginHeader extends StatelessWidget {
  const _OriginHeader({required this.cs, required this.theme});

  final ColorScheme cs;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: const Alignment(-0.6, -1.0),
          end: const Alignment(0.6, 1.0),
          colors: [
            cs.primary,
            cs.primary.withOpacity(0.75),
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 52,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: cs.onPrimary,
                      size: 22,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(22, 0, 22, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '? → destination',
                    style: TextStyle(
                      fontFamily: 'IBMPlexMono',
                      fontSize: 10.5,
                      letterSpacing: 0.14,
                      color: cs.onPrimary.withOpacity(0.38),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: 'Flying ',
                          style: theme.textTheme.displaySmall?.copyWith(
                            fontSize: 30,
                            fontWeight: FontWeight.w400,
                            color: cs.onPrimary,
                            letterSpacing: -0.025,
                            height: 1.1,
                          ),
                        ),
                        TextSpan(
                          text: 'from?',
                          style: theme.textTheme.displaySmall?.copyWith(
                            fontSize: 30,
                            fontWeight: FontWeight.w300,
                            fontStyle: FontStyle.italic,
                            color: cs.onPrimary,
                            letterSpacing: -0.025,
                            height: 1.1,
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
      ),
    );
  }
}

// ── Search input ──────────────────────────────────────────────────────────────

class _SearchInput extends StatelessWidget {
  const _SearchInput({
    required this.controller,
    required this.focusNode,
    required this.cs,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: cs.surface,
      padding: const EdgeInsetsDirectional.fromSTEB(18, 18, 18, 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: cs.outline, width: 1),
        ),
      ),
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: cs.primary.withOpacity(0.08),
          borderRadius: BorderRadius.circular(100),
          border: Border.all(color: cs.primary, width: 2),
        ),
        child: Row(
          children: [
            const SizedBox(width: 14),
            Icon(Icons.search_rounded, size: 18, color: cs.primary),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                autofocus: true,
                decoration: InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Search departure helipads...',
                  hintStyle: TextStyle(
                    fontSize: 16,
                    color: cs.onSurface.withOpacity(0.38),
                  ),
                  isCollapsed: true,
                  contentPadding: EdgeInsets.zero,
                ),
                style: TextStyle(
                  fontSize: 16,
                  color: cs.onSurface,
                  letterSpacing: -0.01,
                ),
                textInputAction: TextInputAction.search,
              ),
            ),
            const SizedBox(width: 14),
          ],
        ),
      ),
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label, required this.cs});
  final String label;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 14, 18, 6),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontFamily: 'IBMPlexMono',
          fontSize: 11,
          letterSpacing: 0.12,
          color: cs.onSurface.withOpacity(0.38),
        ),
      ),
    );
  }
}

// ── Recent helipad item ───────────────────────────────────────────────────────

class _RecentItem extends StatelessWidget {
  const _RecentItem({
    required this.recent,
    required this.cs,
    required this.theme,
    required this.onTap,
  });

  final RecentDestination recent;
  final ColorScheme cs;
  final ThemeData theme;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.history_rounded,
                size: 17,
                color: cs.onSurface.withOpacity(0.55),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsetsDirectional.symmetric(vertical: 11),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      recent.city,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: cs.onSurface,
                        letterSpacing: -0.01,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      recent.padName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontSize: 12.5,
                        color: cs.onSurface.withOpacity(0.55),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 0, 0),
              child: Text(
                recent.code,
                style: TextStyle(
                  fontFamily: 'IBMPlexMono',
                  fontSize: 12,
                  color: cs.onSurface.withOpacity(0.38),
                  letterSpacing: 0.08,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Popular helipad item ──────────────────────────────────────────────────────

class _PopularItem extends StatelessWidget {
  const _PopularItem({
    required this.popular,
    required this.cs,
    required this.theme,
    required this.onTap,
  });

  final PopularDestination popular;
  final ColorScheme cs;
  final ThemeData theme;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: cs.primary.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.flight_takeoff_rounded,
                size: 17,
                color: cs.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsetsDirectional.symmetric(vertical: 11),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      popular.city,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: cs.onSurface,
                        letterSpacing: -0.01,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      '${popular.routeCount} routes available',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontSize: 12.5,
                        color: cs.onSurface.withOpacity(0.55),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 0, 0),
              child: Text(
                popular.code,
                style: TextStyle(
                  fontFamily: 'IBMPlexMono',
                  fontSize: 12,
                  color: cs.onSurface.withOpacity(0.38),
                  letterSpacing: 0.08,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Loading shimmer ───────────────────────────────────────────────────────────

class _ShimmerList extends StatelessWidget {
  const _ShimmerList({required this.cs, required this.count});
  final ColorScheme cs;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        count,
        (_) => Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(18, 11, 18, 11),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: cs.surfaceContainerHighest,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 120,
                      height: 14,
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Container(
                      width: 80,
                      height: 12,
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Error row ─────────────────────────────────────────────────────────────────

class _ErrorRow extends StatelessWidget {
  const _ErrorRow({
    required this.cs,
    required this.message,
    required this.onRetry,
  });

  final ColorScheme cs;
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 12, 18, 12),
      child: Row(
        children: [
          Icon(Icons.error_outline_rounded, color: cs.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(fontSize: 13, color: cs.error),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

// ── Empty row ─────────────────────────────────────────────────────────────────

class _EmptyRow extends StatelessWidget {
  const _EmptyRow({
    required this.cs,
    required this.icon,
    required this.message,
    this.onRetry,
  });

  final ColorScheme cs;
  final IconData icon;
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 16, 18, 16),
      child: Row(
        children: [
          Icon(icon, size: 20, color: cs.onSurface.withOpacity(0.38)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 13.5,
                color: cs.onSurface.withOpacity(0.55),
              ),
            ),
          ),
          if (onRetry != null)
            GestureDetector(
              onTap: onRetry,
              child: Icon(
                Icons.refresh_rounded,
                size: 20,
                color: cs.primary,
              ),
            ),
        ],
      ),
    );
  }
}
