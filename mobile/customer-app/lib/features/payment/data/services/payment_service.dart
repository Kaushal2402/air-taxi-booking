// PaymentService — all API calls for the payment & checkout flow.
//
// Every method is a PENDING stub that throws UnimplementedError until the
// backend endpoints listed in BACKEND_CHANGE_REQUEST.md are implemented.
// Providers catch UnimplementedError and return empty/null defaults so the
// app remains runnable (consistent with booking_service.dart pattern).
//
// Auth: all endpoints require a Bearer JWT (customer token).
// Idempotency: initiatePayment sends an Idempotency-Key header.

import 'package:utbp_api_client/utbp_api_client.dart';

import '../models/payment_models.dart';

class PaymentService {
  final UtbpApiClient _client;

  PaymentService({required UtbpApiClient client}) : _client = client;

  // ── Payment methods ───────────────────────────────────────────────────────

  /// GET /api/v1/app/payment-methods
  ///
  /// Returns the customer's saved payment instruments (cards, UPI IDs, wallets).
  /// Auth: required (customer JWT).
  Future<List<CustomerPaymentMethod>> getPaymentMethods() {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/payment-methods is not yet implemented.',
    );
    // Implementation when ready:
    // final response = await _client.get('/api/v1/app/payment-methods');
    // return (response.data as List)
    //     .map((e) => CustomerPaymentMethod.fromJson(e as Map<String, dynamic>))
    //     .toList();
  }

  /// POST /api/v1/app/payment-methods/card
  ///
  /// Saves a tokenized card from Razorpay. The client never sees raw PAN —
  /// Razorpay tokenizes first, then sends the token here.
  ///
  /// Body: { razorpay_token: str, save_card: bool }
  /// Returns: the newly created CustomerPaymentMethod.
  /// Auth: required (customer JWT).
  Future<CustomerPaymentMethod> addCard({
    required String razorpayToken,
    required bool saveCard,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/payment-methods/card is not yet implemented.',
    );
    // Implementation when ready:
    // final response = await _client.post(
    //   '/api/v1/app/payment-methods/card',
    //   data: {'razorpay_token': razorpayToken, 'save_card': saveCard},
    // );
    // return CustomerPaymentMethod.fromJson(response.data as Map<String, dynamic>);
  }

  /// DELETE /api/v1/app/payment-methods/{id}
  ///
  /// Removes a saved payment method.
  /// Returns: 204 No Content on success.
  /// Auth: required (customer JWT).
  Future<void> deletePaymentMethod(String id) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'DELETE /api/v1/app/payment-methods/$id is not yet implemented.',
    );
    // Implementation when ready:
    // await _client.delete('/api/v1/app/payment-methods/$id');
  }

  // ── Payment initiation ────────────────────────────────────────────────────

  /// POST /api/v1/app/payments/initiate
  ///
  /// Creates a Razorpay order server-side and returns the order details the
  /// client passes to the Razorpay SDK checkout. Also creates a pre-booking
  /// record with status=pending_payment.
  ///
  /// Body:
  ///   estimate_ref (str)         — pricing lock token from Module 03
  ///   payment_method_id (str?)   — null for new card/UPI (handled by SDK)
  ///   booking_summary (object)   — route_id, flight_id, seat_codes, pax_count, fare_class
  ///
  /// Returns: RazorpayOrder { order_id, amount_minor, currency, booking_ref }
  ///
  /// Idempotency-Key header MUST be sent to prevent double-charge on retry.
  /// Auth: required (customer JWT).
  Future<RazorpayOrder> initiatePayment({
    required String estimateRef,
    required String idempotencyKey,
    String? paymentMethodId,
    required Map<String, dynamic> bookingSummary,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/payments/initiate is not yet implemented.',
    );
    // Implementation when ready:
    // final response = await _client.post(
    //   '/api/v1/app/payments/initiate',
    //   data: {
    //     'estimate_ref': estimateRef,
    //     if (paymentMethodId != null) 'payment_method_id': paymentMethodId,
    //     'booking_summary': bookingSummary,
    //   },
    //   options: Options(headers: {'Idempotency-Key': idempotencyKey}),
    // );
    // return RazorpayOrder.fromJson(response.data as Map<String, dynamic>);
  }

  /// POST /api/v1/app/payments/confirm
  ///
  /// Called immediately after the Razorpay SDK succeeds on the client.
  /// The server MUST re-verify the signature (HMAC-SHA256) before trusting
  /// the payment. On success, creates AirBooking with status=confirmed and
  /// sends confirmation email/push.
  ///
  /// Body:
  ///   razorpay_payment_id (str)   — from Razorpay SDK success callback
  ///   razorpay_order_id (str)     — from RazorpayOrder
  ///   razorpay_signature (str)    — from Razorpay SDK success callback
  ///   booking_ref (str)           — from RazorpayOrder.bookingRef
  ///
  /// Returns: BookingConfirmation (full booking record)
  /// Auth: required (customer JWT).
  Future<BookingConfirmation> confirmPayment({
    required String razorpayPaymentId,
    required String razorpayOrderId,
    required String razorpaySignature,
    required String bookingRef,
  }) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'POST /api/v1/app/payments/confirm is not yet implemented.',
    );
    // Implementation when ready:
    // final response = await _client.post(
    //   '/api/v1/app/payments/confirm',
    //   data: {
    //     'razorpay_payment_id': razorpayPaymentId,
    //     'razorpay_order_id': razorpayOrderId,
    //     'razorpay_signature': razorpaySignature,
    //     'booking_ref': bookingRef,
    //   },
    // );
    // return BookingConfirmation.fromJson(response.data as Map<String, dynamic>);
  }

  // ── UPI verification ──────────────────────────────────────────────────────

  /// GET /api/v1/app/payments/verify-upi?vpa={vpa}
  ///
  /// Verifies a UPI Virtual Payment Address (VPA) and returns the account
  /// holder name and bank. Used for instant UPI ID validation in screen 4.3.
  ///
  /// Auth: required (customer JWT).
  Future<UpiVerificationResult> verifyUpiVpa(String vpa) {
    // PENDING backend endpoint
    throw UnimplementedError(
      'GET /api/v1/app/payments/verify-upi is not yet implemented.',
    );
    // Implementation when ready:
    // final response = await _client.get(
    //   '/api/v1/app/payments/verify-upi',
    //   queryParameters: {'vpa': vpa},
    // );
    // return UpiVerificationResult.fromJson(response.data as Map<String, dynamic>);
  }
}
