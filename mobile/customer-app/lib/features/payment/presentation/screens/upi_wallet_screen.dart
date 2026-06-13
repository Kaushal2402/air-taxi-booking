// 4.3 — UPI & Wallets Screen
//
// Allows the customer to:
//   - Enter a UPI ID with instant VPA verification (debounced 800ms)
//   - Tap a quick-launch UPI app button (PhonePe / GPay / Paytm / BHIM)
//   - Select a linked wallet (Paytm Wallet / Amazon Pay)
//   - Confirm with "Pay via UPI" CTA
//
// Navigation parent: PaymentMethodsScreen (4.1)
// Navigation forward: ProcessingScreen (4.4)
//
// UPI verification is debounced using a Future.delayed approach; the result
// is stored in upiVerificationProvider. The Pay CTA is enabled only when a
// valid VPA is entered or a wallet is selected.

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../domain/providers/payment_providers.dart';
import '../widgets/payment_widgets.dart';
import '../../../booking/presentation/widgets/booking_widgets.dart';

class UpiWalletScreen extends ConsumerStatefulWidget {
  const UpiWalletScreen({
    super.key,
    required this.fareAmountMinor,
    required this.estimateRef,
    this.preferredApp,
  });

  final int fareAmountMinor;
  final String estimateRef;

  /// If the user tapped a specific app button on 4.1, pre-select it.
  final String? preferredApp;

  @override
  ConsumerState<UpiWalletScreen> createState() => _UpiWalletScreenState();
}

class _UpiWalletScreenState extends ConsumerState<UpiWalletScreen> {
  final _upiCtrl = TextEditingController();
  Timer? _debounceTimer;

  String? _selectedWalletName;
  bool _isSubmitting = false;

  static const _upiApps = [
    (name: 'PhonePe', letter: 'Pe', colorValue: 0xFF5F259F),
    (name: 'GPay',    letter: 'G',  colorValue: 0xFF4285F4),
    (name: 'Paytm',   letter: 'P',  colorValue: 0xFF002970),
    (name: 'BHIM',    letter: 'B',  colorValue: 0xFF1A6B3A),
  ];

  static const _wallets = [
    (name: 'Paytm Wallet', colorValue: 0xFF002970),
    (name: 'Amazon Pay',   colorValue: 0xFFFF9900),
  ];

  bool get _canPay {
    final vpaAsync = ref.read(upiVerificationProvider);
    final vpaValid = vpaAsync.valueOrNull?.isValid == true;
    return vpaValid || _selectedWalletName != null;
  }

  void _onUpiChanged(String value) {
    _debounceTimer?.cancel();
    ref.read(upiVerificationProvider.notifier).clear();
    if (value.contains('@') && value.length > 4) {
      _debounceTimer = Timer(const Duration(milliseconds: 800), () {
        ref.read(upiVerificationProvider.notifier).verify(value.trim());
      });
    }
  }

