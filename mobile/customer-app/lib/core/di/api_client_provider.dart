import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_api_client/utbp_api_client.dart';

/// Single source of truth for the shared [UtbpApiClient] instance.
/// Both [auth_provider.dart] and [push_notification_service.dart] import
/// from here to avoid circular dependencies.
final utbpApiClientProvider = Provider<UtbpApiClient>((ref) {
  return UtbpApiClient(
    baseUrl: const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:8000',
    ),
  );
});
