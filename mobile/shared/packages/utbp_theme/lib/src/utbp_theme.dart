import 'package:flutter/material.dart';

import 'models/app_brand_config.dart';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

Color _hexToColor(String hex) {
  final clean = hex.replaceAll('#', '');
  final value = int.parse(
    clean.length == 6 ? 'FF$clean' : clean,
    radix: 16,
  );
  return Color(value);
}

// ---------------------------------------------------------------------------
// Semantic color extension — gives screens access to brand-derived colors
// without needing to call _hexToColor directly.
// ---------------------------------------------------------------------------

extension UtbpColors on AppBrandConfig {
  Color get primary => _hexToColor(primaryColor);
  Color get ink => _hexToColor(inkColor);
  Color get surface => _hexToColor(surfaceColor);
  Color get bg => _hexToColor(bgColor);
  Color get success => _hexToColor(successColor);

  /// Forest is a deeply darkened primary used for hero section backgrounds.
  Color get forest =>
      HSLColor.fromColor(primary).withLightness(0.12).toColor();

  /// Forest-deep is the deepest dark stop in forest gradients.
  Color get forestDeep =>
      HSLColor.fromColor(primary).withLightness(0.09).toColor();

  /// Jade is a lighter, more vibrant variant of primary for highlights.
  Color get jade =>
      HSLColor.fromColor(primary).withLightness(0.51).toColor();

  /// Mint is the primary color at very low opacity — soft tinted background.
  Color get mint => primary.withOpacity(0.12);
}

// ---------------------------------------------------------------------------
// Theme builder
// ---------------------------------------------------------------------------

class UtbpTheme {
  UtbpTheme._();

  static ThemeData fromConfig(AppBrandConfig config) {
    final primary = _hexToColor(config.primaryColor);
    final ink = _hexToColor(config.inkColor);
    final surfaceColor = _hexToColor(config.surfaceColor);
    final bg = _hexToColor(config.bgColor);
    final success = _hexToColor(config.successColor);

    // Derive semantic shades
    final inkSubtle = ink.withOpacity(0.55);
    final ruleColor = ink.withOpacity(0.10);

    final colorScheme = ColorScheme.light(
      primary: primary,
      onPrimary: Colors.white,
      secondary: success,
      onSecondary: Colors.white,
      surface: surfaceColor,
      onSurface: ink,
      // ignore: deprecated_member_use
      background: bg,
      // ignore: deprecated_member_use
      onBackground: ink,
      outline: ruleColor,
      error: const Color(0xFFCC2B22),
      onError: Colors.white,
    );

    final textTheme = _buildTextTheme(
      displayFont: config.displayFont,
      bodyFont: config.textFont,
      baseColor: ink,
      subtleColor: inkSubtle,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: bg,
      textTheme: textTheme,
      primaryTextTheme: textTheme,
      dividerColor: ruleColor,
      dividerTheme: DividerThemeData(color: ruleColor, thickness: 1),

      appBarTheme: AppBarTheme(
        backgroundColor: surfaceColor,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          fontFamily: config.displayFont,
          fontSize: 20,
          fontWeight: FontWeight.w400,
          color: ink,
          letterSpacing: -0.025 * 20,
        ),
        iconTheme: IconThemeData(color: ink),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 56),
          shape: const StadiumBorder(),
          textStyle: TextStyle(
            fontFamily: config.textFont,
            fontSize: 16,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.02,
          ),
          elevation: 0,
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: BorderSide(color: primary, width: 1.5),
          minimumSize: const Size(double.infinity, 56),
          shape: const StadiumBorder(),
          textStyle: TextStyle(
            fontFamily: config.textFont,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: TextStyle(
            fontFamily: config.textFont,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceColor,
        contentPadding: const EdgeInsetsDirectional.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: ruleColor, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: ink.withOpacity(0.20),
            width: 1.5,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(
            color: Color(0xFFCC2B22),
            width: 1.5,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(
            color: Color(0xFFCC2B22),
            width: 2,
          ),
        ),
        labelStyle: TextStyle(
          fontFamily: config.textFont,
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: inkSubtle,
        ),
        hintStyle: TextStyle(
          fontFamily: config.textFont,
          fontSize: 16,
          color: ink.withOpacity(0.35),
        ),
      ),

      cardTheme: CardThemeData(
        color: surfaceColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: ruleColor),
        ),
        margin: EdgeInsets.zero,
      ),

