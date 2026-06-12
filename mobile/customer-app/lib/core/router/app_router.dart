import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/domain/auth_provider.dart';
import '../../features/auth/domain/auth_models.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/welcome_screen.dart';
import '../../features/auth/presentation/screens/sign_in_screen.dart';
import '../../features/auth/presentation/screens/sign_up_screen.dart';
import '../../features/auth/presentation/screens/otp_screen.dart';
import '../../features/auth/presentation/screens/profile_setup_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/reset_sent_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/home/presentation/screens/all_services_screen.dart';
import '../../features/home/presentation/screens/explore_routes_screen.dart';
import '../../features/home/presentation/screens/route_preview_screen.dart';
import '../../features/home/presentation/screens/promotions_screen.dart';
import '../../features/home/presentation/screens/notifications_screen.dart';
// Module 03 — Booking
import '../../features/booking/presentation/screens/origin_picker_screen.dart';
import '../../features/booking/presentation/screens/destination_picker_screen.dart';
import '../../features/booking/presentation/screens/date_time_screen.dart';
import '../../features/booking/presentation/screens/passenger_count_screen.dart';
import '../../features/booking/presentation/screens/search_results_screen.dart';
import '../../features/booking/presentation/screens/seat_map_screen.dart';
import '../../features/booking/presentation/screens/passenger_details_screen.dart';
import '../../features/booking/presentation/screens/booking_summary_screen.dart';

// ---------------------------------------------------------------------------
// Route name constants — use from widgets instead of raw strings
// ---------------------------------------------------------------------------

abstract class AppRoutes {
  static const splash = '/splash';
  static const welcome = '/welcome';
  static const signIn = '/auth/sign-in';
  static const signUp = '/auth/sign-up';
  static const otp = '/auth/otp';
  static const profileSetup = '/auth/profile-setup';
  static const forgotPassword = '/auth/forgot-password';
  static const resetSent = '/auth/reset-sent';
  static const home = '/home';
  static const allServices = '/home/services';
  static const exploreRoutes = '/home/explore';
  static const routePreview = '/home/route/:routeId';
  static const promotions = '/home/promotions';
  static const notifications = '/home/notifications';

  // Module 03 — Booking flow
  /// Entry point of the booking flow — origin helipad selection.
  static const bookingOrigin = '/booking/origin';
  static const bookingDestination = '/booking/destination';
  static const bookingDateTime = '/booking/date-time';
  static const bookingPassengers = '/booking/passengers';
  static const bookingResults = '/booking/results';
  static const bookingSeatMap = '/booking/seats';
  static const bookingPassengerDetails = '/booking/passenger-details';
  static const bookingSummary = '/booking/summary';

  /// Substitutes the :routeId param for navigation.
  static String routePreviewPath(String routeId) => '/home/route/$routeId';
}

// ---------------------------------------------------------------------------
// Auth-state bridge for GoRouter refreshListenable
//
// Usage: pass a `ValueNotifier<AuthState?>` that is updated whenever
// the Riverpod authNotifierProvider changes. The UtbpApp widget in
// main.dart is responsible for creating and keeping this notifier in sync.
// ---------------------------------------------------------------------------

class AuthStateNotifier extends ValueNotifier<AuthState?> {
  AuthStateNotifier() : super(null);
}

// ---------------------------------------------------------------------------
// Router factory
//
// Call `buildAppRouter(authNotifier)` from main.dart after creating the
// AuthStateNotifier and wiring it to the Riverpod ProviderScope listener.
// ---------------------------------------------------------------------------

GoRouter buildAppRouter(AuthStateNotifier authNotifier) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: authNotifier,
    redirect: (BuildContext context, GoRouterState state) {
      final auth = authNotifier.value;
      final isLoading = auth == null; // null = loading

      // While loading, hold on splash
      if (isLoading) {
        return state.matchedLocation == AppRoutes.splash
            ? null
            : AppRoutes.splash;
      }

      final isAuthenticated = auth.isAuthenticated;
      final loc = state.matchedLocation;
      final onPublicRoute =
          _publicRoutes.contains(loc) || loc.startsWith('/auth/');

      // Redirect unauthenticated users away from protected routes
      if (!isAuthenticated && !onPublicRoute) {
        return AppRoutes.welcome;
      }
      // Redirect authenticated users off auth screens
      if (isAuthenticated && (loc == AppRoutes.welcome || onPublicRoute)) {
        return AppRoutes.home;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.welcome,
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.signIn,
        builder: (context, state) => const SignInScreen(),
      ),
      GoRoute(
        path: AppRoutes.signUp,
        builder: (context, state) => const SignUpScreen(),
      ),
      GoRoute(
        path: AppRoutes.otp,
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'] ?? '';
          return OtpScreen(phone: phone);
        },
      ),
      GoRoute(
        path: AppRoutes.profileSetup,
        builder: (context, state) => const ProfileSetupScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.resetSent,
        builder: (context, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return ResetSentScreen(email: email);
        },
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.allServices,
        builder: (context, state) => const AllServicesScreen(),
      ),
      GoRoute(
        path: AppRoutes.exploreRoutes,
        builder: (context, state) => const ExploreRoutesScreen(),
      ),
      GoRoute(
        path: AppRoutes.routePreview,
        builder: (context, state) {
          // routeId is guaranteed non-null when the route is matched
          final routeId = state.pathParameters['routeId']!;
          return RoutePreviewScreen(routeId: routeId);
        },
      ),
      GoRoute(
        path: AppRoutes.promotions,
        builder: (context, state) => const PromotionsScreen(),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),

      // ── Module 03 — Booking flow ──────────────────────────────────────────

      GoRoute(
        path: AppRoutes.bookingOrigin,
        builder: (context, state) => const OriginPickerScreen(),
      ),
      GoRoute(
        path: AppRoutes.bookingDestination,
        builder: (context, state) => const DestinationPickerScreen(),
      ),
      GoRoute(
        path: AppRoutes.bookingDateTime,
        builder: (context, state) => const DateTimeScreen(),
      ),
      GoRoute(
        path: AppRoutes.bookingPassengers,
        builder: (context, state) => const PassengerCountScreen(),
      ),
      GoRoute(
        path: AppRoutes.bookingResults,
        builder: (context, state) => const SearchResultsScreen(),
      ),
      GoRoute(
        path: AppRoutes.bookingSeatMap,
        builder: (context, state) => const SeatMapScreen(),
      ),
      GoRoute(
        path: AppRoutes.bookingPassengerDetails,
        builder: (context, state) => const PassengerDetailsScreen(),
      ),
      GoRoute(
        path: AppRoutes.bookingSummary,
        builder: (context, state) => const BookingSummaryScreen(),
      ),
    ],
  );
}

const _publicRoutes = {
  AppRoutes.splash,
  AppRoutes.welcome,
  AppRoutes.signIn,
  AppRoutes.signUp,
  AppRoutes.forgotPassword,
  AppRoutes.resetSent,
};
