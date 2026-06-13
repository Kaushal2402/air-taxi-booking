import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/api_client_provider.dart';
import '../../../core/services/push_notification_service.dart';
import '../../../features/booking/domain/providers/booking_providers.dart';
import '../../../features/payment/domain/providers/payment_providers.dart';
import '../data/services/auth_service.dart';
import 'auth_models.dart';

// utbpApiClientProvider is defined in core/di/api_client_provider.dart and
// re-exported from core/di/providers.dart. Re-export it here for backward
// compatibility with callers that import from auth_provider.dart.
export '../../../core/di/api_client_provider.dart' show utbpApiClientProvider;

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(client: ref.read(utbpApiClientProvider));
});

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
    // Check for stored token to restore session.
    final client = ref.read(utbpApiClientProvider);
    final token = await client.getToken();
    if (token == null) return AuthState.guest;

    // Token exists — try to fetch current profile.
    try {
      final service = ref.read(authServiceProvider);
      final profile = await service.getMe();
      return AuthState(isAuthenticated: true, profile: profile);
    } catch (_) {
      // Backend not yet available — treat as guest.
      return AuthState.guest;
    }
  }

  /// Sign in with email + password.
  /// On success: saves tokens, updates state to authenticated.
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(authServiceProvider);
      final data = await service.loginWithEmail(email, password);
      final profile = CustomerProfile.fromJson(
        data['profile'] as Map<String, dynamic>,
      );
      await ref.read(utbpApiClientProvider).saveTokens(
        access: data['access_token'] as String,
        refresh: data['refresh_token'] as String,
      );
      return AuthState(isAuthenticated: true, profile: profile);
    });
  }

  /// Register with name + phone + optional email/password.
  /// On success: saves tokens, OTP sent to phone — returns guest state.
  Future<void> signUp({
    required String name,
    required String phone,
    String? email,
    String? password,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(authServiceProvider);
      await service.register(
        name: name,
        phone: phone,
        email: email,
        password: password,
      );
      // After register, OTP is sent to phone — stay as guest until verified.
      return AuthState.guest;
    });
  }

  /// Verify OTP for phone-based login/registration.
  /// On success: saves tokens, navigates to profile-setup if new user.
  Future<bool> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    state = const AsyncValue.loading();
    bool isNewUser = false;
    state = await AsyncValue.guard(() async {
      final service = ref.read(authServiceProvider);
      final data = await service.verifyOtp(phone, otp);
      isNewUser = data['is_new_user'] as bool? ?? false;
      final profile = CustomerProfile.fromJson(
        data['profile'] as Map<String, dynamic>,
      );
      await ref.read(utbpApiClientProvider).saveTokens(
        access: data['access_token'] as String,
        refresh: data['refresh_token'] as String,
      );
      return AuthState(isAuthenticated: true, profile: profile);
    });
    return isNewUser;
  }

  /// Completes profile setup (step 3 of onboarding).
  Future<void> completeProfileSetup({
    required String displayName,
    String? homeCity,
    bool notificationsEnabled = true,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(authServiceProvider);
      final updated = await service.updateMe({
        'name': displayName,
        if (homeCity != null) 'home_city': homeCity,
        'notifications_enabled': notificationsEnabled,
      });
      return AuthState(isAuthenticated: true, profile: updated);
    });
  }

  /// Sends a password reset email.
  Future<void> forgotPassword(String email) async {
    final service = ref.read(authServiceProvider);
    await service.forgotPassword(email);
  }

  /// Signs out: clears tokens, resets all user state.
  Future<void> signOut() async {
    state = const AsyncValue.loading();
    // Deregister FCM token before clearing auth tokens — best-effort.
    try {
      await ref.read(pushNotificationServiceProvider).deregisterToken();
    } catch (_) {
      // Never block sign-out on push-token failure.
    }
    try {
      await ref.read(authServiceProvider).logout();
    } catch (_) {
      // Best-effort — continue sign-out even if backend call fails.
    }
    await ref.read(utbpApiClientProvider).clearTokens();
    // Reset all booking/payment providers to prevent PII leaking to the
    // next session (required by CLAUDE.md rule: state clears on logout).
    ref.read(bookingFlowProvider.notifier).reset();
    ref.invalidate(fareEstimateProvider);
    ref.invalidate(createBookingProvider);
    ref.invalidate(paymentMethodsProvider);
    ref.invalidate(recentDestinationsProvider);
    ref.invalidate(availableFlightsProvider);
    ref.invalidate(seatMapProvider);
    // Reset payment module providers to prevent PII leaking to the next session.
    ref.read(customerPaymentMethodsProvider.notifier).reset();
    ref.read(bookingConfirmationProvider.notifier).reset();
    ref.read(razorpayOrderProvider.notifier).reset();
    ref.read(upiVerificationProvider.notifier).clear();
    ref.read(acmeMilesAppliedProvider.notifier).state = false;
    ref.read(selectedPaymentMethodIdProvider.notifier).state = null;
    state = const AsyncValue.data(AuthState.guest);
  }

  /// Refreshes the profile from GET /me.
  Future<void> refreshProfile() async {
    final current = state.valueOrNull;
    if (current == null || !current.isAuthenticated) return;
    try {
      final service = ref.read(authServiceProvider);
      final profile = await service.getMe();
      state = AsyncValue.data(
        current.copyWith(profile: profile),
      );
    } catch (_) {
      // Silently ignore — keep existing state on failure.
    }
  }
}

final authNotifierProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