      chipTheme: ChipThemeData(
        backgroundColor: surfaceColor,
        selectedColor: _hexToColor(config.primaryColor).withOpacity(0.12),
        labelStyle: TextStyle(
          fontFamily: config.textFont,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
        side: BorderSide(color: ruleColor),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      ),

      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surfaceColor,
        selectedItemColor: primary,
        unselectedItemColor: ink.withOpacity(0.38),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(
          fontFamily: config.textFont,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: TextStyle(
          fontFamily: config.textFont,
          fontSize: 11,
          fontWeight: FontWeight.w400,
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surfaceColor,
        indicatorColor: primary.withOpacity(0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontFamily: config.textFont,
            fontSize: 11,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            color: selected ? primary : ink.withOpacity(0.38),
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? primary : ink.withOpacity(0.38),
          );
        }),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: ink,
        contentTextStyle: TextStyle(
          fontFamily: config.textFont,
          fontSize: 14,
          color: Colors.white,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        behavior: SnackBarBehavior.floating,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: surfaceColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        titleTextStyle: TextStyle(
          fontFamily: config.displayFont,
          fontSize: 22,
          fontWeight: FontWeight.w400,
          color: ink,
        ),
        contentTextStyle: TextStyle(
          fontFamily: config.textFont,
          fontSize: 15,
          color: inkSubtle,
        ),
      ),
    );
  }

  static TextTheme _buildTextTheme({
    required String displayFont,
    required String bodyFont,
    required Color baseColor,
    required Color subtleColor,
  }) {
    return TextTheme(
      // Serif display styles
      displayLarge: TextStyle(
        fontFamily: displayFont,
        fontSize: 57,
        fontWeight: FontWeight.w300,
        color: baseColor,
        letterSpacing: -0.025 * 57,
        height: 1.12,
      ),
      displayMedium: TextStyle(
        fontFamily: displayFont,
        fontSize: 45,
        fontWeight: FontWeight.w300,
        color: baseColor,
        letterSpacing: -0.025 * 45,
        height: 1.12,
      ),
      displaySmall: TextStyle(
        fontFamily: displayFont,
        fontSize: 36,
        fontWeight: FontWeight.w400,
        color: baseColor,
        letterSpacing: -0.025 * 36,
        height: 1.1,
      ),
      headlineLarge: TextStyle(
        fontFamily: displayFont,
        fontSize: 32,
        fontWeight: FontWeight.w400,
        color: baseColor,
        letterSpacing: -0.025 * 32,
        height: 1.15,
      ),
      headlineMedium: TextStyle(
        fontFamily: displayFont,
        fontSize: 28,
        fontWeight: FontWeight.w400,
        color: baseColor,
        letterSpacing: -0.025 * 28,
        height: 1.2,
      ),
      headlineSmall: TextStyle(
        fontFamily: displayFont,
        fontSize: 24,
        fontWeight: FontWeight.w400,
        color: baseColor,
        letterSpacing: -0.025 * 24,
        height: 1.25,
      ),
      // Sans body styles
      titleLarge: TextStyle(
        fontFamily: bodyFont,
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: baseColor,
        letterSpacing: -0.02,
      ),
      titleMedium: TextStyle(
        fontFamily: bodyFont,
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: baseColor,
        letterSpacing: -0.015,
      ),
      titleSmall: TextStyle(
        fontFamily: bodyFont,
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: baseColor,
        letterSpacing: -0.01,
      ),
      bodyLarge: TextStyle(
        fontFamily: bodyFont,
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: baseColor,
        height: 1.55,
      ),
      bodyMedium: TextStyle(
        fontFamily: bodyFont,
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: baseColor,
        height: 1.5,
      ),
      bodySmall: TextStyle(
        fontFamily: bodyFont,
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: subtleColor,
        height: 1.45,
      ),
      labelLarge: TextStyle(
        fontFamily: bodyFont,
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: baseColor,
        letterSpacing: -0.01,
      ),
      labelMedium: TextStyle(
        fontFamily: bodyFont,
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: subtleColor,
      ),
      labelSmall: TextStyle(
        fontFamily: 'IBMPlexMono',
        fontSize: 11,
        fontWeight: FontWeight.w400,
        color: subtleColor,
        letterSpacing: 0.1,
      ),
    );
  }
}
