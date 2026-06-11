class PopularRoute {
  final String id;
  final String fromCity;
  final String toCity;
  final String fromCode;
  final String toCode;
  final int durationMin;
  final int priceMinorUnits;
  final String currency;
  final String serviceType;
  final int availSeats;
  final String badgeType; // 'ok' | 'warn' | 'info'

  const PopularRoute({
    required this.id,
    required this.fromCity,
    required this.toCity,
    required this.fromCode,
    required this.toCode,
    required this.durationMin,
    required this.priceMinorUnits,
    required this.currency,
    required this.serviceType,
    required this.availSeats,
    required this.badgeType,
  });

  factory PopularRoute.fromJson(Map<String, dynamic> json) => PopularRoute(
        id: json['id'] as String,
        fromCity: json['from_city'] as String,
        toCity: json['to_city'] as String,
        fromCode: json['from_code'] as String,
        toCode: json['to_code'] as String,
        durationMin: json['duration_min'] as int,
        priceMinorUnits: json['price_minor_units'] as int,
        currency: json['currency'] as String? ?? 'INR',
        serviceType: json['service_type'] as String,
        availSeats: json['avail_seats'] as int? ?? 0,
        badgeType: json['badge_type'] as String? ?? 'ok',
      );
}

class ActiveTrip {
  final String id;
  final String status;
  final String fromCode;
  final String toCode;
  final String fromLabel;
  final String toLabel;
  final String? aircraftModel;
  final String? tailNumber;
  final String departureTime; // ISO 8601
  final int durationMin;
  final String badgeLabel;

  const ActiveTrip({
    required this.id,
    required this.status,
    required this.fromCode,
    required this.toCode,
    required this.fromLabel,
    required this.toLabel,
    this.aircraftModel,
    this.tailNumber,
    required this.departureTime,
    required this.durationMin,
    required this.badgeLabel,
  });

  factory ActiveTrip.fromJson(Map<String, dynamic> json) => ActiveTrip(
        id: json['id'] as String,
        status: json['status'] as String,
        fromCode: json['from_code'] as String,
        toCode: json['to_code'] as String,
        fromLabel: json['from_label'] as String,
        toLabel: json['to_label'] as String,
        aircraftModel: json['aircraft_model'] as String?,
        tailNumber: json['tail_number'] as String?,
        departureTime: json['departure_time'] as String,
        durationMin: json['duration_min'] as int,
        badgeLabel: json['badge_label'] as String? ?? 'Confirmed',
      );
}

class ServiceType {
  final String id;
  final String name;
  final String icon;
  final int basePrice;
  final String currency;
  final String description;

  const ServiceType({
    required this.id,
    required this.name,
    required this.icon,
    required this.basePrice,
    required this.currency,
    required this.description,
  });

  factory ServiceType.fromJson(Map<String, dynamic> json) => ServiceType(
        id: json['id'] as String,
        name: json['name'] as String,
        icon: json['icon'] as String? ?? 'plane',
        basePrice: json['base_price'] as int? ?? 0,
        currency: json['currency'] as String? ?? 'INR',
        description: json['description'] as String? ?? '',
      );
}

class Promotion {
  final String id;
  final String code;
  final String label;
  final String description;
  final String? expiresAt; // ISO 8601 or null for "Ongoing"
  final String type; // 'percent' | 'flat' | 'referral'

  const Promotion({
    required this.id,
    required this.code,
    required this.label,
    required this.description,
    this.expiresAt,
    required this.type,
  });

  factory Promotion.fromJson(Map<String, dynamic> json) => Promotion(
        id: json['id'] as String,
        code: json['code'] as String,
        label: json['label'] as String,
        description: json['description'] as String? ?? '',
        expiresAt: json['expires_at'] as String?,
        type: json['type'] as String? ?? 'flat',
      );
}

class AppNotification {
  final String id;
  final String type; // 'ok' | 'info' | 'warn' | 'danger'
  final String title;
  final String body;
  final bool isRead;
  final String createdAt; // ISO 8601

  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] as String,
        type: json['type'] as String? ?? 'info',
        title: json['title'] as String,
        body: json['body'] as String,
        isRead: json['is_read'] as bool? ?? false,
        createdAt: json['created_at'] as String,
      );

  AppNotification copyWith({bool? isRead}) => AppNotification(
        id: id,
        type: type,
        title: title,
        body: body,
        isRead: isRead ?? this.isRead,
        createdAt: createdAt,
      );
}
