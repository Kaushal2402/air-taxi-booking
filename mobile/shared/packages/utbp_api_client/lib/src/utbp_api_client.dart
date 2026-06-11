// STUB: UtbpApiClient — real implementation pending Dio + interceptor wiring.
// This file exists so dependent packages can import utbp_api_client without
// compile errors. Replace the method bodies when the backend is available.

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kAccessTokenKey = 'utbp_access_token';
const _kRefreshTokenKey = 'utbp_refresh_token';

/// White-label API client used by all feature services.
/// Wraps Dio and provides token storage via flutter_secure_storage.
class UtbpApiClient {
  final String baseUrl;
  final FlutterSecureStorage _storage;

  UtbpApiClient({
    required this.baseUrl,
    FlutterSecureStorage? storage,
  }) : _storage = storage ?? const FlutterSecureStorage();

  /// Retrieve the stored access token, or null if not present.
  Future<String?> getToken() async {
    return _storage.read(key: _kAccessTokenKey);
  }

  /// Persist access and refresh tokens to secure storage.
  Future<void> saveTokens({
    required String access,
    required String refresh,
  }) async {
    await _storage.write(key: _kAccessTokenKey, value: access);
    await _storage.write(key: _kRefreshTokenKey, value: refresh);
  }

  /// Remove all stored tokens (sign-out).
  Future<void> clearTokens() async {
    await _storage.delete(key: _kAccessTokenKey);
    await _storage.delete(key: _kRefreshTokenKey);
  }
}
