// Booking feature — Riverpod providers.
// Follows the same pattern as home_providers.dart: catch UnimplementedError
// and return empty/null defaults until the backend endpoints are available.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/models/booking_models.dart';
import '../../data/services/booking_service.dart';

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

final bookingServiceProvider = Provider<BookingService>((ref) {
  return BookingService(client: ref.read(utbpApiClientProvider));
});

// ---------------------------------------------------------------------------
// Destination Picker providers (screen 3.1)
// ---------------------------------------------------------------------------

final recentDestinationsProvider =
    AsyncNotifierProvider<RecentDestinationsNotifier, List<RecentDestination>>(
  RecentDestinationsNotifier.new,
);

class RecentDestinationsNotifier
    extends AsyncNotifier<List<RecentDestination>> {
  @override
  Future<List<RecentDestination>> build() async {
    try {
      return await ref.read(bookingServiceProvider).getRecentDestinations();
    } on UnimplementedError {
      return const [];
    }
    // Any other exception is re-thrown so Riverpod sets AsyncValue.error,
    // which enables the retry button in the UI to actually work.
  }
}

final popularDestinationsProvider =
    AsyncNotifierProvider<PopularDestinationsNotifier, List<PopularDestination>>(
  PopularDestinationsNotifier.new,
);

class PopularDestinationsNotifier
    extends AsyncNotifier<List<PopularDestination>> {
  @override
  Future<List<PopularDestination>> build() async {
    try {
      return await ref.read(bookingServiceProvider).getPopularDestinations();
    } on UnimplementedError {
      return const [];
    }
    // Any other exception is re-thrown so Riverpod sets AsyncValue.error,
    // which enables the retry button in the UI to actually work.
  }
}

// ---------------------------------------------------------------------------
// Available flights provider (screen 3.2)
// Parametric — invalidated whenever route or date changes.
// Uses a simple StateNotifier approach to avoid family record-type params.
// ---------------------------------------------------------------------------

/// Provider that holds the last fetched flight list.
/// Call [AvailableFlightsNotifier.fetch] to load flights for a route+date.
final availableFlightsProvider =
    AsyncNotifierProvider<AvailableFlightsNotifier, List<AirFlight>>(
  AvailableFlightsNotifier.new,
);

class AvailableFlightsNotifier extends AsyncNotifier<List<AirFlight>> {
  @override
  Future<List<AirFlight>> build() async => const [];

  Future<void> fetch({required String routeId, required String date}) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref
            .read(bookingServiceProvider)
            .getAvailableFlights(routeId: routeId, date: date);
      } on UnimplementedError {
        return const <AirFlight>[];
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Seat map provider (screen 3.5)
// ---------------------------------------------------------------------------

final seatMapProvider =
    AsyncNotifierProvider<SeatMapNotifier, List<SeatInfo>>(
  SeatMapNotifier.new,
);

class SeatMapNotifier extends AsyncNotifier<List<SeatInfo>> {
  @override
  Future<List<SeatInfo>> build() async => const [];

  Future<void> fetch(String flightId) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(bookingServiceProvider).getFlightSeats(flightId);
      } on UnimplementedError {
        return const <SeatInfo>[];
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Fare estimate provider (screen 3.7)
// ---------------------------------------------------------------------------

final fareEstimateProvider =
    AsyncNotifierProvider<FareEstimateNotifier, FareEstimate?>(
  FareEstimateNotifier.new,
);

class FareEstimateNotifier extends AsyncNotifier<FareEstimate?> {
  @override
  Future<FareEstimate?> build() async => null;

  Future<void> fetch({
    required String routeId,
    String? flightId,
    required String date,
    required int paxCount,
    required String fareClass,
    required List<String> seatCodes,
    String? promoCode,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(bookingServiceProvider).getFareEstimate(
              routeId: routeId,
              flightId: flightId,
              date: date,
              paxCount: paxCount,
              fareClass: fareClass,
              seatCodes: seatCodes,
              promoCode: promoCode,
            );
      } on UnimplementedError {
        return null;
      }
    });
  }

  void reset() => state = const AsyncValue.data(null);
}

// ---------------------------------------------------------------------------
// Payment methods provider (screen 3.7)
// ---------------------------------------------------------------------------

final paymentMethodsProvider =
    AsyncNotifierProvider<PaymentMethodsNotifier, List<PaymentMethod>>(
  PaymentMethodsNotifier.new,
);

class PaymentMethodsNotifier extends AsyncNotifier<List<PaymentMethod>> {
  @override
  Future<List<PaymentMethod>> build() async {
    try {
      return await ref.read(bookingServiceProvider).getPaymentMethods();
    } on UnimplementedError {
      return const [];
    }
    // Any other exception is re-thrown so Riverpod sets AsyncValue.error,
    // which enables the retry button in the UI to actually work.
  }
}

// ---------------------------------------------------------------------------
// Booking flow state — holds the in-progress draft across all 7 screens.
// ---------------------------------------------------------------------------

final bookingFlowProvider =
    NotifierProvider<BookingFlowNotifier, BookingDraft>(
  BookingFlowNotifier.new,
);

class BookingFlowNotifier extends Notifier<BookingDraft> {
  @override
  BookingDraft build() => const BookingDraft();

