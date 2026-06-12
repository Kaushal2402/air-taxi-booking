// Booking module DTOs — plain Dart classes matching the backend /api/v1/app/
// endpoint shapes defined in the BACKEND_CHANGE_REQUEST.
// No build_runner dependency; json deserialization is hand-written.

/// An air route as returned by GET /api/v1/app/air/routes.
class AirRoute {
  final String id;
  final String code;
  final String originName;
  final String originCode;
  final String destinationName;
  final String destinationCode;
  final String category; // shuttle | on_demand | charter | vip
  final double distanceNm;
  final int blockTimeMinutes;
  final List<String>? eligibleTypeCodes;
  final bool isActive;

  const AirRoute({
    required this.id,
    required this.code,
    required this.originName,
    required this.originCode,
    required this.destinationName,
    required this.destinationCode,
    required this.category,
    required this.distanceNm,
    required this.blockTimeMinutes,
    this.eligibleTypeCodes,
    this.isActive = true,
  });

  factory AirRoute.fromJson(Map<String, dynamic> json) => AirRoute(
        id: json['id'] as String,
        code: json['code'] as String,
        originName: json['origin_name'] as String,
        originCode: json['origin_code'] as String,
        destinationName: json['destination_name'] as String,
        destinationCode: json['destination_code'] as String,
        category: json['category'] as String,
        distanceNm: (json['distance_nm'] as num).toDouble(),
        blockTimeMinutes: json['block_time_minutes'] as int,
        eligibleTypeCodes: (json['eligible_type_codes'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList(),
        isActive: json['is_active'] as bool? ?? true,
      );
}

/// A scheduled flight slot as returned by GET /api/v1/app/air/flights.
class AirFlight {
  final String id;
  final String routeId;
  final String departureTime; // ISO 8601 UTC
  final String arrivalTime;   // ISO 8601 UTC
  final int seatsAvailable;
  final int seatCapacity;
  final String? aircraftModel;
  final String? tailNumber;
  final int fareMinor; // base fare per seat in minor units (paise)

  const AirFlight({
    required this.id,
    required this.routeId,
    required this.departureTime,
    required this.arrivalTime,
    required this.seatsAvailable,
    required this.seatCapacity,
    this.aircraftModel,
    this.tailNumber,
    required this.fareMinor,
  });

  factory AirFlight.fromJson(Map<String, dynamic> json) => AirFlight(
        id: json['id'] as String,
        routeId: json['route_id'] as String,
        departureTime: json['departure_time'] as String,
        arrivalTime: json['arrival_time'] as String,
        seatsAvailable: json['seats_available'] as int,
        seatCapacity: json['seat_capacity'] as int,
        aircraftModel: json['aircraft_model'] as String?,
        tailNumber: json['tail_number'] as String?,
        fareMinor: json['fare_minor'] as int? ?? 0,
      );
}

/// Seat state values.
enum SeatState { available, occupied, selected }

/// Individual seat in a flight's seat map.
class SeatInfo {
  final String seatCode; // e.g. "1A"
  final SeatState state;
  final String? position; // "window" | "aisle" | "middle"

  const SeatInfo({
    required this.seatCode,
    required this.state,
    this.position,
  });

  factory SeatInfo.fromJson(Map<String, dynamic> json) => SeatInfo(
        seatCode: json['seat_code'] as String,
        state: (json['is_occupied'] as bool? ?? false)
            ? SeatState.occupied
            : SeatState.available,
        position: json['position'] as String?,
      );

  SeatInfo copyWith({SeatState? state}) => SeatInfo(
        seatCode: seatCode,
        state: state ?? this.state,
        position: position,
      );
}

/// Passenger detail collected in screen 3.6.
class PassengerInput {
  final String fullName;
  final String? dateOfBirth; // "YYYY-MM-DD"
  final String? idType;      // "aadhar" | "passport" | "pan"
  final String? idNumber;
  final double bodyWeightKg;
  final double baggageWeightKg;
  final bool isMinor;
  final String? specialNotes;

  const PassengerInput({
    required this.fullName,
    this.dateOfBirth,
    this.idType,
    this.idNumber,
    this.bodyWeightKg = 70.0,
    this.baggageWeightKg = 0.0,
    this.isMinor = false,
    this.specialNotes,
  });

  Map<String, dynamic> toJson() => {
        'full_name': fullName,
        if (dateOfBirth != null) 'date_of_birth': dateOfBirth,
        if (idType != null) 'id_type': idType,
        if (idNumber != null) 'id_number': idNumber,
        'body_weight_kg': bodyWeightKg,
        'baggage_weight_kg': baggageWeightKg,
        'is_minor': isMinor,
        if (specialNotes != null) 'special_notes': specialNotes,
      };

  PassengerInput copyWith({
    String? fullName,
    String? dateOfBirth,
    String? idType,
    String? idNumber,
    double? bodyWeightKg,
    double? baggageWeightKg,
    bool? isMinor,
    String? specialNotes,
  }) =>
      PassengerInput(
        fullName: fullName ?? this.fullName,
        dateOfBirth: dateOfBirth ?? this.dateOfBirth,
        idType: idType ?? this.idType,
        idNumber: idNumber ?? this.idNumber,
        bodyWeightKg: bodyWeightKg ?? this.bodyWeightKg,
        baggageWeightKg: baggageWeightKg ?? this.baggageWeightKg,
        isMinor: isMinor ?? this.isMinor,
        specialNotes: specialNotes ?? this.specialNotes,
      );
}

/// A line in the fare breakdown.
class FareLineItem {
  final String label;
  final int amountMinor;

  const FareLineItem({required this.label, required this.amountMinor});

  factory FareLineItem.fromJson(Map<String, dynamic> json) => FareLineItem(
        label: json['label'] as String,
        amountMinor: json['amount_minor'] as int,
      );
}

/// Fare estimate response from POST /api/v1/app/pricing/estimate (air).
class FareEstimate {
  final String estimateRef; // token passed verbatim when creating a booking
  final int baseFareMinor;
  final int airportFeesMinor;
  final int platformFeeMinor;
  final int taxMinor;
  final int totalMinor;
  final List<FareLineItem> lineItems;
  final String? expiresAt; // ISO 8601 UTC — client re-fetches if expired

  const FareEstimate({
    required this.estimateRef,
    required this.baseFareMinor,
    required this.airportFeesMinor,
    required this.platformFeeMinor,
    required this.taxMinor,
    required this.totalMinor,
    required this.lineItems,
    this.expiresAt,
  });

  factory FareEstimate.fromJson(Map<String, dynamic> json) => FareEstimate(
        estimateRef: json['estimate_ref'] as String,
        baseFareMinor: json['base_fare_minor'] as int? ?? 0,
        airportFeesMinor: json['airport_fees_minor'] as int? ?? 0,
        platformFeeMinor: json['platform_fee_minor'] as int? ?? 0,
        taxMinor: json['tax_minor'] as int? ?? 0,
        totalMinor: json['total_minor'] as int,
        lineItems: (json['line_items'] as List<dynamic>? ?? [])
            .map((e) => FareLineItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        expiresAt: json['expires_at'] as String?,
      );
}

/// Created booking returned by POST /api/v1/app/air/bookings.
class AirBookingCreated {
  final String id;
  final String bookingRef;
  final String status;
  final String routeFrom;
  final String routeTo;
  final String etd;
  final String? eta;
  final int paxCount;
  final int fareEstimateMinor;
  final String? paymentMethod;
  final String createdAt;

  const AirBookingCreated({
    required this.id,
    required this.bookingRef,
    required this.status,
    required this.routeFrom,
    required this.routeTo,
    required this.etd,
    this.eta,
    required this.paxCount,
    required this.fareEstimateMinor,
    this.paymentMethod,
    required this.createdAt,
  });

  factory AirBookingCreated.fromJson(Map<String, dynamic> json) =>
      AirBookingCreated(
        id: json['id'] as String,
        bookingRef: json['booking_ref'] as String,
        status: json['status'] as String,
        routeFrom: json['route_from'] as String,
        routeTo: json['route_to'] as String,
        etd: json['etd'] as String,
        eta: json['eta'] as String?,
        paxCount: json['pax_count'] as int,
        fareEstimateMinor: json['fare_estimate_minor'] as int? ?? 0,
        paymentMethod: json['payment_method'] as String?,
        createdAt: json['created_at'] as String,
      );
}

/// A saved payment method from GET /api/v1/app/payment-methods.
class PaymentMethod {
  final String id;
  final String type;      // "card" | "upi" | "wallet" | "netbanking"
  final String display;   // "Visa •••• 4242"
  final String? subLabel; // "Expires 09/28"
  final bool isDefault;

  const PaymentMethod({
    required this.id,
    required this.type,
    required this.display,
    this.subLabel,
    this.isDefault = false,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) => PaymentMethod(
        id: json['id'] as String,
        type: json['type'] as String,
        display: json['display'] as String,
        subLabel: json['sub_label'] as String?,
        isDefault: json['is_default'] as bool? ?? false,
      );
}

/// Recent destination entry from GET /api/v1/app/search-history/air.
class RecentDestination {
  final String city;
  final String padName;
  final String code;

  const RecentDestination({
    required this.city,
    required this.padName,
    required this.code,
  });

  factory RecentDestination.fromJson(Map<String, dynamic> json) =>
      RecentDestination(
        city: json['city'] as String,
        padName: json['pad_name'] as String,
        code: json['code'] as String,
      );
}

/// Popular destination from GET /api/v1/app/air/destinations/popular.
class PopularDestination {
  final String city;
  final String code;
  final int routeCount;

  const PopularDestination({
    required this.city,
    required this.code,
    required this.routeCount,
  });

  factory PopularDestination.fromJson(Map<String, dynamic> json) =>
      PopularDestination(
        city: json['city'] as String,
        code: json['code'] as String,
        routeCount: json['route_count'] as int? ?? 0,
      );
}

/// Passenger fare class.
enum FareClass { standard, business, charter }

/// In-progress booking draft held in BookingFlowNotifier.
/// This accumulates across screens 3.1 → 3.7.
class BookingDraft {
  // 3.1 Destination selection
  final String? originCode;
  final String? originName;
  final String? destinationCode;
  final String? destinationName;
  final String? routeId;

  // 3.2 Date & time
  final DateTime? selectedDate;
  final String? selectedFlightId;
  final String? departureTime;
  final String? arrivalTime;

  // 3.3 Passengers
  final int adultCount;
  final int childCount;
  final int infantCount;
  final FareClass fareClass;

  // 3.4 Selected flight
  final AirFlight? selectedFlight;

  // 3.5 Seat selection
  final List<String> selectedSeats;

  // 3.6 Passenger details
  final List<PassengerInput> passengers;

  // 3.7 Booking summary
  final FareEstimate? fareEstimate;
  final String? selectedPaymentMethodId;

  const BookingDraft({
    this.originCode,
    this.originName,
    this.destinationCode,
    this.destinationName,
    this.routeId,
    this.selectedDate,
    this.selectedFlightId,
    this.departureTime,
    this.arrivalTime,
    this.adultCount = 1,
    this.childCount = 0,
    this.infantCount = 0,
    this.fareClass = FareClass.standard,
    this.selectedFlight,
    this.selectedSeats = const [],
    this.passengers = const [],
    this.fareEstimate,
    this.selectedPaymentMethodId,
  });

  int get totalPassengers => adultCount + childCount;

  BookingDraft copyWith({
    String? originCode,
    String? originName,
    String? destinationCode,
    String? destinationName,
    String? routeId,
    DateTime? selectedDate,
    String? selectedFlightId,
    String? departureTime,
    String? arrivalTime,
    int? adultCount,
    int? childCount,
    int? infantCount,
    FareClass? fareClass,
    AirFlight? selectedFlight,
    List<String>? selectedSeats,
    List<PassengerInput>? passengers,
    FareEstimate? fareEstimate,
    String? selectedPaymentMethodId,
  }) =>
      BookingDraft(
        originCode: originCode ?? this.originCode,
        originName: originName ?? this.originName,
        destinationCode: destinationCode ?? this.destinationCode,
        destinationName: destinationName ?? this.destinationName,
        routeId: routeId ?? this.routeId,
        selectedDate: selectedDate ?? this.selectedDate,
        selectedFlightId: selectedFlightId ?? this.selectedFlightId,
        departureTime: departureTime ?? this.departureTime,
        arrivalTime: arrivalTime ?? this.arrivalTime,
        adultCount: adultCount ?? this.adultCount,
        childCount: childCount ?? this.childCount,
        infantCount: infantCount ?? this.infantCount,
        fareClass: fareClass ?? this.fareClass,
        selectedFlight: selectedFlight ?? this.selectedFlight,
        selectedSeats: selectedSeats ?? this.selectedSeats,
        passengers: passengers ?? this.passengers,
        fareEstimate: fareEstimate ?? this.fareEstimate,
        selectedPaymentMethodId:
            selectedPaymentMethodId ?? this.selectedPaymentMethodId,
      );
}
