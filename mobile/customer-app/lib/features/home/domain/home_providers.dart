import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../data/services/home_service.dart';
import 'home_models.dart';

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

/// Provides the HomeService singleton, wired to the shared API client.
final homeServiceProvider = Provider<HomeService>((ref) {
  final client = ref.read(utbpApiClientProvider);
  return HomeService(client: client);
});

// ---------------------------------------------------------------------------
// NOTE: All endpoints under /api/v1/app/home/, /api/v1/app/trips/,
// /api/v1/app/promotions/, and /api/v1/app/notifications/ are PENDING
// backend implementation.  Every provider catches UnimplementedError and
// returns an empty/null default so screens always show empty states.
// ---------------------------------------------------------------------------

/// Provides the list of service type filter chips (Helicopter, Charter, etc.)
final serviceTypesProvider =
    AsyncNotifierProvider<ServiceTypesNotifier, List<ServiceType>>(
  ServiceTypesNotifier.new,
);

class ServiceTypesNotifier extends AsyncNotifier<List<ServiceType>> {
  @override
  Future<List<ServiceType>> build() async {
    try {
      return await ref.read(homeServiceProvider).getServiceTypes();
    } on UnimplementedError {
      return const [];
    } catch (_) {
      return const [];
    }
  }
}

/// Provides popular routes, optionally filtered by service type.
final popularRoutesProvider =
    AsyncNotifierProvider<PopularRoutesNotifier, List<PopularRoute>>(
  PopularRoutesNotifier.new,
);

class PopularRoutesNotifier extends AsyncNotifier<List<PopularRoute>> {
  String? _filter;

  @override
  Future<List<PopularRoute>> build() async {
    try {
      return await ref
          .read(homeServiceProvider)
          .getPopularRoutes(serviceType: _filter);
    } on UnimplementedError {
      return const [];
    } catch (_) {
      return const [];
    }
  }

  /// Re-fetches routes filtered by the given service type.
  void filterByServiceType(String? type) {
    _filter = type;
    ref.invalidateSelf();
  }
}

/// Provides the single active/upcoming trip.
/// null means no active trip (show empty state).
final activeTripProvider =
    AsyncNotifierProvider<ActiveTripNotifier, ActiveTrip?>(
  ActiveTripNotifier.new,
);

class ActiveTripNotifier extends AsyncNotifier<ActiveTrip?> {
  @override
  Future<ActiveTrip?> build() async {
    try {
      return await ref.read(homeServiceProvider).getActiveTrip();
    } on UnimplementedError {
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(homeServiceProvider).getActiveTrip();
      } on UnimplementedError {
        return null;
      }
    });
  }
}

/// Provides promotions/offers for the Promotions screen.
final promotionsProvider =
    AsyncNotifierProvider<PromotionsNotifier, List<Promotion>>(
  PromotionsNotifier.new,
);

class PromotionsNotifier extends AsyncNotifier<List<Promotion>> {
  @override
  Future<List<Promotion>> build() async {
    try {
      return await ref.read(homeServiceProvider).getPromotions();
    } on UnimplementedError {
      return const [];
    } catch (_) {
      return const [];
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(homeServiceProvider).getPromotions();
      } on UnimplementedError {
        return const <Promotion>[];
      }
    });
  }
}

/// Provides paginated notifications.
final notificationsProvider =
    AsyncNotifierProvider<NotificationsNotifier, List<AppNotification>>(
  NotificationsNotifier.new,
);

class NotificationsNotifier extends AsyncNotifier<List<AppNotification>> {
  int _page = 1;
  bool _hasMore = true;

  @override
  Future<List<AppNotification>> build() async {
    _page = 1;
    _hasMore = true;
    try {
      return await ref
          .read(homeServiceProvider)
          .getNotifications(page: 1);
    } on UnimplementedError {
      return const [];
    } catch (_) {
      return const [];
    }
  }

  Future<void> loadMore() async {
    if (!_hasMore) return;
    final current = state.valueOrNull ?? [];
    // Backend PENDING: fetch next page and append
    _hasMore = false;
    state = AsyncValue.data(current);
  }

  Future<void> markAllRead() async {
    // Optimistic local update — backend PATCH is also called when available.
    try {
      await ref.read(homeServiceProvider).markAllNotificationsRead();
    } on UnimplementedError {
      // Backend pending — continue with optimistic update.
    } catch (_) {
      // Best-effort.
    }
    final current = state.valueOrNull ?? [];
    final updated = current.map((n) => n.copyWith(isRead: true)).toList();
    state = AsyncValue.data(updated);
  }
}
