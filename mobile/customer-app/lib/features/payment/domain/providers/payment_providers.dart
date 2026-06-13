// Payment module — Riverpod providers.
//
// Providers follow the same UnimplementedError catch pattern as
// booking_providers.dart: return empty/null defaults on UnimplementedError
// so screens render gracefully until the backend is live. Any other exception
// propagates as AsyncValue.error so the retry button works.
//
// State isolation: all providers that hold customer data must reset when
// the customer logs out (called from AuthNotifier.signOut). The payment
// module registers with AuthNotifier via the paymentStateResetter ref.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/di/providers.dart';
import '../../data/models/payment_models.dart';
import '../../data/services/payment_service.dart';

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

final paymentServiceProvider = Provider<PaymentService>((ref) {
  return PaymentService(client: ref.read(utbpApiClientProvider));
});

// ---------------------------------------------------------------------------
// Payment methods (screen 4.1 — PaymentMethodsScreen)
// ---------------------------------------------------------------------------

/// Loads the customer's saved payment instruments on screen open.
/// Auth-gated: if the customer is not authenticated, returns empty list.
final customerPaymentMethodsProvider =
    AsyncNotifierProvider<CustomerPaymentMethodsNotifier,
        List<CustomerPaymentMethod>>(
  CustomerPaymentMethodsNotifier.new,
);

class CustomerPaymentMethodsNotifier
    extends AsyncNotifier<List<CustomerPaymentMethod>> {
  @override
  Future<List<CustomerPaymentMethod>> build() async {
    try {
      return await ref
          .read(paymentServiceProvider)
          .getPaymentMethods();
    } on UnimplementedError {
      // Backend not yet implemented — return empty list so UI renders.
      return const [];
    }
    // Any other exception propagates as AsyncValue.error.
  }

  /// Re-fetch after adding or deleting a method.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(paymentServiceProvider).getPaymentMethods();
      } on UnimplementedError {
        return const <CustomerPaymentMethod>[];
      }
    });
  }

  /// Optimistically removes a method and then calls the backend.
  /// On failure, restores the previous list.
  Future<void> deleteMethod(String id) async {
    final prev = state.valueOrNull ?? const [];
    // Optimistic update
    state = AsyncValue.data(prev.where((m) => m.id != id).toList());
    try {
      await ref.read(paymentServiceProvider).deletePaymentMethod(id);
    } on UnimplementedError {
      // No-op: backend stub, keep optimistic removal for UI demo.
    } catch (_) {
      // Restore on real error
      state = AsyncValue.data(prev);
      rethrow;
    }
  }

  /// Reset on logout — clears any cached payment methods for the customer.
  void reset() => state = const AsyncValue.data([]);
}

// ---------------------------------------------------------------------------
// Selected payment method (shared across screens 4.1, 4.2, 4.3)
// ---------------------------------------------------------------------------

/// Holds the currently selected payment method ID for the active transaction.
/// null means no selection yet. Consumed by PaymentMethodsScreen and
/// passed forward to ProcessingScreen.
final selectedPaymentMethodIdProvider = StateProvider<String?>((ref) => null);

// ---------------------------------------------------------------------------
// Razorpay order (triggered from PaymentMethodsScreen "Pay" CTA)
// ---------------------------------------------------------------------------

/// Holds the in-flight Razorpay order during payment initiation.
/// AsyncValue.loading → initiating with backend
/// AsyncValue.data(order) → ready to open Razorpay SDK
/// AsyncValue.error → display error + retry
final razorpayOrderProvider =
    AsyncNotifierProvider<RazorpayOrderNotifier, RazorpayOrder?>(
  RazorpayOrderNotifier.new,
);

class RazorpayOrderNotifier extends AsyncNotifier<RazorpayOrder?> {
  // One idempotency key per notifier instance (survives hot reload but
  // not a new initiation attempt — call reset() before each new attempt).
  String _idempotencyKey = const Uuid().v4();

  @override
  Future<RazorpayOrder?> build() async => null;

