// NOTE: All endpoints under /api/v1/app/auth/ are PENDING backend
// implementation. See BACKEND_CHANGE_REQUEST.md in the module log.
// Methods throw UnimplementedError until the backend is available.
// The presentation layer must show appropriate "service unavailable"
// states and never crash.

import 'package:utbp_api_client/utbp_api_client.dart';

import '../../domain/auth_models.dart';

class AuthService {
  final UtbpApiClient _client;

  AuthService({required UtbpApiClient client}) : _client = client;

  /// POST /api/v1/app/auth/register
  /// Body: { name, phone, email?, password? }
  /// Returns: { access_token, refresh_token, customer: {...} }
  Future<Map<String, dynamic>> register({
    required String name,
    required String phone,
    String? email,
    String? password,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/register is not yet implemented in the backend.',
    );
  }

  /// POST /api/v1/app/auth/otp/send
  /// Body: { phone }
  /// Returns: 204 No Content
  Future<void> sendOtp(String phone) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/otp/send is not yet implemented in the backend.',
    );
  }

  /// POST /api/v1/app/auth/otp/verify
  /// Body: { phone, otp }
  /// Returns: { access_token, refresh_token, customer: {...}, is_new_user: bool }
  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/otp/verify is not yet implemented in the backend.',
    );
  }

  /// POST /api/v1/app/auth/login
  /// Body: { email, password }
  /// Returns: { access_token, refresh_token, customer: {...} }
  Future<Map<String, dynamic>> loginWithEmail(
    String email,
    String password,
  ) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/login is not yet implemented in the backend.',
    );
  }

  /// GET /api/v1/app/auth/me
  /// Returns: CustomerProfile
  Future<CustomerProfile> getMe() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/auth/me is not yet implemented in the backend.',
    );
  }

  /// PATCH /api/v1/app/auth/me
  /// Body: partial CustomerProfile fields
  /// Returns: CustomerProfile
  Future<CustomerProfile> updateMe(Map<String, dynamic> data) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'PATCH /api/v1/app/auth/me is not yet implemented in the backend.',
    );
  }

  /// POST /api/v1/app/auth/logout
  /// Returns: 204 No Content
  Future<void> logout() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/logout is not yet implemented in the backend.',
    );
  }

  /// POST /api/v1/app/auth/forgot-password
  /// Body: { email }
  /// Returns: 204 No Content
  Future<void> forgotPassword(String email) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/forgot-password is not yet implemented in the backend.',
    );
  }

  /// POST /api/v1/app/auth/reset-password
  /// Body: { token, password }
  /// Returns: 204 No Content
  Future<void> resetPassword(String token, String password) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/reset-password is not yet implemented in the backend.',
    );
  }

  /// POST /api/v1/app/auth/refresh
  /// Body: { refresh_token }
  /// Returns: { access_token }
  /// NOTE: This is handled automatically by the UtbpApiClient interceptor.
  /// Call this directly only for manual refresh scenarios.
  Future<String> refreshAccessToken(String refreshToken) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/auth/refresh is not yet implemented in the backend.',
    );
  }
}
