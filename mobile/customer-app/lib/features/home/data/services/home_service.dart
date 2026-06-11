// NOTE: All endpoints under /api/v1/app/home/, /api/v1/app/trips/,
// /api/v1/app/promotions/, and /api/v1/app/notifications/ are PENDING
// backend implementation. See BACKEND_CHANGE_REQUEST.md in the module log.
// Methods throw UnimplementedError until the backend is available.

import 'package:utbp_api_client/utbp_api_client.dart';

import '../../domain/home_models.dart';

class HomeService {
  final UtbpApiClient _client;

  HomeService({required UtbpApiClient client}) : _client = client;

  /// GET /api/v1/app/home/popular-routes
  /// Query params: serviceType? (filter by service type slug)
  /// Returns: List<PopularRoute>
  Future<List<PopularRoute>> getPopularRoutes({
    String? serviceType,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/home/popular-routes is not yet implemented.',
    );
  }

  /// GET /api/v1/app/trips/active
  /// Returns the customer's single active/upcoming trip, or null if none.
  Future<ActiveTrip?> getActiveTrip() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/trips/active is not yet implemented.',
    );
  }

  /// GET /api/v1/app/home/service-types
  /// Returns the list of service types enabled for this deployment.
  Future<List<ServiceType>> getServiceTypes() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/home/service-types is not yet implemented.',
    );
  }

  /// GET /api/v1/app/promotions
  /// Returns active promotions for the authenticated customer.
  Future<List<Promotion>> getPromotions() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/promotions is not yet implemented.',
    );
  }

  /// GET /api/v1/app/notifications
  /// Query params: page (default: 1)
  /// Returns paginated list of notifications.
  Future<List<AppNotification>> getNotifications({int page = 1}) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/notifications is not yet implemented.',
    );
  }

  /// PATCH /api/v1/app/notifications/read-all
  /// Marks all notifications as read.
  Future<void> markAllNotificationsRead() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'PATCH /api/v1/app/notifications/read-all is not yet implemented.',
    );
  }
}
