// 3.5 — Seat Map Screen
// Forest gradient header, helicopter seat grid (3 rows × 2 seats), legend,
// selected seats summary, CTA.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_router.dart';
import '../../data/models/booking_models.dart';
import '../../domain/providers/booking_providers.dart';
import '../widgets/booking_widgets.dart';

class SeatMapScreen extends ConsumerStatefulWidget {
  const SeatMapScreen({super.key});

  @override
  ConsumerState<SeatMapScreen> createState() => _SeatMapScreenState();
}

class _SeatMapScreenState extends ConsumerState<SeatMapScreen> {
  // Selected seat codes ordered by selection time (FIFO replacement)
  final List<String> _selectedCodes = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final draft = ref.read(bookingFlowProvider);
      if (draft.selectedFlightId != null) {
        ref
            .read(seatMapProvider.notifier)
            .fetch(draft.selectedFlightId!);
      }
    });
  }

  void _onSeatTap(String code, bool isOccupied, int maxSeats) {
    if (isOccupied) return;
    setState(() {
      if (_selectedCodes.contains(code)) {
        _selectedCodes.remove(code);
      } else if (_selectedCodes.length < maxSeats) {
        _selectedCodes.add(code);
      } else {
        // FIFO replacement
        _selectedCodes.removeAt(0);
        _selectedCodes.add(code);
      }
    });
  }

  void _onContinue() {
    ref.read(bookingFlowProvider.notifier).setSelectedSeats(_selectedCodes);
    context.push(AppRoutes.bookingPassengerDetails);
  }

  String _formatTime(String isoStr) {
    try {
      final dt = DateTime.parse(isoStr).toLocal();
      return DateFormat('hh:mm a').format(dt);
    } catch (_) {
      return isoStr.length >= 16 ? isoStr.substring(11, 16) : isoStr;
    }
  }

  /// Build a default seat grid from capacity when API is unavailable.
  List<SeatInfo> _buildDefaultSeats(int capacity) {
    final rows = (capacity / 2).ceil();
    final seats = <SeatInfo>[];
    for (int r = 1; r <= rows; r++) {
      seats.add(SeatInfo(seatCode: '${r}A', state: SeatState.available));
      seats.add(SeatInfo(seatCode: '${r}B', state: SeatState.available));
    }
    return seats;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final draft = ref.watch(bookingFlowProvider);
    final seatsAsync = ref.watch(seatMapProvider);
    final maxSeats = draft.totalPassengers;

    final aircraftName =
        draft.selectedFlight?.aircraftModel ?? 'Helicopter';
    final originCode = draft.originCode ?? 'BOM';
    final destCode = draft.destinationCode ?? 'PNQ';
    final depTime = draft.departureTime != null
        ? _formatTime(draft.departureTime!)
        : '—';
    final tailNo = draft.selectedFlight?.tailNumber ?? '—';

    final priceStr = draft.selectedFlight != null
        ? '₹${NumberFormat('#,##0', 'en_IN').format(draft.selectedFlight!.fareMinor ~/ 100 * _selectedCodes.length)}'
        : '—';

    return Scaffold(
      backgroundColor: cs.surfaceContainerLow,
      body: Column(
        children: [
          // ── Forest gradient header ──────────────────────────────────────
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: const Alignment(-0.6, -1.0),
                end: const Alignment(0.6, 1.0),
                colors: [
                  cs.primary,
                  cs.primary.withOpacity(0.75),
                ],
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Column(
                children: [
                  // NavBar
                  SizedBox(
                    height: 52,
                    child: Row(
                      children: [
                        IconButton(
                          onPressed: () => context.pop(),
                          icon: Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: cs.onPrimary,
                            size: 22,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            'Select seats',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                              color: cs.onPrimary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 52),
                      ],
                    ),
                  ),
                  // Aircraft name + route
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                        22, 0, 22, 20),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                aircraftName,
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: cs.onPrimary,
                                  letterSpacing: -0.02,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$originCode → $destCode · $depTime · $tailNo',
                                style: TextStyle(
                                  fontFamily: 'IBMPlexMono',
                                  fontSize: 12.5,
                                  color: cs.onPrimary.withOpacity(0.45),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          height: 28,
                          padding: const EdgeInsetsDirectional.fromSTEB(
                              12, 0, 12, 0),
                          decoration: BoxDecoration(
                            color: cs.primary.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(
                              color: cs.primary.withOpacity(0.3),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              '${_selectedCodes.length} / $maxSeats selected',
                              style: TextStyle(
                                fontFamily: 'IBMPlexMono',
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: cs.onPrimary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Content ─────────────────────────────────────────────────────
          Expanded(
            child: seatsAsync.when(
              loading: () => Center(
                child: CircularProgressIndicator(color: cs.primary),
              ),
              error: (e, _) => _buildSeatMapContent(
                cs: cs,
                seats: _buildDefaultSeats(
                    draft.selectedFlight?.seatCapacity ?? 6),
                maxSeats: maxSeats,
                priceStr: priceStr,
                allDisabled: true,
              ),
              data: (seats) {
                final displaySeats = seats.isEmpty
                    ? _buildDefaultSeats(
                        draft.selectedFlight?.seatCapacity ?? 6)
                    : seats.map((s) {
                        if (_selectedCodes.contains(s.seatCode)) {
                          return s.copyWith(state: SeatState.selected);
                        }
                        return s;
                      }).toList();
                return _buildSeatMapContent(
                  cs: cs,
                  seats: displaySeats,
                  maxSeats: maxSeats,
                  priceStr: priceStr,
                  allDisabled: false,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSeatMapContent({
    required ColorScheme cs,
    required List<SeatInfo> seats,
    required int maxSeats,
    required String priceStr,
    required bool allDisabled,
  }) {
    // Pair seats into rows (2 per row)
    final rows = <List<SeatInfo>>[];
    for (int i = 0; i < seats.length; i += 2) {
      if (i + 1 < seats.length) {
        rows.add([seats[i], seats[i + 1]]);
      } else {
        rows.add([seats[i]]);
      }
    }

    return ListView(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 18, 18, 24),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        // Seat map card
        Container(
          decoration: BoxDecoration(
            color: cs.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cs.outline),
            boxShadow: [
              BoxShadow(
                color: cs.onSurface.withOpacity(0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 20),
          child: Column(
            children: [
              // Cockpit nose
              Container(
                width: 80,
                height: 32,
                decoration: BoxDecoration(
                  color: cs.primary,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(40),
                    topRight: Radius.circular(40),
                  ),
                ),
                child: Icon(
                  Icons.airplanemode_active,
                  size: 18,
                  color: cs.onPrimary.withOpacity(0.9),
                ),
              ),

              const SizedBox(height: 12),

              // Aircraft body outline
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: cs.outline,
                    width: 2,
                  ),
                ),
                padding: const EdgeInsetsDirectional.fromSTEB(
                    20, 16, 20, 20),
                child: Column(
                  children: rows.map((row) {
                    return Padding(
                      padding:
                          const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 14),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          for (int c = 0; c < row.length; c++) ...[
                            if (c > 0) const SizedBox(width: 24),
                            SeatTile(
                              seatCode: row[c].seatCode,
                              isOccupied: allDisabled ||
                                  row[c].state == SeatState.occupied,
                              isSelected:
                                  row[c].state == SeatState.selected ||
                                      _selectedCodes
                                          .contains(row[c].seatCode),
                              passengerLabel: _passengerLabel(
                                  row[c].seatCode, maxSeats),
                              onTap: () => _onSeatTap(
                                row[c].seatCode,
                                allDisabled ||
                                    row[c].state == SeatState.occupied,
                                maxSeats,
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),

              const SizedBox(height: 16),

              // Legend
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _LegendItem(
                    label: 'Available',
                    bg: cs.surface,
                    borderColor: cs.primary,
                  ),
                  const SizedBox(width: 18),
                  _LegendItem(
                    label: 'Selected',
                    bg: cs.primary,
                    borderColor: cs.primary,
                  ),
                  const SizedBox(width: 18),
                  _LegendItem(
                    label: 'Taken',
                    bg: cs.surfaceContainerHighest,
                    borderColor: cs.outline,
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Selected summary
        if (_selectedCodes.isNotEmpty)
          Container(
            padding:
                const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
            decoration: BoxDecoration(
              color: cs.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cs.outline),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Seats ${_selectedCodes.join(' & ')} selected',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: cs.onSurface,
                          letterSpacing: -0.01,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_selectedCodes.length} seat${_selectedCodes.length != 1 ? 's' : ''} selected',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: cs.onSurface.withOpacity(0.55),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  priceStr,
                  style: TextStyle(
                    fontFamily: 'IBMPlexMono',
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: cs.primary,
                    letterSpacing: -0.02,
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 24),

        BookingCTA(
          label: 'Continue to details',
          onPressed: _selectedCodes.length == maxSeats ? _onContinue : null,
        ),
      ],
    );
  }

  String? _passengerLabel(String code, int maxSeats) {
    final idx = _selectedCodes.indexOf(code);
    if (idx < 0) return null;
    return 'P${idx + 1}';
  }
}

// ── Legend item ───────────────────────────────────────────────────────────────

class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.label,
    required this.bg,
    required this.borderColor,
  });

  final String label;
  final Color bg;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: borderColor, width: 1.5),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: cs.onSurface.withOpacity(0.55),
          ),
        ),
      ],
    );
  }
}
