// 4.1 — Payment Methods Screen
//
// Entry point of the payment flow from BookingSummaryScreen (3.7).
// Shows saved cards (radio-selectable), "Add new card" dashed button,
// UPI apps grid, UPI ID shortcut, Acme Miles toggle, total + Pay CTA.
//
// Navigation:
//   Receives fareAmount (int paise) and estimateRef (String) via GoRouter
//   extra — both required to initiate payment.
//
//   → AddCardScreen (4.2)         — push, waits for result
//   → UPIWalletScreen (4.3)       — push, waits for result
//   → ProcessingScreen (4.4)      — push on Pay tap
//
// State is isolated in payment_providers.dart.
// No business logic here — all decisions delegated to providers.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../domain/providers/payment_providers.dart';
import '../widgets/payment_widgets.dart';
import '../../../booking/presentation/widgets/booking_widgets.dart';

class PaymentMethodsScreen extends ConsumerStatefulWidget {
  const PaymentMethodsScreen({
    super.key,
    required this.fareAmountMinor,
    required this.estimateRef,
  });

  final int fareAmountMinor;
  final String estimateRef;

  @override
  ConsumerState<PaymentMethodsScreen> createState() =>
      _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState
    extends ConsumerState<PaymentMethodsScreen> {

  static const _upiApps = [
    (name: 'PhonePe', letter: 'Pe', colorValue: 0xFF5F259F),
    (name: 'GPay',    letter: 'G',  colorValue: 0xFF4285F4),
    (name: 'Paytm',   letter: 'P',  colorValue: 0xFF002970),
    (name: 'BHIM',    letter: 'B',  colorValue: 0xFF1A6B3A),
  ];

  @override
  void initState() {
    super.initState();
    // Fetch payment methods when screen opens if not already loaded.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(customerPaymentMethodsProvider);
      if (!state.isLoading && state.valueOrNull?.isEmpty == true) {
        ref.read(customerPaymentMethodsProvider.notifier).refresh();
      }
    });
  }

  Future<void> _onPayTap() async {
    final selectedId = ref.read(selectedPaymentMethodIdProvider);
    final methods = ref.read(customerPaymentMethodsProvider).valueOrNull ?? [];

    // Auto-select the default method if nothing is selected
    final effectiveId = selectedId ??
        (methods.isNotEmpty
            ? (methods.firstWhere((m) => m.isDefault,
                orElse: () => methods.first)).id
            : null);

    if (effectiveId == null && methods.isEmpty) {
      // No payment method — navigate to add card
      if (mounted) {
        context.push(AppRoutes.paymentAddCard, extra: {
          'fareAmountMinor': widget.fareAmountMinor,
          'estimateRef': widget.estimateRef,
        });
      }
      return;
    }

    if (!mounted) return;

    // Navigate to ProcessingScreen passing all needed params
    context.push(AppRoutes.paymentProcessing, extra: {
      'fareAmountMinor': widget.fareAmountMinor,
      'estimateRef': widget.estimateRef,
      'paymentMethodId': effectiveId,
    });
  }

  void _onUpiAppTap(String appName) {
    context.push(AppRoutes.paymentUpi, extra: {
      'fareAmountMinor': widget.fareAmountMinor,
      'estimateRef': widget.estimateRef,
      'preferredApp': appName,
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final methodsAsync = ref.watch(customerPaymentMethodsProvider);
    final selectedId = ref.watch(selectedPaymentMethodIdProvider);
    final milesApplied = ref.watch(acmeMilesAppliedProvider);

    final methods = methodsAsync.valueOrNull ?? [];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // NavBar
            _NavBar(title: 'Payment'),

            // Flow step indicator (step 2 = Payment)
            const BookingFlowStep(currentStep: 2),

            // Scrollable body
            Expanded(
              child: methodsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: _ErrorState(
                    message: 'Could not load payment methods',
                    onRetry: () => ref
                        .read(customerPaymentMethodsProvider.notifier)
                        .refresh(),
                  ),
                ),
                data: (_) => ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                  children: [
                    // ── Saved cards ───────────────────────────────────────
                    _SectionLabel(label: 'Saved cards', cs: cs, tt: tt),

                    if (methods.isEmpty)
                      Padding(
                        padding:
                            const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 8),
                        child: Text(
                          'No saved cards yet.',
                          style: tt.bodySmall?.copyWith(
                            color: cs.onSurface.withOpacity(0.45),
                          ),
                        ),
                      )
                    else
                      ...methods
                          .where((m) => m.type == 'card')
                          .map((m) => Padding(
                                padding: const EdgeInsetsDirectional.fromSTEB(
                                    0, 0, 0, 8),
                                child: PaymentMethodTile(
                                  method: m,
                                  isSelected: selectedId == m.id ||
                                      (selectedId == null && m.isDefault),
                                  onTap: () => ref
                                      .read(
                                          selectedPaymentMethodIdProvider
                                              .notifier)
                                      .state = m.id,
                                ),
                              )),

                    // Add new card button
                    AddPaymentMethodButton(
                      label: 'Add new card',
                      onTap: () => context.push(
                        AppRoutes.paymentAddCard,
                        extra: {
                          'fareAmountMinor': widget.fareAmountMinor,
                          'estimateRef': widget.estimateRef,
                        },
                      ),
                    ),

                    const SizedBox(height: 16),

                    // ── Divider ───────────────────────────────────────────
                    Row(
                      children: [
                        Expanded(child: Divider(color: cs.outline)),
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                              12, 0, 12, 0),
                          child: Text(
                            'or pay with',
                            style: tt.bodySmall?.copyWith(
                              color: cs.onSurface.withOpacity(0.5),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Expanded(child: Divider(color: cs.outline)),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // ── UPI section ───────────────────────────────────────
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
                            'UPI',
                            style: tt.titleSmall?.copyWith(
                              fontSize: 13.5,
                              letterSpacing: -0.01,
                            ),
                          ),
                          const SizedBox(height: 12),
                          // UPI app buttons
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: _upiApps.map((app) {
                              return Expanded(
                                child: UpiAppButton(
                                  name: app.name,
                                  letter: app.letter,
                                  color: Color(app.colorValue),
                                  size: 48,
                                  onTap: () => _onUpiAppTap(app.name),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 12),
                          // UPI ID entry shortcut
                          GestureDetector(
                            onTap: () => context.push(
                              AppRoutes.paymentUpi,
                              extra: {
                                'fareAmountMinor': widget.fareAmountMinor,
                                'estimateRef': widget.estimateRef,
                              },
                            ),
                            child: Container(
                              height: 44,
                              decoration: BoxDecoration(
                                color: cs.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(100),
                                border: Border.all(
                                  color: cs.onSurface.withOpacity(0.20),
                                  width: 1.5,
                                ),
                              ),
                              child: Padding(
                                padding: const EdgeInsetsDirectional.fromSTEB(
                                    14, 0, 14, 0),
                                child: Row(
                                  children: [
                                    Text(
                                      'Enter UPI ID',
                                      style: tt.bodyMedium?.copyWith(
                                        color: cs.onSurface.withOpacity(0.45),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // ── Acme Miles toggle ─────────────────────────────────
                    AcmeMilesToggle(
                      isActive: milesApplied,
                      pointsBalance: 2450, // will come from wallet provider in Module 15
                      creditMinor: 24500,  // 2450 pts × 10 paise
                      onToggle: () => ref
                          .read(acmeMilesAppliedProvider.notifier)
                          .state = !milesApplied,
                    ),

                    if (milesApplied)
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(2, 0, 2, 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Icon(Icons.check_circle_rounded, size: 14, color: cs.primary),
                            const SizedBox(width: 5),
                            Text(
                              '₹245 Acme Miles applied',
                              style: tt.bodySmall?.copyWith(
                                color: cs.primary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 24),

                    // ── Total + Pay CTA ───────────────────────────────────
                    PaymentTotalBar(
                      totalMinor: widget.fareAmountMinor,
                      ctaLabel:
                          'Pay ₹${(widget.fareAmountMinor ~/ 100).toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} securely',
                      onPay: _onPayTap,
                    ),

                    const SizedBox(height: 36),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Private nav bar ───────────────────────────────────────────────────────────

class _NavBar extends StatelessWidget {
  const _NavBar({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return SizedBox(
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
              title,
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
    );
  }
}

// ── Section label ─────────────────────────────────────────────────────────────

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

// ── Error state ───────────────────────────────────────────────────────────────

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.error_outline_rounded, color: cs.error, size: 40),
        const SizedBox(height: 12),
        Text(message, style: TextStyle(color: cs.onSurface.withOpacity(0.55))),
        const SizedBox(height: 16),
        TextButton(onPressed: onRetry, child: const Text('Retry')),
      ],
    );
  }
}
