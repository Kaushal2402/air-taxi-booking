// 4.4 — Processing Screen
//
// Full-screen forest-green background. Shows while:
//   1. The app calls POST /api/v1/app/payments/initiate to create a Razorpay order.
//   2. The Razorpay SDK checkout opens and processes the payment.
//   3. The app calls POST /api/v1/app/payments/confirm with the SDK callback data.
//
// The screen is non-dismissible (no back button) to prevent accidental
// interruption of the payment flow.
//
// When backend/SDK stubs are active (UnimplementedError), the screen
// auto-advances to BookingConfirmedScreen with a stub confirmation after
// a short delay so the UI flow is visible.
//
// Displayed information:
//   - Animated spinning ring with plane icon
//   - "Please wait" mono label
//   - "Securing your booking." serif headline
//   - Amount in major units
//   - Animated progress dots
//   - Security badge ("256-bit encrypted · PCI-DSS compliant")
//   - Selected payment method display at bottom

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../domain/providers/payment_providers.dart';
import '../widgets/payment_widgets.dart';

class ProcessingScreen extends ConsumerStatefulWidget {
  const ProcessingScreen({
    super.key,
    required this.fareAmountMinor,
    required this.estimateRef,
    this.paymentMethodId,
  });

  final int fareAmountMinor;
  final String estimateRef;
  final String? paymentMethodId;

