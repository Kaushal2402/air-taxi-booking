import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'branding_service.dart';
import 'models/app_brand_config.dart';

final brandingServiceProvider = Provider<BrandingService>((ref) {
  return BrandingService(
    baseUrl: const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:8000',
    ),
  );
});

final brandingNotifierProvider =
    AsyncNotifierProvider<BrandingNotifier, AppBrandConfig>(
  BrandingNotifier.new,
);

class BrandingNotifier extends AsyncNotifier<AppBrandConfig> {
  @override
  Future<AppBrandConfig> build() async {
    return ref.read(brandingServiceProvider).fetchActive();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(brandingServiceProvider).fetchActive(),
    );
  }
}