  /// Initiates payment with the backend.
  ///
  /// [estimateRef]       — from BookingDraft.fareEstimate.estimateRef
  /// [paymentMethodId]   — selected saved method, or null for new card/UPI
  /// [bookingSummary]    — route/seat/pax details for pre-booking creation
  Future<void> initiate({
    required String estimateRef,
    String? paymentMethodId,
    required Map<String, dynamic> bookingSummary,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(paymentServiceProvider).initiatePayment(
              estimateRef: estimateRef,
              idempotencyKey: _idempotencyKey,
              paymentMethodId: paymentMethodId,
              bookingSummary: bookingSummary,
            );
      } on UnimplementedError {
        // Backend not yet implemented — return null to stay on stub state.
        return null;
      }
    });
  }

  /// Reset before a new payment attempt. Generates a fresh idempotency key
  /// so retries on a NEW attempt are safe but retries on the SAME attempt
  /// (before reset) reuse the original key.
  void reset() {
    _idempotencyKey = const Uuid().v4();
    state = const AsyncValue.data(null);
  }
}

// ---------------------------------------------------------------------------
// Booking confirmation (set after Razorpay SDK callback + server confirm)
// ---------------------------------------------------------------------------

/// Holds the booking confirmation returned by POST /api/v1/app/payments/confirm.
/// Set in ProcessingScreen after the server verifies the Razorpay signature.
/// Read by BookingConfirmedScreen (4.5) to render the e-ticket.
final bookingConfirmationProvider =
    AsyncNotifierProvider<BookingConfirmationNotifier, BookingConfirmation?>(
  BookingConfirmationNotifier.new,
);

class BookingConfirmationNotifier
    extends AsyncNotifier<BookingConfirmation?> {
  @override
  Future<BookingConfirmation?> build() async => null;

  /// Called by ProcessingScreen after Razorpay SDK succeeds.
  /// Sends the payment details to the server for signature verification.
  Future<void> confirm({
    required String razorpayPaymentId,
    required String razorpayOrderId,
    required String razorpaySignature,
    required String bookingRef,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(paymentServiceProvider).confirmPayment(
              razorpayPaymentId: razorpayPaymentId,
              razorpayOrderId: razorpayOrderId,
              razorpaySignature: razorpaySignature,
              bookingRef: bookingRef,
            );
      } on UnimplementedError {
        // Backend not yet implemented — return null.
        return null;
      }
    });
  }

  /// Reset on logout or after navigating away from confirmed booking.
  void reset() => state = const AsyncValue.data(null);
}

// ---------------------------------------------------------------------------
// UPI VPA verification (screen 4.3 — UPIWalletScreen)
// ---------------------------------------------------------------------------

/// Debounced UPI ID verification state.
/// null = not yet verified, data = verification result, error = invalid/network
final upiVerificationProvider =
    AsyncNotifierProvider<UpiVerificationNotifier, UpiVerificationResult?>(
  UpiVerificationNotifier.new,
);

class UpiVerificationNotifier
    extends AsyncNotifier<UpiVerificationResult?> {
  @override
  Future<UpiVerificationResult?> build() async => null;

  /// Verifies a UPI VPA. Called after the user stops typing (debounced in the
  /// screen widget using a delayed Future or debounce helper).
  Future<void> verify(String vpa) async {
    if (vpa.isEmpty || !vpa.contains('@')) {
      state = const AsyncValue.data(null);
      return;
    }
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      try {
        return await ref.read(paymentServiceProvider).verifyUpiVpa(vpa);
      } on UnimplementedError {
        return null;
      }
    });
  }

  void clear() => state = const AsyncValue.data(null);
}

// ---------------------------------------------------------------------------
// Acme Miles wallet toggle (screen 4.1)
// ---------------------------------------------------------------------------

/// Whether the customer has toggled "Apply Acme Miles" at checkout.
/// The actual wallet balance and discount are server-computed; this flag
/// is sent as a parameter in the payment initiation request.
final acmeMilesAppliedProvider = StateProvider<bool>((ref) => false);
