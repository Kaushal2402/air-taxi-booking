import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../domain/home_models.dart';
import '../../domain/home_providers.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/shimmer_card.dart';

// ---------------------------------------------------------------------------
// Screen 2.6 — Notifications
// ---------------------------------------------------------------------------

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final asyncNotifs = ref.watch(notificationsProvider);

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
                    child: Container(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                          18, 8, 8, 0),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: cs.onSurface.withOpacity(0.14),
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Notifications',
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontSize: 26,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                          TextButton(
                            onPressed: () => ref
                                .read(notificationsProvider.notifier)
                                .markAllRead(),
                            child: const Text('Mark all read'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                // Content
                asyncNotifs.when(
                  loading: () => SliverPadding(
                    padding: const EdgeInsetsDirectional.fromSTEB(18, 16, 18, 0),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, __) => Padding(
                          padding:
                              const EdgeInsetsDirectional.only(bottom: 12),
                          child: ShimmerCard(height: 72, borderRadius: 12),
                        ),
                        childCount: 4,
                      ),
                    ),
                  ),
                  error: (_, __) => const SliverFillRemaining(
                    child: _EmptyNotificationsState(),
                  ),
                  data: (notifs) {
                    if (notifs.isEmpty) {
                      return const SliverFillRemaining(
                        child: _EmptyNotificationsState(),
                      );
                    }
                    final grouped = _groupByDate(notifs);
                    return SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) =>
                            _buildGroup(context, ref, grouped[i]),
                        childCount: grouped.length,
                      ),
                    );
                  },
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

  Widget _buildGroup(
      BuildContext context,
      WidgetRef ref,
      _NotifGroup group) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    final unreadCount = group.items.where((n) => !n.isRead).length;

    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 16, 18, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date group header
          Row(
            children: [
              if (unreadCount > 0) ...[
                Container(
                  padding: const EdgeInsetsDirectional.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: brand.forest,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$unreadCount new',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Text(
                group.dateLabel,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontSize: 11,
                  color: cs.onSurface.withOpacity(0.38),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Items
          ...group.items.map(
            (n) => _NotifItem(notification: n),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Date grouping
// ---------------------------------------------------------------------------

class _NotifGroup {
  final String dateLabel;
  final List<AppNotification> items;
  const _NotifGroup({required this.dateLabel, required this.items});
}

List<_NotifGroup> _groupByDate(List<AppNotification> notifs) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final yesterday = today.subtract(const Duration(days: 1));

  final todayItems = <AppNotification>[];
  final yesterdayItems = <AppNotification>[];
  final earlierItems = <AppNotification>[];

  for (final n in notifs) {
    try {
      final dt = DateTime.parse(n.createdAt).toLocal();
      final date = DateTime(dt.year, dt.month, dt.day);
      if (date == today) {
        todayItems.add(n);
      } else if (date == yesterday) {
        yesterdayItems.add(n);
      } else {
        earlierItems.add(n);
      }
    } catch (_) {
      earlierItems.add(n);
    }
  }

  return [
    if (todayItems.isNotEmpty)
      _NotifGroup(dateLabel: 'TODAY', items: todayItems),
    if (yesterdayItems.isNotEmpty)
      _NotifGroup(dateLabel: 'YESTERDAY', items: yesterdayItems),
    if (earlierItems.isNotEmpty)
      _NotifGroup(dateLabel: 'EARLIER', items: earlierItems),
  ];
}

// ---------------------------------------------------------------------------
// Notification item
// ---------------------------------------------------------------------------

class _NotifItem extends ConsumerWidget {
  final AppNotification notification;
  const _NotifItem({required this.notification});

  IconData _iconForType(String type) {
    switch (type) {
      case 'ok':
        return Icons.check_circle_outline;
      case 'warn':
        return Icons.notifications_outlined;
      case 'danger':
        return Icons.error_outline;
      case 'info':
      default:
        return Icons.info_outline;
    }
  }

  Color _colorForType(String type, ColorScheme cs) {
    switch (type) {
      case 'ok':
        return cs.secondary;
      case 'warn':
        return const Color(0xFFC97B0C);
      case 'danger':
        return cs.error;
      case 'info':
      default:
        return const Color(0xFF1762BA);
    }
  }

  String _formatTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ?? AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    final typeColor = _colorForType(notification.type, cs);
    final isRead = notification.isRead;

    return Opacity(
      opacity: isRead ? 0.6 : 1.0,
      child: Container(
        padding: const EdgeInsetsDirectional.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: cs.onSurface.withOpacity(0.14),
            ),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Type circle
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: typeColor.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _iconForType(notification.type),
                color: typeColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontSize: 14.5,
                            fontWeight: isRead
                                ? FontWeight.w500
                                : FontWeight.w600,
                          ),
                        ),
                      ),
                      Text(
                        _formatTime(notification.createdAt),
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontSize: 11.5,
                          color: cs.onSurface.withOpacity(0.38),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    notification.body,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontSize: 13,
                      color: cs.onSurface.withOpacity(0.55),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // Unread dot
            if (!isRead) ...[
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsetsDirectional.only(top: 6),
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: cs.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyNotificationsState extends StatelessWidget {
  const _EmptyNotificationsState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_outlined,
            size: 32,
            color: cs.onSurface.withOpacity(0.18),
          ),
          const SizedBox(height: 14),
          Text(
            "You're all caught up.",
            style: theme.textTheme.bodyMedium?.copyWith(
              color: cs.onSurface.withOpacity(0.55),
            ),
          ),
        ],
      ),
    );
  }
}
