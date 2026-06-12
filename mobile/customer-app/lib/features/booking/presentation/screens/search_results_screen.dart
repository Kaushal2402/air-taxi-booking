// 3.4 — Search Results Screen
// Forest header with route/date/pax summary, sort bar, flight result cards.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_router.dart';
import '../../data/models/booking_models.dart';
import '../../domain/providers/booking_providers.dart';

enum _SortMode { price, departure, duration }

class SearchResultsScreen extends ConsumerStatefulWidget {
  const SearchResultsScreen({super.key});

  @override
  ConsumerState<SearchResultsScreen> createState() =>
      _SearchResultsScreenState();
}

class _SearchResultsScreenState
    extends ConsumerState<SearchResultsScreen> {
  _SortMode _sort = _SortMode.price;

  int _flightDurationMinutes(AirFlight f) {
    try {
      return DateTime.parse(f.arrivalTime)
          .difference(DateTime.parse(f.departureTime))
          .inMinutes;
    } catch (_) {
      return 0;
    }
  }

  List<AirFlight> _sorted(List<AirFlight> flights) {
    final copy = List<AirFlight>.from(flights);
    switch (_sort) {
      case _SortMode.price:
        copy.sort((a, b) => a.fareMinor.compareTo(b.fareMinor));
      case _SortMode.departure:
        copy.sort((a, b) => a.departureTime.compareTo(b.departureTime));
      case _SortMode.duration:
        copy.sort((a, b) => _flightDurationMinutes(a)
            .compareTo(_flightDurationMinutes(b)));
    }
    return copy;
  }

  void _onFlightTap(AirFlight flight) {
    final draft = ref.read(bookingFlowProvider);
    if (draft.selectedDate == null) return;
    ref
        .read(bookingFlowProvider.notifier)
        .setDateAndFlight(date: draft.selectedDate!, flight: flight);
    context.push(AppRoutes.bookingSeatMap);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final draft = ref.watch(bookingFlowProvider);
    final flightsAsync = ref.watch(availableFlightsProvider);

    final originCode = draft.originCode ?? 'BOM';
    final destCode = draft.destinationCode ?? 'PNQ';
    final totalPax = draft.adultCount + draft.childCount;
    final dateStr = draft.selectedDate != null
        ? DateFormat('EEE, MMM d').format(draft.selectedDate!)
        : '—';

    return Scaffold(
      backgroundColor: cs.surfaceContainerLow,
      body: Column(
        children: [
          // ── Forest header ───────────────────────────────────────────────
          Container(
            color: cs.primary,
            child: SafeArea(
              bottom: false,
              child: Column(
                children: [
                  // NavBar row
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
                        const Spacer(),
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                              0, 0, 12, 0),
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: cs.onPrimary.withOpacity(0.12),
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: cs.onPrimary.withOpacity(0.15)),
                            ),
                            child: Icon(
                              Icons.tune_rounded,
                              size: 16,
                              color: cs.onPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Route + date + pax
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                        18, 0, 18, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    originCode,
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w700,
                                      color: cs.onPrimary,
                                      letterSpacing: -0.02,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Icon(
                                    Icons.arrow_forward_rounded,
                                    size: 16,
                                    color: cs.onPrimary.withOpacity(0.5),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    destCode,
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w700,
                                      color: cs.onPrimary,
                                      letterSpacing: -0.02,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(
                                    Icons.calendar_today_rounded,
                                    size: 12,
                                    color: cs.onPrimary.withOpacity(0.4),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    dateStr,
                                    style: TextStyle(
                                      fontFamily: 'IBMPlexMono',
                                      fontSize: 12.5,
                                      color:
                                          cs.onPrimary.withOpacity(0.55),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Icon(
                                    Icons.people_outline_rounded,
                                    size: 12,
                                    color: cs.onPrimary.withOpacity(0.4),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '$totalPax adult${totalPax != 1 ? 's' : ''}',
                                    style: TextStyle(
                                      fontFamily: 'IBMPlexMono',
                                      fontSize: 12.5,
                                      color:
                                          cs.onPrimary.withOpacity(0.55),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () => context.pop(),
                          child: Container(
                            height: 32,
                            padding: const EdgeInsetsDirectional.fromSTEB(
                                12, 0, 12, 0),
                            decoration: BoxDecoration(
                              color: cs.onPrimary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(100),
                              border: Border.all(
                                color: cs.onPrimary.withOpacity(0.18),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Edit',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    color:
                                        cs.onPrimary.withOpacity(0.8),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 13,
                                  color: cs.onPrimary.withOpacity(0.8),
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
          ),

          // ── Sort bar ────────────────────────────────────────────────────
          Container(
            padding:
                const EdgeInsetsDirectional.fromSTEB(18, 12, 18, 12),
            decoration: BoxDecoration(
                            color: cs.surfaceContainerLow,
              border: Border(
                bottom: BorderSide(color: cs.outline, width: 1),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: _SortMode.values.map((mode) {
                      final isSelected = _sort == mode;
                      final label = switch (mode) {
                        _SortMode.price => 'Price',
                        _SortMode.departure => 'Departure',
                        _SortMode.duration => 'Duration',
                      };
                      return Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                            0, 0, 8, 0),
                        child: GestureDetector(
                          onTap: () => setState(() => _sort = mode),
                          child: Container(
                            height: 32,
                            padding:
                                const EdgeInsetsDirectional.fromSTEB(
                                    12, 0, 12, 0),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? cs.surfaceContainerHighest
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(100),
                              border: Border.all(
                                color: isSelected
                                    ? cs.outline
                                    : Colors.transparent,
                              ),
                            ),
                            child: Row(
                              children: [
                                Text(
                                  label,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
                                        : FontWeight.w400,
                                    color: isSelected
                                        ? cs.onSurface
                                        : cs.onSurface
                                            .withOpacity(0.55),
                                  ),
                                ),
                                if (isSelected) ...[
                                  const SizedBox(width: 2),
                                  Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    size: 12,
                                    color: cs.onSurface,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                Container(
                  height: 32,
                  padding: const EdgeInsetsDirectional.fromSTEB(
                      12, 0, 12, 0),
                  decoration: BoxDecoration(
                    color: cs.primary,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.filter_list_rounded,
                        size: 13,
                        color: cs.onPrimary,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'Filter',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: cs.onPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Flight list ─────────────────────────────────────────────────
          Expanded(
            child: flightsAsync.when(
              loading: () => _buildShimmer(cs),
              error: (e, _) => _buildError(cs),
              data: (flights) {
                if (flights.isEmpty) {
                  return _buildEmpty(cs, theme);
                }
                final sorted = _sorted(flights);
                return ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsetsDirectional.fromSTEB(
                      18, 12, 18, 24),
                  itemCount: sorted.length + 1,
                  itemBuilder: (context, i) {
                    if (i == 0) {
                      return Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                            0, 0, 0, 8),
                        child: Text(
                          '${flights.length} FLIGHTS FOUND',
                          style: TextStyle(
                            fontFamily: 'IBMPlexMono',
                            fontSize: 12,
                            letterSpacing: 0.1,
                            color: cs.onSurface.withOpacity(0.38),
                          ),
                        ),
                      );
                    }
                    final flight = sorted[i - 1];
                    return Padding(
                      padding:
                          const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 10),
                      child: _FlightCard(
                        flight: flight,
                        isBestValue: i == 1 && _sort == _SortMode.price,
                        originName: draft.originName ?? '—',
                        destinationName: draft.destinationName ?? '—',
                        cs: cs,
                        theme: theme,
                        onTap: () => _onFlightTap(flight),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer(ColorScheme cs) {
    return ListView.builder(
      padding:
          const EdgeInsetsDirectional.fromSTEB(18, 12, 18, 24),
      itemCount: 4,
      itemBuilder: (context, _) => Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 10),
        child: Container(
          height: 110,
          decoration: BoxDecoration(
            color: cs.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty(ColorScheme cs, ThemeData theme) {
    return Center(
      child: Padding(
        padding:
            const EdgeInsetsDirectional.fromSTEB(32, 0, 32, 0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.flight_off_rounded,
              size: 48,
              color: cs.onSurface.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'No flights found',
              style: theme.textTheme.titleMedium?.copyWith(
                color: cs.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Adjust filters or try a different date',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: cs.onSurface.withOpacity(0.55),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(ColorScheme cs) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded,
              size: 40, color: cs.error),
          const SizedBox(height: 12),
          Text(
            'Could not load flights',
            style: TextStyle(fontSize: 15, color: cs.error),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              final draft = ref.read(bookingFlowProvider);
              if (draft.routeId != null && draft.selectedDate != null) {
                ref
                    .read(availableFlightsProvider.notifier)
                    .fetch(
                      routeId: draft.routeId!,
                      date: DateFormat('yyyy-MM-dd')
                          .format(draft.selectedDate!),
                    );
              }
            },
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

// ── Flight result card ────────────────────────────────────────────────────────

class _FlightCard extends StatelessWidget {
  const _FlightCard({
    required this.flight,
    required this.isBestValue,
    required this.originName,
    required this.destinationName,
    required this.cs,
    required this.theme,
    required this.onTap,
  });

  final AirFlight flight;
  final bool isBestValue;
  final String originName;
  final String destinationName;
  final ColorScheme cs;
  final ThemeData theme;
  final VoidCallback onTap;

  String _formatTime(String isoStr) {
    try {
      final dt = DateTime.parse(isoStr).toLocal();
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return isoStr.length >= 16 ? isoStr.substring(11, 16) : isoStr;
    }
  }

  String _formatDuration(String dep, String arr) {
    try {
      final d = DateTime.parse(dep);
      final a = DateTime.parse(arr);
      final mins = a.difference(d).inMinutes;
      return '$mins min';
    } catch (_) {
      return '—';
    }
  }

  String? get _badge {
    if (isBestValue) return 'Best value';
    if (flight.seatsAvailable <= 2) return '${flight.seatsAvailable} left';
    return null;
  }

  Color _badgeColor() {
    if (isBestValue) return cs.primary;
    if (flight.seatsAvailable <= 2) return cs.error;
    return cs.tertiary;
  }

  @override
  Widget build(BuildContext context) {
    final depTime = _formatTime(flight.departureTime);
    final arrTime = _formatTime(flight.arrivalTime);
    final dur = _formatDuration(flight.departureTime, flight.arrivalTime);
    final priceStr =
        '₹${NumberFormat('#,##0', 'en_IN').format(flight.fareMinor ~/ 100)}';

    return Stack(
      clipBehavior: Clip.none,
      children: [
        GestureDetector(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              color: cs.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isBestValue ? cs.primary : cs.outline,
                width: 1.5,
              ),
              boxShadow: [
                if (isBestValue)
                  BoxShadow(
                    color: cs.primary.withOpacity(0.2),
                    blurRadius: 10,
                    spreadRadius: 0,
                  )
                else
                  BoxShadow(
                    color: cs.onSurface.withOpacity(0.05),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
              ],
            ),
            padding: const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
            child: Column(
              children: [
                // Dep / route / arr row
                Row(
                  children: [
                    // Departure
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          depTime,
                          style: TextStyle(
                            fontFamily: 'IBMPlexMono',
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: cs.onSurface,
                            letterSpacing: -0.025,
                            height: 1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          originName,
                          style: TextStyle(
                            fontSize: 11,
                            color: cs.onSurface.withOpacity(0.38),
                          ),
                        ),
                      ],
                    ),

                    // Route line
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                            10, 0, 10, 0),
                        child: Column(
                          children: [
                            Text(
                              dur,
                              style: TextStyle(
                                fontFamily: 'IBMPlexMono',
                                fontSize: 11,
                                color: cs.onSurface.withOpacity(0.38),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    height: 1,
                                    color:
                                        cs.onSurface.withOpacity(0.3),
                                  ),
                                ),
                                Padding(
                                  padding:
                                      const EdgeInsetsDirectional.fromSTEB(
                                          4, 0, 4, 0),
                                  child: Icon(
                                    Icons.helicopter_rounded,
                                    size: 16,
                                    color: cs.primary,
                                  ),
                                ),
                                Expanded(
                                  child: Container(
                                    height: 1,
                                    color:
                                        cs.onSurface.withOpacity(0.3),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'DIRECT',
                              style: TextStyle(
                                fontFamily: 'IBMPlexMono',
                                fontSize: 10,
                                color: cs.onSurface.withOpacity(0.25),
                                letterSpacing: 0.06,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Arrival
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          arrTime,
                          style: TextStyle(
                            fontFamily: 'IBMPlexMono',
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: cs.onSurface,
                            letterSpacing: -0.025,
                            height: 1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          destinationName,
                          style: TextStyle(
                            fontSize: 11,
                            color: cs.onSurface.withOpacity(0.38),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Bottom row: aircraft + seats | price
                Divider(
                  height: 1,
                  thickness: 1,
                  color: cs.outline.withOpacity(0.5),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.helicopter_rounded,
                              size: 13,
                              color: cs.onSurface.withOpacity(0.38),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              flight.aircraftModel ?? 'Helicopter',
                              style: TextStyle(
                                fontSize: 12.5,
                                color:
                                    cs.onSurface.withOpacity(0.55),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 12),
                        Row(
                          children: [
                            Icon(
                              Icons.people_outline_rounded,
                              size: 13,
                              color: cs.onSurface.withOpacity(0.38),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${flight.seatsAvailable} seats left',
                              style: TextStyle(
                                fontSize: 12.5,
                                color:
                                    cs.onSurface.withOpacity(0.55),
                              ),
                            ),
                          ],
                        ),
                      ],
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
              ],
            ),
          ),
        ),

        // Badge
        if (_badge != null)
          Positioned(
            top: -10,
            left: 14,
            child: Container(
              height: 20,
              padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 0),
              decoration: BoxDecoration(
                color: _badgeColor(),
                borderRadius: BorderRadius.circular(100),
              ),
              child: Center(
                child: Text(
                  _badge!,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: cs.onPrimary,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
