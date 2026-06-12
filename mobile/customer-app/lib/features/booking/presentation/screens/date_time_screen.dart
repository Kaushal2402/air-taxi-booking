// 3.2 — Date & Time Screen
// Route recap pill, calendar grid with month navigation, time slot chips.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_router.dart';
import '../../data/models/booking_models.dart';
import '../../domain/providers/booking_providers.dart';
import '../widgets/booking_widgets.dart';

class DateTimeScreen extends ConsumerStatefulWidget {
  const DateTimeScreen({super.key});

  @override
  ConsumerState<DateTimeScreen> createState() => _DateTimeScreenState();
}

class _DateTimeScreenState extends ConsumerState<DateTimeScreen> {
  late DateTime _viewMonth;
  DateTime? _selectedDate;
  AirFlight? _selectedFlight;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _viewMonth = DateTime(now.year, now.month);
    _selectedDate = null;
  }

  void _onDateTap(DateTime date) {
    if (!mounted) return;
    setState(() {
      _selectedDate = date;
      _selectedFlight = null;
    });
    final draft = ref.read(bookingFlowProvider);
    if (draft.routeId != null) {
      ref.read(availableFlightsProvider.notifier).fetch(
            routeId: draft.routeId!,
            date: DateFormat('yyyy-MM-dd').format(date),
          );
    }
  }

  void _onContinue() {
    if (_selectedDate == null || _selectedFlight == null) return;
    ref
        .read(bookingFlowProvider.notifier)
        .setDateAndFlight(date: _selectedDate!, flight: _selectedFlight!);
    context.push(AppRoutes.bookingPassengers);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final draft = ref.watch(bookingFlowProvider);
    final flightsAsync = ref.watch(availableFlightsProvider);

    final canContinue = _selectedDate != null && _selectedFlight != null;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: cs.surfaceContainerLow,
        resizeToAvoidBottomInset: true,
        body: SafeArea(
          child: Column(
            children: [
              // NavBar
              _NavBar(cs: cs, theme: theme, title: 'Date & time'),

              Expanded(
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 24),
                  children: [
                    // Route pill
                    Padding(
                      padding:
                          const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 16),
                      child: RoutePill(
                        originCode: draft.originCode ?? 'BOM',
                        destinationCode: draft.destinationCode ?? '?',
                      ),
                    ),

                    // Calendar card
                    Padding(
                      padding:
                          const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
                      child: _CalendarCard(
                        cs: cs,
                        theme: theme,
                        viewMonth: _viewMonth,
                        selectedDate: _selectedDate,
                        onPrevMonth: () => setState(() {
                          _viewMonth = DateTime(
                              _viewMonth.year, _viewMonth.month - 1);
                        }),
                        onNextMonth: () => setState(() {
                          _viewMonth = DateTime(
                              _viewMonth.year, _viewMonth.month + 1);
                        }),
                        onDateTap: _onDateTap,
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Time slots
                    if (_selectedDate != null) ...[
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                            18, 0, 18, 10),
                        child: Row(
                          children: [
                            Text(
                              'Available times',
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: cs.onSurface,
                                letterSpacing: -0.01,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '— ${DateFormat('EEE, MMM d').format(_selectedDate!)}',
                              style: TextStyle(
                                fontFamily: 'IBMPlexMono',
                                fontSize: 12,
                                color: cs.onSurface.withOpacity(0.55),
                              ),
                            ),
                          ],
                        ),
                      ),
                      _TimeSlots(
                        flightsAsync: flightsAsync,
                        selectedFlight: _selectedFlight,
                        cs: cs,
                        onSelect: (f) =>
                            setState(() => _selectedFlight = f),
                        onRetry: () {
                          final draft = ref.read(bookingFlowProvider);
                          if (draft.routeId != null &&
                              _selectedDate != null) {
                            ref
                                .read(availableFlightsProvider.notifier)
                                .fetch(
                                  routeId: draft.routeId!,
                                  date: DateFormat('yyyy-MM-dd')
                                      .format(_selectedDate!),
                                );
                          }
                        },
                      ),
                    ],
                  ],
                ),
              ),

              // CTA
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(18, 8, 18, 24),
                child: BookingCTA(
                  label: 'Continue',
                  onPressed: canContinue ? _onContinue : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── NavBar ────────────────────────────────────────────────────────────────────

class _NavBar extends StatelessWidget {
  const _NavBar({
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

// ── Calendar card ─────────────────────────────────────────────────────────────

class _CalendarCard extends StatelessWidget {
  const _CalendarCard({
    required this.cs,
    required this.theme,
    required this.viewMonth,
    required this.selectedDate,
    required this.onPrevMonth,
    required this.onNextMonth,
    required this.onDateTap,
  });

  final ColorScheme cs;
  final ThemeData theme;
  final DateTime viewMonth;
  final DateTime? selectedDate;
  final VoidCallback onPrevMonth;
  final VoidCallback onNextMonth;
  final ValueChanged<DateTime> onDateTap;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final todayNorm = DateTime(today.year, today.month, today.day);

    // First day of month weekday (1=Mon .. 7=Sun), convert to 0=Sun
    final firstDay =
        DateTime(viewMonth.year, viewMonth.month, 1);
    // Dart weekday: 1=Mon..7=Sun. We want Sun=0
    final startOffset = firstDay.weekday % 7; // Sun=0, Mon=1 ... Sat=6

    final daysInMonth =
        DateTime(viewMonth.year, viewMonth.month + 1, 0).day;

    // Build cell list: nulls for blanks + days
    final cells = <int?>[
      ...List.filled(startOffset, null),
      ...List.generate(daysInMonth, (i) => i + 1),
    ];
    while (cells.length % 7 != 0) {
      cells.add(null);
    }

    final monthLabel = DateFormat('MMMM').format(viewMonth);
    final yearLabel = DateFormat('yyyy').format(viewMonth);
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: cs.onSurface.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsetsDirectional.fromSTEB(16, 18, 16, 16),
      child: Column(
        children: [
          // Month nav
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _NavCircleBtn(
                icon: Icons.chevron_left_rounded,
                cs: cs,
                onTap: onPrevMonth,
              ),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '$monthLabel ',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontSize: 20,
                        fontWeight: FontWeight.w400,
                        color: cs.onSurface,
                        letterSpacing: -0.02,
                      ),
                    ),
                    TextSpan(
                      text: yearLabel,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontSize: 20,
                        fontWeight: FontWeight.w300,
                        fontStyle: FontStyle.italic,
                        color: cs.onSurface.withOpacity(0.55),
                        letterSpacing: -0.02,
                      ),
                    ),
                  ],
                ),
              ),
              _NavCircleBtn(
                icon: Icons.chevron_right_rounded,
                cs: cs,
                onTap: onNextMonth,
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Day headers
          Row(
            children: dayHeaders
                .map((d) => Expanded(
                      child: Text(
                        d,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'IBMPlexMono',
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                          color: cs.onSurface.withOpacity(0.38),
                        ),
                      ),
                    ))
                .toList(),
          ),

          const SizedBox(height: 4),

          // Date grid
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 7,
            childAspectRatio: 1,
            children: cells.map((d) {
              if (d == null) return const SizedBox.shrink();
              final date =
                  DateTime(viewMonth.year, viewMonth.month, d);
              final isPast = date.isBefore(todayNorm);
              final isToday = date.isAtSameMomentAs(todayNorm);
              final isSel = selectedDate != null &&
                  date.year == selectedDate!.year &&
                  date.month == selectedDate!.month &&
                  date.day == selectedDate!.day;

              Color bg = Colors.transparent;
              Color textColor = cs.onSurface;
              Color? borderColor;
              FontWeight fw = FontWeight.w400;

              if (isSel) {
                bg = cs.primary;
                textColor = cs.onPrimary;
                fw = FontWeight.w700;
              } else if (isToday) {
                bg = cs.primary.withOpacity(0.12);
                textColor = cs.primary;
                borderColor = cs.primary;
              } else if (isPast) {
                textColor = cs.onSurface.withOpacity(0.25);
              }

              return GestureDetector(
                onTap: isPast ? null : () => onDateTap(date),
                child: Center(
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: bg,
                      shape: BoxShape.circle,
                      border: borderColor != null
                          ? Border.all(color: borderColor, width: 1.5)
                          : null,
                    ),
                    child: Center(
                      child: Text(
                        '$d',
                        style: TextStyle(
                          fontFamily: 'IBMPlexMono',
                          fontSize: 13.5,
                          fontWeight: fw,
                          color: textColor,
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
    );
  }
}

class _NavCircleBtn extends StatelessWidget {
  const _NavCircleBtn({
    required this.icon,
    required this.cs,
    required this.onTap,
  });

  final IconData icon;
  final ColorScheme cs;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: cs.onSurface.withOpacity(0.7)),
      ),
    );
  }
}

// ── Time slot chips ───────────────────────────────────────────────────────────

class _TimeSlots extends StatelessWidget {
  const _TimeSlots({
    required this.flightsAsync,
    required this.selectedFlight,
    required this.cs,
    required this.onSelect,
    required this.onRetry,
  });

  final AsyncValue<List<AirFlight>> flightsAsync;
  final AirFlight? selectedFlight;
  final ColorScheme cs;
  final ValueChanged<AirFlight> onSelect;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return flightsAsync.when(
      loading: () => _buildShimmer(),
      error: (e, _) => _buildError(context),
      data: (flights) {
        if (flights.isEmpty) {
          return _buildEmpty(context);
        }
        return _buildChips(flights);
      },
    );
  }

  Widget _buildShimmer() {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: List.generate(
            5,
            (_) => Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(0, 0, 8, 0),
              child: Container(
                width: 72,
                height: 52,
                decoration: BoxDecoration(
                  color: cs.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 16),
      child: Column(
        children: [
          Icon(
            Icons.flight_off_rounded,
            size: 32,
            color: cs.onSurface.withOpacity(0.38),
          ),
          const SizedBox(height: 8),
          Text(
            'No flights available for this date',
            style: TextStyle(
              fontSize: 14,
              color: cs.onSurface.withOpacity(0.55),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Try another date',
            style: TextStyle(
              fontSize: 12.5,
              color: cs.onSurface.withOpacity(0.38),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 16),
      child: Row(
        children: [
          Icon(Icons.error_outline_rounded, color: cs.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Could not load flights',
              style: TextStyle(fontSize: 13, color: cs.error),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildChips(List<AirFlight> flights) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(18, 0, 18, 0),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: flights.map((f) {
            final isSelected = selectedFlight?.id == f.id;
            final depTime = _formatTime(f.departureTime);
            return Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(0, 0, 8, 0),
              child: GestureDetector(
                onTap: () => onSelect(f),
                child: Container(
                  width: 80,
                  height: 56,
                  decoration: BoxDecoration(
                    color: isSelected ? cs.primary : cs.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? Colors.transparent
                          : cs.outline,
                      width: 1.5,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: cs.primary.withOpacity(0.25),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            )
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        depTime,
                        style: TextStyle(
                          fontFamily: 'IBMPlexMono',
                          fontSize: 14,
                          fontWeight: isSelected
                              ? FontWeight.w700
                              : FontWeight.w500,
                          color: isSelected
                              ? cs.onPrimary
                              : cs.onSurface,
                          letterSpacing: 0.04,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${f.seatsAvailable} seats',
                        style: TextStyle(
                          fontFamily: 'IBMPlexMono',
                          fontSize: 10.5,
                          color: isSelected
                              ? cs.onPrimary.withOpacity(0.8)
                              : cs.onSurface.withOpacity(0.38),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  String _formatTime(String isoStr) {
    try {
      final dt = DateTime.parse(isoStr).toLocal();
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return isoStr.length >= 5 ? isoStr.substring(11, 16) : isoStr;
    }
  }
}
