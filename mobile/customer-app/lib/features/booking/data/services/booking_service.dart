// BookingService — all API calls for the booking flow.
// Every method is a PENDING stub awaiting the /api/v1/app/ endpoints listed
// in BACKEND_CHANGE_REQUEST.md.  Methods throw UnimplementedError so
// providers can catch them and show appropriate empty/error states.

import 'package:utbp_api_client/utbp_api_client.dart';

import '../models/booking_models.dart';

class BookingService {
  final UtbpApiClient _client;

  BookingService({required UtbpApiClient client}) : _client = client;

  // ── 3.1 Destination Picker ────────────────────────────────────────────────

  /// GET /api/v1/app/search-history/air
  /// Returns the customer's recent air destinations (last 10).
  /// Auth: required.
  Future<List<RecentDestination>> getRecentDestinations() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/search-history/air is not yet implemented.',
    );
  }

  /// GET /api/v1/app/air/destinations/popular
  /// Returns the most-booked destinations for the current deployment.
  /// Auth: public (no token required).
  Future<List<PopularDestination>> getPopularDestinations() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/air/destinations/popular is not yet implemented.',
    );
  }

  // ── 3.2 Date & Time (uses route data from catalog) ────────────────────────

  /// GET /api/v1/app/air/routes
  /// Query params:
  ///   origin_code (optional) — filter by origin
  ///   destination_code (optional) — filter by destination
  ///   service (optional) — shuttle | on_demand | charter | vip
  /// Returns: List<AirRoute>
  /// Auth: public.
  Future<List<AirRoute>> getAirRoutes({
    String? originCode,
    String? destinationCode,
    String? service,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/air/routes is not yet implemented.',
    );
  }

  /// GET /api/v1/app/air/flights
  /// Query params: route_id (required), date (YYYY-MM-DD, required)
  /// Returns: List<AirFlight> — available flights for the route+date.
  /// Auth: public.
  Future<List<AirFlight>> getAvailableFlights({
    required String routeId,
    required String date,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/air/flights is not yet implemented.',
    );
  }

  // ── 3.5 Seat Map ─────────────────────────────────────────────────────────

  /// GET /api/v1/app/air/flights/{flightId}/seats
  /// Returns the seat layout for a specific flight with availability state.
  /// Auth: public.
  Future<List<SeatInfo>> getFlightSeats(String flightId) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/air/flights/{flightId}/seats is not yet implemented.',
    );
  }

  // ── Fare Estimate ─────────────────────────────────────────────────────────

  /// POST /api/v1/app/pricing/estimate
  /// Body: {
  ///   service: "helicopter_shuttle" | "helicopter_on_demand",
  ///   route_id, flight_id?, date, pax_count,
  ///   fare_class: "standard" | "business" | "charter",
  ///   seat_codes: ["1A", "2A"],
  ///   promo_code?
  /// }
  /// Returns: FareEstimate — includes estimate_ref token.
  /// Auth: public; customer JWT gives loyalty discount if present.
  Future<FareEstimate> getFareEstimate({
    required String routeId,
    String? flightId,
    required String date,
    required int paxCount,
    required String fareClass,
    required List<String> seatCodes,
    String? promoCode,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/pricing/estimate is not yet implemented.',
    );
  }

  // ── 3.7 Booking Create ────────────────────────────────────────────────────

  /// POST /api/v1/app/air/bookings
  /// Headers: Idempotency-Key (UUID generated client-side)
  /// Body: {
  ///   service_subtype: "helicopter_shuttle" | "helicopter_on_demand",
  ///   route_id, flight_id?, seat_codes,
  ///   etd (ISO 8601), passengers: [...],
  ///   estimate_ref, payment_method_id, promo_code?
  /// }
  /// Returns: AirBookingCreated
  /// Auth: required.
  Future<AirBookingCreated> createAirBooking({
    required String idempotencyKey,
    required String serviceSubtype,
    required String routeId,
    String? flightId,
    required String etd,
    required List<String> seatCodes,
    required List<PassengerInput> passengers,
    required String estimateRef,
    required String paymentMethodId,
    String? promoCode,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/air/bookings is not yet implemented.',
    );
  }

  // ── Payment methods (for 3.7 selector) ───────────────────────────────────

  /// GET /api/v1/app/payment-methods
  /// Returns the customer's saved payment methods.
  /// Auth: required.
  Future<List<PaymentMethod>> getPaymentMethods() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/payment-methods is not yet implemented.',
    );
  }
}