  @override
  ConsumerState<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends ConsumerState<ProcessingScreen> {
  bool _initiated = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startPaymentFlow();
    });
  }

  Future<void> _startPaymentFlow() async {
    if (_initiated) return;
    _initiated = true;

    // Reset any previous order/confirmation state
    ref.read(razorpayOrderProvider.notifier).reset();
    ref.read(bookingConfirmationProvider.notifier).reset();

    // Step 1: Initiate payment — get Razorpay order from backend
    await ref.read(razorpayOrderProvider.notifier).initiate(
          estimateRef: widget.estimateRef,
          paymentMethodId: widget.paymentMethodId,
          bookingSummary: const {}, // filled by booking draft in production
        );

    final orderState = ref.read(razorpayOrderProvider);

    if (orderState.hasError || !mounted) {
      // Show error snackbar and allow retry via back navigation
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Payment initiation failed — please try again'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
        context.pop();
      }
      return;
    }

    final order = orderState.valueOrNull;

    if (order == null) {
      // Backend stub (UnimplementedError) — simulate success after delay
      await _simulateAndNavigate();
      return;
    }

    // Step 2: Open Razorpay SDK
    // TODO(backend): Replace with actual Razorpay.open({...}) call using
    // order.orderId, order.amountMinor, order.currency.
    // On SDK success callback, call _onRazorpaySuccess(paymentId, orderId, signature).
    // On SDK failure callback, call _onRazorpayFailure(response).
    //
    // For now, simulate:
    await _simulateAndNavigate(bookingRef: order.bookingRef);
  }

  Future<void> _simulateAndNavigate({String? bookingRef}) async {
    // Simulated network delay — remove once SDK is integrated
    await Future.delayed(const Duration(seconds: 3));
    if (!mounted) return;

    // Step 3: Confirm payment with backend
    await ref.read(bookingConfirmationProvider.notifier).confirm(
          razorpayPaymentId: 'pay_stub_${DateTime.now().millisecondsSinceEpoch}',
          razorpayOrderId: 'order_stub',
          razorpaySignature: 'stub_signature',
          bookingRef: bookingRef ?? 'ACM-${DateTime.now().year}-STUB',
        );

    if (!mounted) return;

    // Navigate to confirmed screen — pop all booking + payment screens
    context.go(AppRoutes.bookingConfirmed);
  }

  /// Called by Razorpay SDK success handler (wired once SDK is configured).
  // ignore: unused_element
  Future<void> _onRazorpaySuccess(
    String paymentId,
    String orderId,
    String signature,
  ) async {
    final order = ref.read(razorpayOrderProvider).valueOrNull;
    if (order == null) return;

    await ref.read(bookingConfirmationProvider.notifier).confirm(
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          razorpaySignature: signature,
          bookingRef: order.bookingRef,
        );

    if (!mounted) return;

    final confirmState = ref.read(bookingConfirmationProvider);
    if (confirmState.hasError) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
                'Payment processed but confirmation failed — contact support'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
      return;
    }

    if (mounted) context.go(AppRoutes.bookingConfirmed);
  }

  /// Called by Razorpay SDK failure handler (wired once SDK is configured).
  // ignore: unused_element
  void _onRazorpayFailure(String code, String? description) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Payment failed: ${description ?? code}'),
        backgroundColor: Theme.of(context).colorScheme.error,
      ),
    );
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    // Forest background = primary at 12% lightness
    final forestColor =
        HSLColor.fromColor(cs.primary).withLightness(0.12).toColor();
    final amountStr =
        (widget.fareAmountMinor ~/ 100).toString().replaceAllMapped(
              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
              (m) => '${m[1]},',
            );

    return PopScope(
      // Prevent back navigation during payment to avoid partial states
      canPop: false,
      child: Scaffold(
        backgroundColor: forestColor,
        body: Stack(
          children: [
            // Decorative concentric rings
            Positioned.fill(
              child: CustomPaint(painter: _RingsPainter()),
            ),

            // Content
            SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                            40, 0, 40, 0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Animated spinner
                            const ProcessingSpinner(size: 120.0),

                            const SizedBox(height: 36),

                            // "Please wait" mono label
                            Text(
                              'PLEASE WAIT',
                              style: TextStyle(
                                fontFamily: 'IBMPlexMono',
                                fontSize: 11,
                                letterSpacing: 0.18,
                                color: Colors.white.withOpacity(0.38),
                              ),
                            ),

                            const SizedBox(height: 12),

                            // "Securing your booking." serif headline
                            RichText(
                              textAlign: TextAlign.center,
                              text: TextSpan(
                                style: tt.displaySmall?.copyWith(
                                  color: cs.onPrimary,
                                  height: 1.1,
                                  letterSpacing: -0.025,
                                  fontWeight: FontWeight.w400,
                                ),
                                children: [
                                  const TextSpan(text: 'Securing your'),
                                  TextSpan(
                                    text: ' booking.',
                                    style: TextStyle(
                                      fontStyle: FontStyle.italic,
                                      fontWeight: FontWeight.w300,
                                      color: Colors.white.withOpacity(0.67),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 8),

                            // Amount
                            Text(
                              '₹$amountStr',
                              style: TextStyle(
                                fontFamily: 'IBMPlexMono',
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                                color: cs.secondary,
                                letterSpacing: -0.01,
                              ),
                            ),

                            const SizedBox(height: 32),

                            // Animated progress dots
                            ProgressDots(dotColor: cs.secondary),

                            const SizedBox(height: 60),

                            // Security note
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.lock_rounded,
                                  size: 14,
                                  color: Colors.white.withOpacity(0.3),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '256-bit encrypted · PCI-DSS compliant',
                                  style: TextStyle(
                                    fontFamily: 'IBMPlexMono',
                                    fontSize: 13,
                                    letterSpacing: 0.04,
                                    color: Colors.white.withOpacity(0.3),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Bottom — payment method display
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                        40, 0, 40, 52),
                    child: Text(
                      widget.paymentMethodId != null
                          ? 'Selected method · ${widget.paymentMethodId}'
                          : 'Razorpay checkout',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withOpacity(0.20),
                        fontFamily: 'IBMPlexMono',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Decorative concentric rings painter ───────────────────────────────────────

class _RingsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.6
      ..color = Colors.white.withOpacity(0.04);

    for (final r in [300.0, 200.0, 100.0]) {
      canvas.drawCircle(Offset(cx, cy), r, paint);
    }
  }

  @override
  bool shouldRepaint(_RingsPainter old) => false;
}
