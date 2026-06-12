# Backend Change Request — Module 03 Booking (Customer App)
**App:** Customer
**Date:** 2026-06-12
**Raised by:** flutter-senior-dev

## Summary

The booking module (screens 3.1 through 3.7) requires eight new customer-facing endpoints under /api/v1/app/.
The backend currently has zero /api/v1/app/ customer endpoints. All existing booking, pricing, and catalog
endpoints are admin-only (Depends(get_current_admin_user)). The Flutter module has been scaffolded with
BookingService stubs that throw UnimplementedError; providers catch these and show empty states until
the backend is built.

## Required Changes

### New Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/v1/app/air/routes | Public | List active air routes. Optional query: origin_code, destination_code, service |
| GET | /api/v1/app/air/flights | Public | Scheduled flights for a route+date. Required: route_id, date (YYYY-MM-DD) |
| GET | /api/v1/app/air/flights/{flight_id}/seats | Public | Seat availability layout for a flight |
| GET | /api/v1/app/air/destinations/popular | Public | Top destinations by booking count |
| GET | /api/v1/app/search-history/air | JWT required | Last 10 air destinations for the authenticated customer |
| POST | /api/v1/app/pricing/estimate | Public (JWT optional) | Fare estimate. Returns estimate_ref token with short TTL |
| POST | /api/v1/app/air/bookings | JWT required | Create booking. Requires Idempotency-Key header |
| GET | /api/v1/app/payment-methods | JWT required | Customer saved payment methods |

### New Schema File: backend/app/schemas/app_booking.py

```
AppAirRouteResponse:
  id, code, origin_name, origin_code, destination_name, destination_code,
  category (shuttle/on_demand/charter/vip), distance_nm, block_time_minutes,
  eligible_type_codes (List[str])

AppAirFlightResponse:
  id, route_id, departure_time (ISO UTC), arrival_time (ISO UTC),
  seats_available, seat_capacity, aircraft_model?, tail_number?, fare_minor (int paise)

AppSeatInfoResponse:
  seat_code (str, e.g. "1A"), is_occupied (bool), position (str: window/aisle/middle)

AppPopularDestinationResponse:
  city (str), code (str), route_count (int)

AppRecentDestinationResponse:
  city (str), pad_name (str), code (str)

AppAirEstimateRequest:
  route_id (str), flight_id? (str), date (str YYYY-MM-DD), pax_count (int),
  fare_class (str: standard/business/charter), seat_codes (List[str]), promo_code? (str)

AppFareEstimateResponse:
  estimate_ref (str UUID, short TTL), base_fare_minor (int), airport_fees_minor (int),
  platform_fee_minor (int), tax_minor (int), total_minor (int),
  line_items (List[{label: str, amount_minor: int}]), expires_at (str ISO UTC)

AppPassengerInput:
  full_name (str), date_of_birth? (str YYYY-MM-DD), id_type? (str),
  id_number? (str), body_weight_kg (float), baggage_weight_kg (float),
  is_minor (bool), special_notes? (str)

AppCreateAirBookingRequest:
  service_subtype (str: helicopter_shuttle/helicopter_on_demand/charter),
  route_id (str), flight_id? (str), etd (str ISO UTC), seat_codes (List[str]),
  passengers (List[AppPassengerInput]), estimate_ref (str), payment_method_id (str),
  promo_code? (str)

AppAirBookingCreatedResponse:
  id (str), booking_ref (str), status (str), route_from (str), route_to (str),
  etd (str ISO UTC), eta? (str ISO UTC), pax_count (int), fare_estimate_minor (int),
  payment_method? (str), created_at (str ISO UTC)

AppPaymentMethodResponse:
  id (str), type (str: card/upi/wallet/netbanking), display (str),
  sub_label? (str), is_default (bool)
```

### Model Changes

New SQLAlchemy models needed:

| File | Table | Key Columns | Reason |
|---|---|---|---|
| backend/app/models/scheduled_flight.py | scheduled_flights | id, route_id (FK), departure_time UTC, arrival_time UTC, seat_capacity, is_active | Flight inventory |
| backend/app/models/seat_hold.py | seat_holds | id, flight_id (FK), customer_id (FK), seat_codes JSON, expires_at UTC, booking_id (FK nullable) | Atomic seat reservation during checkout |
| backend/app/models/estimate_token.py | estimate_tokens | id (=estimate_ref), fare_data JSON, expires_at UTC | Short-lived pricing lock |

Also needed: a `get_current_customer` FastAPI dependency (customer JWT verification, parallel
to `get_current_admin_user`) for customer-authenticated endpoints.

### Migration Required

Yes — new tables: scheduled_flights, seat_holds, estimate_tokens, customer_search_history.

## Impact on Existing Code

- The existing admin air_bookings.py router is NOT modified. The customer endpoint is
  a separate router at /api/v1/app/air/bookings with a customer JWT dependency.
- Keep admin CreateAirBookingRequest and customer AppCreateAirBookingRequest as separate
  Pydantic schemas — they have different required fields and auth scoping.
- The existing AirRoute, AircraftType models in backend/app/models/catalog.py are reused;
  the new AppAirRouteResponse is a read-only projection of AirRoute.

## Blocking?

YES — cannot show live data on any booking screen without these endpoints.
Screens 3.1 (destination search), 3.2 (time slots), 3.4 (results), 3.7 (fare + confirm)
are entirely blocked. Screens 3.3, 3.5, 3.6 can render their UI but not submit.
