// Payment module DTOs — plain Dart classes matching the expected
// /api/v1/app/ endpoint shapes documented in BACKEND_CHANGE_REQUEST.md.
// No build_runner dependency; json deserialization is hand-written,
// consistent with the Module 03 booking_models.dart convention.

// ---------------------------------------------------------------------------
// CustomerPaymentMethod
// Returned by: GET /api/v1/app/payment-methods
// ---------------------------------------------------------------------------

/// A saved payment instrument for the authenticated customer.
/// The backend stores only gateway tokens — no raw card data ever leaves
/// the Razorpay vault.
class CustomerPaymentMethod {
  final String id;

  /// "card" | "upi" | "wallet" | "netbanking"
  final String type;

  /// Human-readable label, e.g. "Visa •••• 4242"
  final String display;

  /// Secondary line, e.g. "Expires 09/28" or "priya@okaxis"
  final String? subLabel;

  final bool isDefault;

  const CustomerPaymentMethod({
    required this.id,
    required this.type,
    required this.display,
    this.subLabel,
    this.isDefault = false,
  });

  factory CustomerPaymentMethod.fromJson(Map<String, dynamic> json) =>
      CustomerPaymentMethod(
        id: json['id'] as String,
        type: json['type'] as String,
        display: json['display'] as String,
        subLabel: json['sub_label'] as String?,
        isDefault: json['is_default'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'display': display,
        if (subLabel != null) 'sub_label': subLabel,
        'is_default': isDefault,
      };
}

// ---------------------------------------------------------------------------
// RazorpayOrder
// Returned by: POST /api/v1/app/payments/initiate
// ---------------------------------------------------------------------------

/// The server-side Razorpay order that the client passes to the Razorpay SDK.
/// The client MUST use this orderId — it must never create its own order.
class RazorpayOrder {
  /// Razorpay order identifier, format "order_XXX"
  final String orderId;

  /// Amount in minor units (paise). Authoritative — client cannot alter.
  final int amountMinor;

  /// Currency code, e.g. "INR"
  final String currency;

  /// Platform booking reference pre-assigned, e.g. "ACM-2026-04821"
  final String bookingRef;

  const RazorpayOrder({
    required this.orderId,
    required this.amountMinor,
    required this.currency,
    required this.bookingRef,
  });

  factory RazorpayOrder.fromJson(Map<String, dynamic> json) => RazorpayOrder(
        orderId: json['order_id'] as String,
        amountMinor: json['amount_minor'] as int,
        currency: json['currency'] as String? ?? 'INR',
        bookingRef: json['booking_ref'] as String,
      );
}

// ---------------------------------------------------------------------------
// BookingConfirmation
// Returned by: POST /api/v1/app/payments/confirm
// ---------------------------------------------------------------------------

/// Full booking record returned after server-side signature verification and
/// booking creation. This is what drives the BookingConfirmedScreen (4.5).
class BookingConfirmation {
  final String id;
  final String bookingRef;

  /// "confirmed" | "pending_payment" | "cancelled"
  final String status;

  final String routeFrom;
  final String routeTo;

  /// ISO 8601 UTC departure time
  final String etd;

  /// ISO 8601 UTC arrival time (nullable for on-demand)
  final String? eta;

  final int paxCount;
  final List<String> seatCodes;
  final List<String> passengerNames;

  /// Total amount charged, in paise
  final int totalAmountMinor;

  /// "card" | "upi" | "wallet" | "netbanking" | null
  final String? paymentMethod;

  /// Aircraft model string, e.g. "Bell 407"
  final String? aircraftModel;

  /// Aircraft tail number, e.g. "VT-ACM"
  final String? tailNumber;

  final String createdAt;

  const BookingConfirmation({
    required this.id,
    required this.bookingRef,
    required this.status,
    required this.routeFrom,
    required this.routeTo,
    required this.etd,
    this.eta,
    required this.paxCount,
    required this.seatCodes,
    required this.passengerNames,
    required this.totalAmountMinor,
    this.paymentMethod,
    this.aircraftModel,
    this.tailNumber,
    required this.createdAt,
  });

  factory BookingConfirmation.fromJson(Map<String, dynamic> json) =>
      BookingConfirmation(
        id: json['id'] as String,
        bookingRef: json['booking_ref'] as String,
        status: json['status'] as String,
        routeFrom: json['route_from'] as String,
        routeTo: json['route_to'] as String,
        etd: json['etd'] as String,
        eta: json['eta'] as String?,
        paxCount: json['pax_count'] as int,
        seatCodes: (json['seat_codes'] as List<dynamic>? ?? [])
            .map((e) => e as String)
            .toList(),
        passengerNames: (json['passenger_names'] as List<dynamic>? ?? [])
            .map((e) => e as String)
            .toList(),
        totalAmountMinor: json['total_amount_minor'] as int,
        paymentMethod: json['payment_method'] as String?,
        aircraftModel: json['aircraft_model'] as String?,
        tailNumber: json['tail_number'] as String?,
        createdAt: json['created_at'] as String,
      );
}

// ---------------------------------------------------------------------------
// UpiVerificationResult
// Returned by: GET /api/v1/app/payments/verify-upi?vpa=xxx
// ---------------------------------------------------------------------------

/// Result of verifying a UPI VPA (Virtual Payment Address).
class UpiVerificationResult {
  /// Whether the VPA is valid and registered
  final bool isValid;

  /// Account holder name if verified, e.g. "Priya S."
  final String? accountName;

  /// Bank name if available, e.g. "Axis Bank"
  final String? bankName;

  const UpiVerificationResult({
    required this.isValid,
    this.accountName,
    this.bankName,
  });

  factory UpiVerificationResult.fromJson(Map<String, dynamic> json) =>
      UpiVerificationResult(
        isValid: json['is_valid'] as bool,
        accountName: json['account_name'] as String?,
        bankName: json['bank_name'] as String?,
      );

  /// Human-readable display combining name and bank.
  String get displayLabel {
    if (accountName != null && bankName != null) {
      return '$accountName · $bankName';
    }
    return accountName ?? bankName ?? 'Verified';
  }
}
