class AppBrandConfig {
  final String primaryColor;
  final String inkColor;
  final String surfaceColor;
  final String bgColor;
  final String successColor;
  final String displayFont;
  final String textFont;
  final String? logoUrl;
  final String? logoDarkUrl;

  const AppBrandConfig({
    required this.primaryColor,
    required this.inkColor,
    required this.surfaceColor,
    required this.bgColor,
    required this.successColor,
    required this.displayFont,
    required this.textFont,
    this.logoUrl,
    this.logoDarkUrl,
  });

  factory AppBrandConfig.fallback() => const AppBrandConfig(
        primaryColor: '#18B574',
        inkColor: '#131311',
        surfaceColor: '#FFFFFF',
        bgColor: '#F8F8F6',
        successColor: '#18B574',
        displayFont: 'Newsreader',
        textFont: 'IBMPlexSans',
      );

  factory AppBrandConfig.fromJson(Map<String, dynamic> json) => AppBrandConfig(
        primaryColor: json['primary_color'] as String? ?? '#18B574',
        inkColor: json['ink_color'] as String? ?? '#131311',
        surfaceColor: json['surface_color'] as String? ?? '#FFFFFF',
        bgColor: json['bg_color'] as String? ?? '#F8F8F6',
        successColor: json['success_color'] as String? ?? '#18B574',
        displayFont: json['display_font'] as String? ?? 'Newsreader',
        // "IBM Plex Sans" -> "IBMPlexSans" for Flutter fontFamily
        textFont: (json['text_font'] as String? ?? 'IBM Plex Sans')
            .replaceAll(' ', ''),
        logoUrl: json['logo_url'] as String?,
        logoDarkUrl: json['logo_dark_url'] as String?,
      );

  AppBrandConfig copyWith({
    String? primaryColor,
    String? inkColor,
    String? surfaceColor,
    String? bgColor,
    String? successColor,
    String? displayFont,
    String? textFont,
    String? logoUrl,
    String? logoDarkUrl,
  }) =>
      AppBrandConfig(
        primaryColor: primaryColor ?? this.primaryColor,
        inkColor: inkColor ?? this.inkColor,
        surfaceColor: surfaceColor ?? this.surfaceColor,
        bgColor: bgColor ?? this.bgColor,
        successColor: successColor ?? this.successColor,
        displayFont: displayFont ?? this.displayFont,
        textFont: textFont ?? this.textFont,
        logoUrl: logoUrl ?? this.logoUrl,
        logoDarkUrl: logoDarkUrl ?? this.logoDarkUrl,
      );
}