  // 3.1 — destination selected
  void setDestination({
    required String originCode,
    required String originName,
    required String destinationCode,
    required String destinationName,
    required String routeId,
  }) {
    state = state.copyWith(
      originCode: originCode,
      originName: originName,
      destinationCode: destinationCode,
      destinationName: destinationName,
      routeId: routeId,
    );
  }

  // 3.2 — date + time slot selected
  void setDateAndFlight({
    required DateTime date,
    required AirFlight flight,
  }) {
    state = state.copyWith(
      selectedDate: date,
      selectedFlightId: flight.id,
      selectedFlight: flight,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
    );
  }

  // 3.3 — passengers + fare class
  void setPassengerCounts({
    required int adults,
    required int children,
    required int infants,
    required FareClass fareClass,
  }) {
    state = state.copyWith(
      adultCount: adults,
      childCount: children,
      infantCount: infants,
      fareClass: fareClass,
      // Pre-size passenger list when count changes
      passengers: List.generate(
        adults + children,
        (i) => i < state.passengers.length
            ? state.passengers[i]
            : PassengerInput(fullName: ''),
      ),
    );
  }

  // 3.5 — seats selected
  void setSelectedSeats(List<String> seats) {
    state = state.copyWith(selectedSeats: seats);
  }

  // 3.6 — passenger details
  void updatePassenger(int index, PassengerInput passenger) {
    final updated = List<PassengerInput>.from(state.passengers);
    if (index < updated.length) {
      updated[index] = passenger;
    } else {
      updated.add(passenger);
    }
    state = state.copyWith(passengers: updated);
  }

  // 3.7 — fare estimate + payment method
  void setFareEstimate(FareEstimate estimate) {
    state = state.copyWith(fareEstimate: estimate);
  }

  void setPaymentMethod(String methodId) {
    state = state.copyWith(selectedPaymentMethodId: methodId);
  }

  /// Clear selected flight + fare estimate when the user picks a new destination.
  /// copyWith cannot set nullable fields to null, so we rebuild explicitly.
  void clearFlight() {
    final current = state;
    state = BookingDraft(
      originCode: current.originCode,
      originName: current.originName,
      destinationCode: current.destinationCode,
      destinationName: current.destinationName,
      routeId: current.routeId,
      selectedDate: current.selectedDate,
      adultCount: current.adultCount,
      childCount: current.childCount,
      infantCount: current.infantCount,
      fareClass: current.fareClass,
      selectedSeats: current.selectedSeats,
      passengers: current.passengers,
      selectedPaymentMethodId: current.selectedPaymentMethodId,
      // selectedFlight, selectedFlightId, departureTime, arrivalTime,
      // and fareEstimate are intentionally omitted (null).
    );
  }

  /// Clear only the fare estimate (used when pricing inputs change).
  void clearFareEstimate() {
    final current = state;
    state = BookingDraft(
      originCode: current.originCode,
      originName: current.originName,
      destinationCode: current.destinationCode,
      destinationName: current.destinationName,
      routeId: current.routeId,
      selectedDate: current.selectedDate,
      selectedFlightId: current.selectedFlightId,
      selectedFlight: current.selectedFlight,
      departureTime: current.departureTime,
      arrivalTime: current.arrivalTime,
      adultCount: current.adultCount,
      childCount: current.childCount,
      infantCount: current.infantCount,
      fareClass: current.fareClass,
      selectedSeats: current.selectedSeats,
      passengers: current.passengers,
      selectedPaymentMethodId: current.selectedPaymentMethodId,
      // fareEstimate intentionally omitted (null).
    );
  }

  /// Reset the entire booking draft on logout or booking completion.
  void reset() => state = const BookingDraft();
}

// ---------------------------------------------------------------------------
// Booking creation provider (screen 3.7 CTA)
// ---------------------------------------------------------------------------

final createBookingProvider =
    AsyncNotifierProvider<CreateBookingNotifier, AirBookingCreated?>(
  CreateBookingNotifier.new,
);

class CreateBookingNotifier extends AsyncNotifier<AirBookingCreated?> {
  @override
  Future<AirBookingCreated?> build() async => null;

  Future<AirBookingCreated?> confirm({
    required String idempotencyKey,
  }) async {
    final draft = ref.read(bookingFlowProvider);
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(bookingServiceProvider).createAirBooking(
              idempotencyKey: idempotencyKey,
              serviceSubtype: _resolveSubtype(draft),
              routeId: draft.routeId!,
              flightId: draft.selectedFlightId,
              etd: draft.departureTime!,
              seatCodes: draft.selectedSeats,
              passengers: draft.passengers,
              estimateRef: draft.fareEstimate!.estimateRef,
              paymentMethodId: draft.selectedPaymentMethodId!,
            );
      } on UnimplementedError {
        return null;
      }
    });
    return state.valueOrNull;
  }

  void reset() => state = const AsyncValue.data(null);

  String _resolveSubtype(BookingDraft draft) {
    switch (draft.fareClass) {
      case FareClass.charter:
        return 'charter';
      case FareClass.business:
        return 'helicopter_on_demand';
      case FareClass.standard:
        return 'helicopter_shuttle';
    }
  }
}
