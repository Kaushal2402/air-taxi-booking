# Theme Engine Complete
- utbp_api_client barrel: ✓
- AppBrandConfig model (plain Dart, no codegen): ✓
- BrandingService (fetch/cache/fallback, 1h TTL): ✓
- BrandingNotifier (AsyncNotifierProvider): ✓
- UtbpTheme.fromConfig() (full Material 3 ThemeData): ✓
- UtbpColors extension (forest, forestDeep, jade, mint, primary, ink, surface, bg, success): ✓
- main.dart (ProviderScope + AuthStateNotifier ValueNotifier bridge for GoRouter refresh): ✓
- App router scaffold (14 routes, redirect guard): ✓
- Module 01 scaffold (auth_models, auth_provider, auth_service stubs, 8 placeholder screens): ✓
- Module 02 scaffold (home_models, home_providers, home_service stubs, 6 placeholder screens): ✓
- Backend change requests (branding public endpoint, auth endpoints, home endpoints): ✓

## Architecture Notes
- GoRouter refreshListenable uses AuthStateNotifier (ValueNotifier bridge) to avoid double-container bug
- BrandingService fallback: fresh network → TTL-valid cache → stale cache → AppBrandConfig.fallback()
- UtbpColors extension derives forest/jade/mint from primary via HSLColor manipulation — no hardcoded colors
- All 14 screens use Theme.of(context) only — zero hardcoded Color() values
