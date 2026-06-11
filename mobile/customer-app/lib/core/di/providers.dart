// Shared infrastructure providers used by multiple features.
// Centralising here avoids circular imports between auth_provider.dart
// and home_providers.dart.
//
// auth_provider.dart still defines utbpApiClientProvider for backward
// compatibility — it is re-exported from here so other features can
// import from a single location.

export '../../features/auth/domain/auth_provider.dart'
    show utbpApiClientProvider;
