import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'models/app_brand_config.dart';

const _kCacheKey = 'brand_config_cache_v1';
const _kCacheTsKey = 'brand_config_ts_v1';
const _kCacheTtlSeconds = 3600; // 1 hour

class BrandingService {
  final String baseUrl;
  final FlutterSecureStorage _storage;
  late final Dio _dio;

  BrandingService({required this.baseUrl})
      : _storage = const FlutterSecureStorage() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Accept': 'application/json'},
    ));
  }

  /// Fetches the active brand profile.
  /// Priority order:
  ///   1. Fresh network response (if cache older than TTL or no cache)
  ///   2. Valid cached value (if within TTL)
  ///   3. Stale cached value (if network fails)
  ///   4. [AppBrandConfig.fallback()] — never throws
  Future<AppBrandConfig> fetchActive() async {
    // Check cache freshness
    final tsRaw = await _storage.read(key: _kCacheTsKey);
    final cacheRaw = await _storage.read(key: _kCacheKey);
    final bool hasFreshCache = _isCacheFresh(tsRaw);

    if (hasFreshCache && cacheRaw != null) {
      return _parseOrFallback(cacheRaw);
    }

    // Attempt network fetch
    try {
      final response = await _dio.get('/api/v1/branding/public/active');
      if (response.statusCode == 200 && response.data != null) {
        final config = AppBrandConfig.fromJson(
          response.data as Map<String, dynamic>,
        );
        // Write cache
        await _storage.write(
          key: _kCacheKey,
          value: jsonEncode(_toJsonMap(config)),
        );
        await _storage.write(
          key: _kCacheTsKey,
          value: DateTime.now().millisecondsSinceEpoch.toString(),
        );
        return config;
      }
    } catch (_) {
      // Network error — fall through to stale cache or fallback
    }

    // Return stale cache if available
    if (cacheRaw != null) {
      return _parseOrFallback(cacheRaw);
    }

    return AppBrandConfig.fallback();
  }

  bool _isCacheFresh(String? tsRaw) {
    if (tsRaw == null) return false;
    final ts = int.tryParse(tsRaw);
    if (ts == null) return false;
    final age =
        DateTime.now().millisecondsSinceEpoch - ts;
    return age < _kCacheTtlSeconds * 1000;
  }

  AppBrandConfig _parseOrFallback(String raw) {
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return AppBrandConfig.fromJson(map);
    } catch (_) {
      return AppBrandConfig.fallback();
    }
  }

  Map<String, dynamic> _toJsonMap(AppBrandConfig c) => {
        'primary_color': c.primaryColor,
        'ink_color': c.inkColor,
        'surface_color': c.surfaceColor,
        'bg_color': c.bgColor,
        'success_color': c.successColor,
        'display_font': c.displayFont,
        'text_font': c.textFont,
        if (c.logoUrl != null) 'logo_url': c.logoUrl,
        if (c.logoDarkUrl != null) 'logo_dark_url': c.logoDarkUrl,
      };
}
