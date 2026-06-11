import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'home_models.dart';

// ---------------------------------------------------------------------------
// All providers return empty/null defaults while backend is PENDING.
// When backend endpoints are implemented:
//   1. Inject HomeService via a Provider<HomeService>
//   2. Replace empty defaults with actual service calls
//   3. Handle errors with AsyncValue.guard
// ---------------------------------------------------------------------------

/// Provides the list of service type filter chips (Helicopter, Charter, etc.)
/// Falls back to empty list if endpoint is unavailable.
final serviceTypesProvider =
    AsyncNotifierProvider<ServiceTypesNotifier, List<ServiceType>>(
  ServiceTypesNotifier.new,
);

class ServiceTypesNotifier extends AsyncNotifier<List<ServiceType>> {
  @override
  Future<List<ServiceType>> build() async {
    // PENDING: return homeService.getServiceTypes()
    return const [];
  }
}

/// Provides popular routes, optionally filtered by service type.
final popularRoutesProvider =
    AsyncNotifierProvider<PopularRoutesNotifier, List<PopularRoute>>(
  PopularRoutesNotifier.new,
);

class PopularRoutesNotifier extends AsyncNotifier<List<PopularRoute>> {
  String? _activeFilter;

  @override
  Future<List<PopularRoute>> build() async {
    // PENDING: return homeService.getPopularRoutes(serviceType: _activeFilter)
    return const [];
  }

  Future<void> filterByServiceType(String? serviceType) async {
    _activeFilter = serviceType;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      // PENDING: return homeService.getPopularRoutes(serviceType: serviceType)
      return const <PopularRoute>[];
    });
  }
}

/// Provides the single active/upcoming trip for the bottom-of-hero card.
/// null means no active trip (show empty state).
final activeTripProvider =
    AsyncNotifierProvider<ActiveTripNotifier, ActiveTrip?>(
  ActiveTripNotifier.new,
);

class ActiveTripNotifier extends AsyncNotifier<ActiveTrip?> {
  @override
  Future<ActiveTrip?> build() async {
    // PENDING: return homeService.getActiveTrip()
    return null;
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      // PENDING: return homeService.getActiveTrip()
      return null;
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
    // PENDING: return homeService.getPromotions()
    return const [];
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      // PENDING: return homeService.getPromotions()
      return const <Promotion>[];
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
    // PENDING: return homeService.getNotifications(page: 1)
    return const [];
  }

  Future<void> loadMore() async {
    if (!_hasMore) return;
    final current = state.valueOrNull ?? [];
    // PENDING: fetch next page and append
    _hasMore = false; // set to false until backend wired
    state = AsyncValue.data(current);
  }

  Future<void> markAllRead() async {
    // PENDING: homeService.markAllNotificationsRead()
    final current = state.valueOrNull ?? [];
    final updated = current.map((n) => n.copyWith(isRead: true)).toList();
    state = AsyncValue.data(updated);
  }
}
