import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_models.dart';

// ---------------------------------------------------------------------------
// AuthNotifier
// ---------------------------------------------------------------------------
// All mutating methods are stubs pending backend availability.
// The router (app_router.dart) watches this provider to gate navigation.
// On logout, state is reset to AuthState.guest — this is the contract
// every other provider that holds user data must listen to.
// ---------------------------------------------------------------------------

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    // TODO: read token from secure storage; if valid call GET /me
    // For now, always start as guest until backend endpoints are ready.
    return AuthState.guest;
  }

  /// Sign in with email + password.
  /// On success: saves tokens, updates state to authenticated.
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = const AsyncValue.loading();
    // TODO: call authService.loginWithEmail(email, password)
    // For now return guest — presentation layer handles UnimplementedError
    state = const AsyncValue.data(AuthState.guest);
  }

  /// Register with name + phone + optional email/password.
  /// On success: saves tokens, updates state to authenticated.
  Future<void> signUp({
    required String name,
    required String phone,
    String? email,
    String? password,
  }) async {
    state = const AsyncValue.loading();
    // TODO: call authService.register(...)
    state = const AsyncValue.data(AuthState.guest);
  }

  /// Verify OTP for phone-based login/registration.
  /// On success: saves tokens, navigates to profile-setup if new user.
  Future<bool> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    state = const AsyncValue.loading();
    // TODO: call authService.verifyOtp(phone, otp)
    state = const AsyncValue.data(AuthState.guest);
    return false; // false = existing user, true = new user needing profile setup
  }

  /// Completes profile setup (step 3 of onboarding).
  Future<void> completeProfileSetup({
    required String displayName,
    String? homeCity,
    bool notificationsEnabled = true,
  }) async {
    state = const AsyncValue.loading();
    // TODO: call authService.updateMe({display_name, home_city, notifications_enabled})
    state = const AsyncValue.data(AuthState.guest);
  }

  /// Sends a password reset email.
  Future<void> forgotPassword(String email) async {
    // TODO: call authService.forgotPassword(email)
    throw UnimplementedError('forgotPassword: backend endpoint pending.');
  }

  /// Signs out: clears tokens, resets all user state.
  Future<void> signOut() async {
    state = const AsyncValue.loading();
    // TODO: call authService.logout() then client.clearTokens()
    // IMPORTANT: when backend is wired, also reset every other provider
    // that holds user data (home, trips, wallet, profile, notifications).
    state = const AsyncValue.data(AuthState.guest);
  }

  /// Refreshes the profile from GET /me.
  Future<void> refreshProfile() async {
    final current = state.valueOrNull;
    if (current == null || !current.isAuthenticated) return;
    // TODO: call authService.getMe() and update state
  }
}

final authNotifierProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
