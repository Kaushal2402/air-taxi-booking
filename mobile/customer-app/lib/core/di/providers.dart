// Shared infrastructure providers used by multiple features.
// Centralising here avoids circular imports.
//
// utbpApiClientProvider is defined in api_client_provider.dart and
// re-exported here (and from auth_provider.dart) for backward compatibility.

export 'api_client_provider.dart' show utbpApiClientProvider;
export '../services/push_notification_service.dart'
    show pushNotificationServiceProvider;
