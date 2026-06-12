import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import 'core/router/app_router.dart';
import 'core/services/push_notification_service.dart';
import 'features/auth/domain/auth_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const ProviderScope(child: UtbpApp()));
}

class UtbpApp extends ConsumerStatefulWidget {
  const UtbpApp({super.key});

  @override
  ConsumerState<UtbpApp> createState() => _UtbpAppState();
}

class _UtbpAppState extends ConsumerState<UtbpApp> {
  late final AuthStateNotifier _authNotifier;
  late final GoRouterWrapper _routerWrapper;

  @override
  void initState() {
    super.initState();
    _authNotifier = AuthStateNotifier();
    _routerWrapper = GoRouterWrapper(buildAppRouter(_authNotifier));
    // Initialise push notification service (sets up foreground + background
    // handlers). Best-effort — failures must not prevent app startup.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await ref
            .read(pushNotificationServiceProvider)
            .init();
      } catch (e) {
        debugPrint('[main] pushNotificationService.init error: $e');
      }
    });
  }

  @override
  void dispose() {
    _authNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Keep the auth notifier in sync with Riverpod state.
    // GoRouter's refreshListenable fires whenever _authNotifier.value changes.
    // Also trigger FCM token registration when auth state transitions to
    // authenticated (covers session-restore on cold start).
    ref.listen(authNotifierProvider, (previous, next) {
      _authNotifier.value = next.valueOrNull;

      final authState = next.valueOrNull;
      final prevAuthState = previous?.valueOrNull;
      // Only act when the state *becomes* authenticated — avoid re-registering
      // on unrelated state rebuilds.
      if (authState != null &&
          authState.isAuthenticated &&
          authState.profile != null &&
          (prevAuthState == null || !prevAuthState.isAuthenticated)) {
        ref
            .read(pushNotificationServiceProvider)
            .registerToken(authState.profile!.id)
            .ignore();
      }
    });

    final brandAsync = ref.watch(brandingNotifierProvider);
    final brand = brandAsync.valueOrNull ?? AppBrandConfig.fallback();

    return MaterialApp.router(
      title: 'Air Taxi',
      theme: UtbpTheme.fromConfig(brand),
      routerConfig: _routerWrapper.router,
      debugShowCheckedModeBanner: false,
    );
  }
}

/// Thin wrapper so we can hold a GoRouter instance as a field without
/// storing it in Riverpod state (GoRouter is not a Riverpod-managed object).
class GoRouterWrapper {
  final GoRouter router;
  GoRouterWrapper(this.router);
}
