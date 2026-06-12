import 'dart:io';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:utbp_api_client/utbp_api_client.dart';

import '../di/api_client_provider.dart';

// ---------------------------------------------------------------------------
// Background message handler — must be a top-level function.
// Dart isolate limitations prevent calling Riverpod providers here.
// ---------------------------------------------------------------------------
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase must be initialised in the background isolate too.
  await Firebase.initializeApp();
  debugPrint(
    '[PushNotification] Background message received: ${message.messageId}',
  );
}

// ---------------------------------------------------------------------------
// PushNotificationService
// ---------------------------------------------------------------------------

/// Manages FCM token lifecycle: initialise, register, refresh, deregister.
///
/// All network calls are best-effort — failures are caught and logged so
/// they never interrupt the auth flow.
class PushNotificationService {
  PushNotificationService({required UtbpApiClient apiClient})
      : _apiClient = apiClient;

  final UtbpApiClient _apiClient;

  /// In-memory FCM token so [deregisterToken] knows what to send.
  String? _currentToken;

  // --------------------------------------------------------------------------
  // Initialisation (call once from main() after Firebase.initializeApp())
  // --------------------------------------------------------------------------

  /// Sets up foreground notification display and background handler.
  /// Must be called after [Firebase.initializeApp()].
  Future<void> init() async {
    // Register the background handler.
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Foreground message listener.
    // flutter_local_notifications is not in pubspec — log only.
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint(
        '[PushNotification] Foreground message: '
        'title=${message.notification?.title} '
        'body=${message.notification?.body}',
      );
    });
  }

  // --------------------------------------------------------------------------
  // Token registration (call after successful sign-in / session restore)
  // --------------------------------------------------------------------------

  /// Requests permission, fetches the FCM token and registers it with the
  /// backend for [customerId].
  Future<void> registerToken(String customerId) async {
    try {
      // Request permission — no-op on Android (always granted at this level).
      final settings =
          await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        debugPrint('[PushNotification] Notification permission denied.');
        return;
      }

      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) {
        debugPrint('[PushNotification] FCM token is null — skipping register.');
        return;
      }

      _currentToken = token;
      await _callRegister(customerId: customerId, token: token);

      // Re-register whenever the token rotates.
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
        debugPrint('[PushNotification] Token refreshed — re-registering.');
        _currentToken = newToken;
        await _callRegister(customerId: customerId, token: newToken);
      });
    } catch (e) {
      debugPrint('[PushNotification] registerToken error: $e');
    }
  }

  // --------------------------------------------------------------------------
  // Token deregistration (call before clearing auth tokens on sign-out)
  // --------------------------------------------------------------------------

  /// Sends the stored FCM token to the backend deregister endpoint.
  /// Safe to call even if no token is stored — returns immediately.
  Future<void> deregisterToken() async {
    final token = _currentToken;
    if (token == null) {
      debugPrint('[PushNotification] No token to deregister.');
      return;
    }
    try {
      final dio = _buildDio();
      await dio.post<dynamic>(
        '/api/v1/push-tokens/customer/deregister',
        data: {'token': token},
      );
      debugPrint('[PushNotification] Token deregistered.');
      _currentToken = null;
    } catch (e) {
      debugPrint('[PushNotification] deregisterToken error: $e');
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  Future<void> _callRegister({
    required String customerId,
    required String token,
  }) async {
    try {
      final dio = _buildDio();
      await dio.post<dynamic>(
        '/api/v1/push-tokens/customer/register',
        queryParameters: {'customer_id': customerId},
        data: {
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
          'device_name': Platform.operatingSystem,
        },
      );
      debugPrint('[PushNotification] Token registered for customer $customerId.');
    } catch (e) {
      debugPrint('[PushNotification] _callRegister error: $e');
    }
  }

  /// Builds a bare Dio instance pointing at the same base URL as the shared
  /// UtbpApiClient. The push-token endpoints carry no auth guard so we do
  /// not need the token interceptor here.
  Dio _buildDio() {
    return Dio(
      BaseOptions(
        baseUrl: _apiClient.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {'Content-Type': 'application/json'},
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod provider
// ---------------------------------------------------------------------------

/// Provider for [PushNotificationService].
/// Importing [api_client_provider.dart] directly (not [auth_provider.dart])
/// keeps this file free of circular imports.
final pushNotificationServiceProvider = Provider<PushNotificationService>(
  (ref) {
    final client = ref.read(utbpApiClientProvider);
    return PushNotificationService(apiClient: client);
  },
);