  Future<void> _onPayViaTap() async {
    if (!_canPay || _isSubmitting) return;
    setState(() => _isSubmitting = true);

    // Determine the effective UPI method or wallet
    final vpaValue = _upiCtrl.text.trim();
    if (!mounted) return;

    try {
      // Navigate to ProcessingScreen — payment initiation happens there
      context.push(AppRoutes.paymentProcessing, extra: {
        'fareAmountMinor': widget.fareAmountMinor,
        'estimateRef': widget.estimateRef,
        'paymentMethodId': null,          // UPI/wallet flow via Razorpay SDK
        'upiVpa': vpaValue.isNotEmpty ? vpaValue : null,
        'walletName': _selectedWalletName,
      });
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _upiCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final vpaAsync = ref.watch(upiVerificationProvider);

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: SafeArea(
          child: Column(
          children: [
            // NavBar
            SizedBox(
              height: 52,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: Icon(Icons.arrow_back_ios_new_rounded,
                        color: cs.onSurface, size: 22),
                  ),
                  Expanded(
                    child: Text(
                      'UPI & Wallets',
                      textAlign: TextAlign.center,
                      style: tt.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        fontSize: 17,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ),
                  const SizedBox(width: 52),
                ],
              ),
            ),

            // Flow step indicator (step 2 = Payment)
            const BookingFlowStep(currentStep: 2),

            Expanded(
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding:
                    const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                children: [
                  // ── UPI ID section ────────────────────────────────────
                  _SectionLabel(
                      label: 'UPI ID', cs: cs, tt: tt),
                  Container(
                    height: 56,
                    decoration: BoxDecoration(
                      color: vpaAsync.valueOrNull?.isValid == true
                          ? cs.primary.withOpacity(0.06)
                          : cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: vpaAsync.valueOrNull?.isValid == true
                            ? cs.primary
                            : cs.onSurface.withOpacity(0.20),
                        width: vpaAsync.valueOrNull?.isValid == true ? 2 : 1.5,
                      ),
                    ),
                    child: TextField(
                      controller: _upiCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        hintText: 'yourname@okaxis',
                        border: InputBorder.none,
                        contentPadding:
                            const EdgeInsetsDirectional.fromSTEB(16, 0, 16, 0),
                        suffixIcon: vpaAsync.isLoading
                            ? const Padding(
                                padding: EdgeInsetsDirectional.all(14),
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                              )
                            : null,
                      ),
                      style: tt.bodyLarge?.copyWith(
                        fontFamily: 'IBMPlexMono',
                        fontSize: 15,
                      ),
                      onChanged: _onUpiChanged,
                    ),
                  ),

                  // Verification result
                  if (vpaAsync.valueOrNull != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          vpaAsync.valueOrNull!.isValid
                              ? Icons.check_circle_rounded
                              : Icons.error_outline_rounded,
                          size: 14,
                          color: vpaAsync.valueOrNull!.isValid
                              ? cs.secondary
                              : cs.error,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          vpaAsync.valueOrNull!.isValid
                              ? vpaAsync.valueOrNull!.displayLabel
                              : 'Invalid UPI ID — please check',
                          style: tt.bodySmall?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: vpaAsync.valueOrNull!.isValid
                                ? cs.secondary
                                : cs.error,
                          ),
                        ),
                      ],
                    ),
                  ] else if (vpaAsync.hasError) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Could not verify — please try again',
                      style: tt.bodySmall?.copyWith(color: cs.error),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // ── Quick UPI app buttons ─────────────────────────────
                  Container(
                    padding:
                        const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
                    decoration: BoxDecoration(
                      color: cs.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: cs.outline),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pay with app',
                          style: tt.titleSmall?.copyWith(fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment:
                              MainAxisAlignment.spaceBetween,
                          children: _upiApps.map((app) {
                            return Expanded(
                              child: UpiAppButton(
                                name: app.name,
                                letter: app.letter,
                                color: Color(app.colorValue),
                                size: 52,
                                onTap: () {
                                  // Opening the UPI app via Razorpay SDK
                                  // is handled in ProcessingScreen.
                                  // Here we just navigate with the app preference.
                                  context.push(
                                    AppRoutes.paymentProcessing,
                                    extra: {
                                      'fareAmountMinor':
                                          widget.fareAmountMinor,
                                      'estimateRef': widget.estimateRef,
                                      'paymentMethodId': null,
                                      'preferredUpiApp': app.name,
                                    },
                                  );
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // ── Wallets section ───────────────────────────────────
                  _SectionLabel(label: 'Wallets', cs: cs, tt: tt),
                  ..._wallets.map((w) {
                    final isSelected = _selectedWalletName == w.name;
                    return Padding(
                      padding:
                          const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 8),
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _selectedWalletName =
                              isSelected ? null : w.name;
                        }),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsetsDirectional.fromSTEB(
                              16, 13, 16, 13),
                          decoration: BoxDecoration(
                            color: cs.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSelected
                                  ? cs.primary
                                  : cs.outline,
                              width: isSelected ? 2 : 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: Color(w.colorValue),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(
                                  Icons.account_balance_wallet_rounded,
                                  size: 20,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      w.name,
                                      style: tt.bodyMedium?.copyWith(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      'Tap to link & pay',
                                      style: tt.bodySmall?.copyWith(
                                        color: cs.onSurface.withOpacity(0.45),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              // Radio
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSelected
                                        ? cs.primary
                                        : cs.outline,
                                    width: 2,
                                  ),
                                  color: isSelected
                                      ? cs.primary
                                      : Colors.transparent,
                                ),
                                child: isSelected
                                    ? Center(
                                        child: Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: Colors.white,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 24),

                  // ── Total + Pay CTA ───────────────────────────────────
                  PaymentTotalBar(
                    totalMinor: widget.fareAmountMinor,
                    ctaLabel: 'Pay via UPI',
                    onPay: _canPay ? _onPayViaTap : null,
                    isLoading: _isSubmitting,
                  ),

                  const SizedBox(height: 36),
                ],
              ),
            ),
          ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({
    required this.label,
    required this.cs,
    required this.tt,
  });
  final String label;
  final ColorScheme cs;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 10),
      child: Text(
        label.toUpperCase(),
        style: tt.labelSmall?.copyWith(
          color: cs.onSurface.withOpacity(0.45),
          letterSpacing: 0.12,
        ),
      ),
    );
  }
}
