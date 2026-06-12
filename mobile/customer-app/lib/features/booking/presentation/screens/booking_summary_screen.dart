// 3.7 — Booking Summary Screen
// FlowStep, forest gradient flight card, fare breakdown, payment method,
// confirm CTA.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/router/app_router.dart';
import '../../data/models/booking_models.dart';
import '../../domain/providers/booking_providers.dart';
import '../widgets/booking_widgets.dart';

class BookingSummaryScreen extends ConsumerStatefulWidget {
  const BookingSummaryScreen({super.key});

  @override
  ConsumerState<BookingSummaryScreen> createState() =>
      _BookingSummaryScreenState();
}

class _BookingSummaryScreenState
    extends ConsumerState<BookingSummaryScreen> {
  bool _isConfirming = false;

  // UUID v4 idempotency key — generated once per screen instance,
  // so retries on the same screen reuse the same key (idempotency guarantee).
  final String _idempotencyKey = const Uuid().v4();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchFareIfNeeded();
    });
  }

  void _fetchFareIfNeeded() {
    final draft = ref.read(bookingFlowProvider);
    final fare = ref.read(fareEstimateProvider).valueOrNull;
    if (fare != null) return;
    if (draft.routeId == null) return;

    final date = draft.selectedDate != null
        ? DateFormat('yyyy-MM-dd').format(draft.selectedDate!)
        : DateFormat('yyyy-MM-dd').format(DateTime.now());

    ref.read(fareEstimateProvider.notifier).fetch(
          routeId: draft.routeId!,
          flightId: draft.selectedFlightId,
          date: date,
          paxCount: draft.totalPassengers,
          fareClass: draft.fareClass.name,
          seatCodes: draft.selectedSeats,
        );
  }

  Future<void> _onConfirm() async {
    if (_isConfirming) return;

    final draft = ref.read(bookingFlowProvider);

    // Validate minimum required fields
    if (draft.selectedPaymentMethodId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please select a payment method'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    // Re-fetch fare if estimate is null/expired
    final fareAsync = ref.read(fareEstimateProvider);
    if (fareAsync.valueOrNull == null) {
      _fetchFareIfNeeded();
      return;
    }

    setState(() => _isConfirming = true);

    try {
      final booking = await ref
          .read(createBookingProvider.notifier)
          .confirm(idempotencyKey: _idempotencyKey);

      if (!mounted) return;

      if (booking != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Booking confirmed! Ref: ${booking.bookingRef}'),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );
        ref.read(bookingFlowProvider.notifier).reset();
        context.go(AppRoutes.home);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
                'Booking service is not yet available. Try again later.'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Booking failed: ${e.toString()}'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isConfirming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final draft = ref.watch(bookingFlowProvider);
    final fareAsync = ref.watch(fareEstimateProvider);
    final paymentAsync = ref.watch(paymentMethodsProvider);
    final createAsync = ref.watch(createBookingProvider);

    final isLoading = createAsync.isLoading || _isConfirming;

    // Determine total display
    final totalMinor = fareAsync.valueOrNull?.totalMinor ??
        (draft.selectedFlight != null
            ? draft.selectedFlight!.fareMinor * draft.totalPassengers
            : 0);
    final totalStr =
        '₹${NumberFormat('#,##0', 'en_IN').format(totalMinor ~/ 100)}';

    final selectedPaymentId = draft.selectedPaymentMethodId;
    final paymentMethods = paymentAsync.valueOrNull ?? [];
    final selectedMethod = selectedPaymentId != null
        ? paymentMethods.firstWhere(
            (m) => m.id == selectedPaymentId,
            orElse: () => paymentMethods.isNotEmpty
                ? paymentMethods[0]
                : PaymentMethod(
                    id: '',
                    type: 'card',
                    display: 'No payment method',
                    isDefault: false,
                  ),
          )
        : (paymentMethods.isNotEmpty ? paymentMethods[0] : null);

    return Scaffold(
      backgroundColor: cs.surfaceContainerLow,
      body: SafeArea(
        child: Column(
          children: [
            // NavBar
            _SimpleNavBar(cs: cs, theme: theme, title: 'Review & pay'),

            // FlowStep
            const BookingFlowStep(currentStep: 2),

            // Scrollable content
            Expanded(
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 24),
                children: [
                  // ── Forest gradient flight summary card ─────────────────
                  _FlightSummaryCard(draft: draft, cs: cs, theme: theme),

                  const SizedBox(height: 12),

                  // ── Fare breakdown card ─────────────────────────────────
                  _FareBreakdownCard(
                    fareAsync: fareAsync,
                    cs: cs,
                    theme: theme,
                    onRetry: _fetchFareIfNeeded,
                  ),

                  const SizedBox(height: 12),

                  // ── Payment method card ─────────────────────────────────
                  _PaymentMethodCard(
                    selectedMethod: selectedMethod,
                    paymentMethods: paymentMethods,
                    cs: cs,
                    theme: theme,
                    onMethodSelected: (m) {
                      ref
                          .read(bookingFlowProvider.notifier)
                          .setPaymentMethod(m.id);
                    },
                  ),

                  const SizedBox(height: 20),

                  // ── Confirm CTA ─────────────────────────────────────────
                  BookingCTA(
                    label: 'Confirm & pay $totalStr',
                    onPressed: isLoading ? null : _onConfirm,
                    isLoading: isLoading,
                  ),

                  const SizedBox(height: 12),

                  // Legal footnote
                  Center(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'By confirming you agree to our ',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: cs.onSurface.withOpacity(0.38),
                              height: 1.5,
                            ),
                          ),
                          WidgetSpan(
                            child: GestureDetector(
                              onTap: () {},
                              child: Text(
                                'Terms',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: cs.primary,
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ),
                          TextSpan(
                            text: ' & ',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: cs.onSurface.withOpacity(0.38),
                              height: 1.5,
                            ),
                          ),
                          WidgetSpan(
                            child: GestureDetector(
                              onTap: () {},
                              child: Text(
                                'Cancellation policy',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: cs.primary,
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ),
                        ],
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

// ── Forest gradient flight summary card ──────────────────────────────────────

class _FlightSummaryCard extends StatelessWidget {
  const _FlightSummaryCard({
    required this.draft,
    required this.cs,
    required this.theme,
  });

  final BookingDraft draft;
  final ColorScheme cs;
  final ThemeData theme;

  String _formatTime(String? isoStr) {
    if (isoStr == null) return '—';
    try {
      final dt = DateTime.parse(isoStr).toLocal();
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return isoStr.length >= 16 ? isoStr.substring(11, 16) : isoStr;
    }
  }

  String _formatDuration(String? dep, String? arr) {
    if (dep == null || arr == null) return '—';
    try {
      final d = DateTime.parse(dep);
      final a = DateTime.parse(arr);
      return '${a.difference(d).inMinutes} min';
    } catch (_) {
      return '—';
    }
  }

  @override
  Widget build(BuildContext context) {
    final depTime = _formatTime(draft.departureTime);
    final arrTime = _formatTime(draft.arrivalTime);
    final dur = _formatDuration(draft.departureTime, draft.arrivalTime);
    final String dateStr;
    if (draft.selectedDate != null) {
      final datePart = DateFormat('EEE, MMM d').format(draft.selectedDate!);
      final timePart = draft.departureTime != null
          ? DateFormat('hh:mm a')
              .format(DateTime.parse(draft.departureTime!).toLocal())
          : '';
      dateStr = timePart.isNotEmpty ? '$datePart · $timePart' : datePart;
    } else {
      dateStr = '—';
    }
    final seatStr = draft.selectedSeats.isNotEmpty
        ? 'Seats ${draft.selectedSeats.join(' & ')}'
        : 'No seats';

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: const Alignment(-0.5, -1.0),
          end: const Alignment(0.5, 1.0),
          colors: [
            cs.primary,
            cs.primary.withOpacity(0.75),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsetsDirectional.fromSTEB(18, 16, 18, 16),
      child: Stack(
        children: [
          // Background circle decoration
          Positioned(
            right: -10,
            top: -10,
            child: Opacity(
              opacity: 0.07,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: cs.onPrimary,
                    width: 0.7,
                  ),
                ),
              ),
            ),
          ),

          Column(
            children: [
              // Date + seat pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    dateStr.toUpperCase(),
                    style: TextStyle(
                      fontFamily: 'IBMPlexMono',
                      fontSize: 11,
                      letterSpacing: 0.1,
                      color: cs.onPrimary.withOpacity(0.38),
                    ),
                  ),
                  Container(
                    height: 22,
                    padding: const EdgeInsetsDirectional.fromSTEB(10, 0, 10, 0),
                    decoration: BoxDecoration(
                      color: cs.primary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(
                        color: cs.primary.withOpacity(0.3),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        seatStr,
                        style: TextStyle(
                          fontFamily: 'IBMPlexMono',
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: cs.onPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // BOM/PNQ route row
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        draft.originCode ?? '—',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                          color: cs.onPrimary,
                          letterSpacing: -0.025,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$depTime · ${draft.originName ?? '—'}',
                        style: TextStyle(
                          fontSize: 11,
                          color: cs.onPrimary.withOpacity(0.4),
                        ),
                      ),
                    ],
                  ),

                  Expanded(
                    child: Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                          12, 0, 12, 0),
                      child: Column(
                        children: [
                          Text(
                            dur,
                            style: TextStyle(
                              fontFamily: 'IBMPlexMono',
                              fontSize: 11,
                              color: cs.onPrimary.withOpacity(0.3),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: cs.onPrimary.withOpacity(0.2),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsetsDirectional.fromSTEB(
                                    4, 0, 4, 0),
                                child: Icon(
                                  Icons.flight_rounded,
                                  size: 16,
                                  color: cs.onPrimary.withOpacity(0.7),
                                ),
                              ),
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: cs.onPrimary.withOpacity(0.2),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        draft.destinationCode ?? '—',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                          color: cs.onPrimary,
                          letterSpacing: -0.025,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$arrTime · ${draft.destinationName ?? '—'}',
                        style: TextStyle(
                          fontSize: 11,
                          color: cs.onPrimary.withOpacity(0.4),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Passenger pills
              if (draft.passengers.isNotEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsetsDirectional.fromSTEB(0, 10, 0, 0),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: cs.onPrimary.withOpacity(0.1),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: draft.passengers
                        .where((p) => p.fullName.isNotEmpty)
                        .map(
                          (p) => Container(
                            padding: const EdgeInsetsDirectional.fromSTEB(
                                10, 4, 10, 4),
                            decoration: BoxDecoration(
                              color: cs.onPrimary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(100),
                              border: Border.all(
                                color: cs.onPrimary.withOpacity(0.12),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.person_outline_rounded,
                                  size: 12,
                                  color: cs.onPrimary.withOpacity(0.45),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  p.fullName,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: cs.onPrimary.withOpacity(0.6),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Fare breakdown card ───────────────────────────────────────────────────────

class _FareBreakdownCard extends StatelessWidget {
  const _FareBreakdownCard({
    required this.fareAsync,
    required this.cs,
    required this.theme,
    required this.onRetry,
  });

  final AsyncValue<FareEstimate?> fareAsync;
  final ColorScheme cs;
  final ThemeData theme;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 16, 18, 16),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline),
        boxShadow: [
          BoxShadow(
            color: cs.onSurface.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Fare breakdown',
            style: theme.textTheme.titleSmall?.copyWith(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: cs.onSurface,
              letterSpacing: -0.01,
            ),
          ),
          const SizedBox(height: 12),
          fareAsync.when(
            loading: () => Column(
              children: List.generate(
                4,
                (_) => Padding(
                  padding:
                      const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 120,
                        height: 14,
                        decoration: BoxDecoration(
                          color: cs.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Container(
                        width: 60,
                        height: 14,
                        decoration: BoxDecoration(
                          color: cs.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            error: (e, _) => Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.error_outline_rounded,
                        color: cs.error, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Could not load fare — tap to retry',
                        style: TextStyle(fontSize: 13, color: cs.error),
                      ),
                    ),
                    TextButton(
                      onPressed: onRetry,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ],
            ),
            data: (fare) {
              if (fare == null) {
                return Column(
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          color: cs.onSurface.withOpacity(0.38),
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Could not load fare — tap to retry',
                            style: TextStyle(
                              fontSize: 13,
                              color: cs.onSurface.withOpacity(0.55),
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: onRetry,
                          child: Icon(
                            Icons.refresh_rounded,
                            size: 20,
                            color: cs.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              }
              return Column(
                children: [
                  ...fare.lineItems.map(
                    (item) => Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                          0, 0, 0, 10),
                      child: FareRow(
                        label: item.label,
                        amountMinor: item.amountMinor,
                      ),
                    ),
                  ),
                  Divider(height: 1, thickness: 1, color: cs.outline),
                  const SizedBox(height: 10),
                  FareRow(
                    label: 'Total',
                    amountMinor: fare.totalMinor,
                    isTotal: true,
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

// ── Payment method card ───────────────────────────────────────────────────────

class _PaymentMethodCard extends StatelessWidget {
  const _PaymentMethodCard({
    required this.selectedMethod,
    required this.paymentMethods,
    required this.cs,
    required this.theme,
    required this.onMethodSelected,
  });

  final PaymentMethod? selectedMethod;
  final List<PaymentMethod> paymentMethods;
  final ColorScheme cs;
  final ThemeData theme;
  final ValueChanged<PaymentMethod> onMethodSelected;

  IconData _iconForType(String type) {
    switch (type) {
      case 'upi':
        return Icons.phone_android_rounded;
      case 'wallet':
        return Icons.account_balance_wallet_rounded;
      case 'netbanking':
        return Icons.account_balance_rounded;
      default:
        return Icons.credit_card_rounded;
    }
  }

  void _showPaymentSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(18, 20, 18, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: cs.outline,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Select payment method',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            if (paymentMethods.isEmpty)
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(0, 16, 0, 16),
                child: Text(
                  'No payment methods saved',
                  style: TextStyle(
                      color: cs.onSurface.withOpacity(0.55)),
                ),
              )
            else
              ...paymentMethods.map(
                (m) => ListTile(
                  leading: Icon(_iconForType(m.type), color: cs.primary),
                  title: Text(m.display),
                  subtitle: m.subLabel != null ? Text(m.subLabel!) : null,
                  trailing: m.id == selectedMethod?.id
                      ? Icon(Icons.check_rounded, color: cs.primary)
                      : null,
                  onTap: () {
                    onMethodSelected(m);
                    ctx.pop();
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 30,
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              selectedMethod != null
                  ? _iconForType(selectedMethod!.type)
                  : Icons.credit_card_rounded,
              size: 18,
              color: cs.onSurface.withOpacity(0.7),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: selectedMethod != null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        selectedMethod!.display,
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                          color: cs.onSurface,
                          letterSpacing: -0.01,
                        ),
                      ),
                      if (selectedMethod!.subLabel != null) ...[
                        const SizedBox(height: 1),
                        Text(
                          selectedMethod!.subLabel!,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: cs.onSurface.withOpacity(0.55),
                          ),
                        ),
                      ],
                    ],
                  )
                : Text(
                    'Add payment method',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w500,
                      color: cs.primary,
                    ),
                  ),
          ),
          GestureDetector(
            onTap: () => _showPaymentSheet(context),
            child: Container(
              height: 30,
              padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 12, 0),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(100),
                border: Border.all(color: cs.outline),
              ),
              child: Center(
                child: Text(
                  'Change',
                  style: TextStyle(
                    fontSize: 13,
                    color: cs.onSurface.withOpacity(0.7),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── NavBar ────────────────────────────────────────────────────────────────────

class _SimpleNavBar extends StatelessWidget {
  const _SimpleNavBar({
    required this.cs,
    required this.theme,
    required this.title,
  });

  final ColorScheme cs;
  final ThemeData theme;
  final String title;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: Row(
        children: [
          IconButton(
            onPressed: () => context.pop(),
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              color: cs.onSurface,
              size: 22,
            ),
          ),
          Expanded(
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 17,
                color: cs.onSurface,
              ),
            ),
          ),
          const SizedBox(width: 52),
        ],
      ),
    );
  }
}
