// 3.3 — Passenger Count Screen
// Route pill, passenger stepper rows, fare class toggle, price preview.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_router.dart';
import '../../data/models/booking_models.dart';
import '../../domain/providers/booking_providers.dart';
import '../widgets/booking_widgets.dart';

class PassengerCountScreen extends ConsumerStatefulWidget {
  const PassengerCountScreen({super.key});

  @override
  ConsumerState<PassengerCountScreen> createState() =>
      _PassengerCountScreenState();
}

class _PassengerCountScreenState
    extends ConsumerState<PassengerCountScreen> {
  int _adults = 1;
  int _children = 0;
  int _infants = 0;
  FareClass _fareClass = FareClass.standard;

  int get _totalPax => _adults + _children;

  void _onSearch() {
    ref.read(bookingFlowProvider.notifier).setPassengerCounts(
          adults: _adults,
          children: _children,
          infants: _infants,
          fareClass: _fareClass,
        );
    context.push(AppRoutes.bookingResults);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final draft = ref.watch(bookingFlowProvider);
    final seatCapacity = draft.selectedFlight?.seatCapacity ?? 6;
    final fareMinor = draft.selectedFlight?.fareMinor ?? 0;
    final perSeat = fareMinor ~/ 100;
    final total = _adults * perSeat;
    final fmt = NumberFormat('#,##0', 'en_IN');

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: cs.surfaceContainerLow,
        body: SafeArea(
          child: Column(
            children: [
              _SimpleNavBar(
                cs: cs,
                theme: theme,
                title: 'Passengers',
              ),
              Expanded(
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding:
                      const EdgeInsetsDirectional.fromSTEB(18, 8, 18, 24),
                  children: [
                    // Route pill
                    _RoutePillSummary(draft: draft, cs: cs, theme: theme),
                    const SizedBox(height: 14),

                    // Passenger stepper card
                    Container(
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
                        children: [
                          PassengerStepperRow(
                            label: 'Adults',
                            subLabel: 'Age 12+',
                            count: _adults,
                            minCount: 1,
                            maxCount: 6,
                            onDecrement: () {
                              if (_adults > 1) {
                                setState(() => _adults--);
                              }
                            },
                            onIncrement: () {
                              if (_totalPax < seatCapacity) {
                                setState(() => _adults++);
                              }
                            },
                          ),
                          Divider(
                            height: 1,
                            thickness: 1,
                            color: cs.outline.withOpacity(0.5),
                          ),
                          PassengerStepperRow(
                            label: 'Children',
                            subLabel: 'Age 2–11',
                            count: _children,
                            minCount: 0,
                            maxCount: 5,
                            onDecrement: () {
                              if (_children > 0) {
                                setState(() => _children--);
                              }
                            },
                            onIncrement: () {
                              if (_totalPax < seatCapacity) {
                                setState(() => _children++);
                              }
                            },
                          ),
                          Divider(
                            height: 1,
                            thickness: 1,
                            color: cs.outline.withOpacity(0.5),
                          ),
                          PassengerStepperRow(
                            label: 'Infants',
                            subLabel: 'Under 2',
                            count: _infants,
                            minCount: 0,
                            maxCount: 2,
                            onDecrement: () {
                              if (_infants > 0) {
                                setState(() => _infants--);
                              }
                            },
                            onIncrement: () {
                              if (_infants < 2) {
                                setState(() => _infants++);
                              }
                            },
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Capacity note
                    Container(
                      padding:
                          const EdgeInsetsDirectional.fromSTEB(14, 10, 14, 10),
                      decoration: BoxDecoration(
                        color: cs.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: cs.primary.withOpacity(0.2),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.info_outline_rounded,
                            size: 16,
                            color: cs.primary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(
                                    text:
                                        'Aircraft carries up to ',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: cs.onSurface.withOpacity(0.75),
                                      height: 1.45,
                                    ),
                                  ),
                                  TextSpan(
                                    text: '$seatCapacity passengers',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: cs.onSurface.withOpacity(0.75),
                                      height: 1.45,
                                    ),
                                  ),
                                  TextSpan(
                                    text: '. Max 2 per row.',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: cs.onSurface.withOpacity(0.75),
                                      height: 1.45,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Fare class selector
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Fare class',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: cs.onSurface,
                            letterSpacing: -0.01,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: FareClass.values.map((fc) {
                            final isSelected = _fareClass == fc;
                            final label = fc.name[0].toUpperCase() +
                                fc.name.substring(1);
                            return Expanded(
                              child: Padding(
                                padding: EdgeInsetsDirectional.only(
                                  end: fc == FareClass.charter ? 0 : 8,
                                ),
                                child: GestureDetector(
                                  onTap: () =>
                                      setState(() => _fareClass = fc),
                                  child: Container(
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? cs.primary
                                          : cs.surface,
                                      borderRadius:
                                          BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isSelected
                                            ? Colors.transparent
                                            : cs.outline,
                                        width: 1.5,
                                      ),
                                    ),
                                    child: Center(
                                      child: Text(
                                        label,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.w400,
                                          color: isSelected
                                              ? cs.onPrimary
                                              : cs.onSurface.withOpacity(
                                                  0.7),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Price preview
                    Container(
                      padding:
                          const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
                      decoration: BoxDecoration(
                        color: cs.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: cs.outline),
                        boxShadow: [
                          BoxShadow(
                            color: cs.onSurface.withOpacity(0.04),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$_adults adult${_adults != 1 ? 's' : ''} × ₹${fmt.format(perSeat)}',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: cs.onSurface.withOpacity(0.55),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '₹${fmt.format(total)}',
                                style: TextStyle(
                                  fontFamily: 'IBMPlexMono',
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: cs.primary,
                                  letterSpacing: -0.025,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            'Taxes &\nfees extra',
                            textAlign: TextAlign.end,
                            style: TextStyle(
                              fontSize: 12,
                              color: cs.onSurface.withOpacity(0.38),
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    BookingCTA(
                      label: 'Search flights',
                      onPressed: _onSearch,
                    ),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

class _RoutePillSummary extends StatelessWidget {
  const _RoutePillSummary({
    required this.draft,
    required this.cs,
    required this.theme,
  });

  final BookingDraft draft;
  final ColorScheme cs;
  final ThemeData theme;

  String get _subtitle {
    final parts = <String>[];
    if (draft.selectedDate != null) {
      parts.add(DateFormat('EEE MMM d').format(draft.selectedDate!));
    }
    if (draft.departureTime != null) {
      try {
        final dt = DateTime.parse(draft.departureTime!).toLocal();
        parts.add(DateFormat('HH:mm').format(dt));
      } catch (_) {
        // ignore parse error
      }
    }
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    return RoutePill(
      originCode: draft.originCode ?? 'BOM',
      destinationCode: draft.destinationCode ?? '?',
      subtitle: _subtitle.isNotEmpty ? _subtitle : null,
    );
  }
}
