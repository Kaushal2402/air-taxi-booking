class CustomerProfile {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? avatarUrl;
  final String? homeCity;
  final bool notificationsEnabled;

  const CustomerProfile({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.avatarUrl,
    this.homeCity,
    this.notificationsEnabled = true,
  });

  factory CustomerProfile.fromJson(Map<String, dynamic> json) =>
      CustomerProfile(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        homeCity: json['home_city'] as String?,
        notificationsEnabled:
            json['notifications_enabled'] as bool? ?? true,
      );

  CustomerProfile copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? avatarUrl,
    String? homeCity,
    bool? notificationsEnabled,
  }) =>
      CustomerProfile(
        id: id ?? this.id,
        name: name ?? this.name,
        email: email ?? this.email,
        phone: phone ?? this.phone,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        homeCity: homeCity ?? this.homeCity,
        notificationsEnabled:
            notificationsEnabled ?? this.notificationsEnabled,
      );
}

class AuthState {
  final bool isAuthenticated;
  final CustomerProfile? profile;

  const AuthState({
    this.isAuthenticated = false,
    this.profile,
  });

  static const AuthState guest = AuthState(isAuthenticated: false);

  AuthState copyWith({
    bool? isAuthenticated,
    CustomerProfile? profile,
  }) =>
      AuthState(
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        profile: profile ?? this.profile,
      );
}
