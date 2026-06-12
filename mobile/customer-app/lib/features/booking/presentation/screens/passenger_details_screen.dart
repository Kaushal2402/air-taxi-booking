// 3.6 — Passenger Details Screen
// FlowStep indicator, P1 form (pre-filled from auth), P2..N forms (empty).

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_router.dart';
import '../../../../features/auth/domain/auth_provider.dart';
import '../../data/models/booking_models.dart';
import '../../domain/providers/booking_providers.dart';
import '../widgets/booking_widgets.dart';

class PassengerDetailsScreen extends ConsumerStatefulWidget {
  const PassengerDetailsScreen({super.key});

  @override
  ConsumerState<PassengerDetailsScreen> createState() =>
      _PassengerDetailsScreenState();
}

class _PassengerDetailsScreenState
    extends ConsumerState<PassengerDetailsScreen> {
  final _formKey = GlobalKey<FormState>();

  // Per-passenger field data (max 8 passengers supported)
  static const _maxPax = 8;
  late final List<TextEditingController> _nameCtrl;
  late final List<TextEditingController> _dobCtrl;
  late final List<TextEditingController> _idCtrl;
  late final List<String?> _idTypeValues;

  bool _p1PreFilled = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = List.generate(_maxPax, (_) => TextEditingController());
    _dobCtrl = List.generate(_maxPax, (_) => TextEditingController());
    _idCtrl = List.generate(_maxPax, (_) => TextEditingController());
    _idTypeValues = List.filled(_maxPax, null, growable: false);

    // Pre-populate from draft if passengers already set
    final draft = ref.read(bookingFlowProvider);
    for (int i = 0; i < draft.passengers.length && i < _maxPax; i++) {
      _nameCtrl[i].text = draft.passengers[i].fullName;
      _dobCtrl[i].text = draft.passengers[i].dateOfBirth ?? '';
      _idCtrl[i].text = draft.passengers[i].idNumber ?? '';
      _idTypeValues[i] = draft.passengers[i].idType;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _prefillP1();
    });
  }

  void _prefillP1() {
    if (!mounted) return;
    final authState = ref.read(authNotifierProvider).valueOrNull;
    final profile = authState?.profile;
    if (profile == null) return;

    final draft = ref.read(bookingFlowProvider);
    final p1Empty =
        draft.passengers.isEmpty || draft.passengers[0].fullName.isEmpty;

    if (p1Empty && _nameCtrl[0].text.isEmpty) {
      _nameCtrl[0].text = profile.name;
      ref.read(bookingFlowProvider.notifier).updatePassenger(
            0,
            PassengerInput(fullName: profile.name),
          );
      setState(() => _p1PreFilled = true);
    } else if (_nameCtrl[0].text.isNotEmpty) {
      setState(() => _p1PreFilled = true);
    }
  }

  @override
  void dispose() {
    for (final c in _nameCtrl) {
      c.dispose();
    }
    for (final c in _dobCtrl) {
      c.dispose();
    }
    for (final c in _idCtrl) {
      c.dispose();
    }
    super.dispose();
  }

  void _onReview() {
    if (!_formKey.currentState!.validate()) return;

    final draft = ref.read(bookingFlowProvider);
    final paxCount = draft.totalPassengers > 0 ? draft.totalPassengers : 1;

    // Save all passenger data
    for (int i = 0; i < paxCount && i < _maxPax; i++) {
      ref.read(bookingFlowProvider.notifier).updatePassenger(
            i,
            PassengerInput(
              fullName: _nameCtrl[i].text.trim(),
              dateOfBirth: _dobCtrl[i].text.trim().isNotEmpty
                  ? _dobCtrl[i].text.trim()
                  : null,
              idType: _idTypeValues[i],
              idNumber: _idCtrl[i].text.trim().isNotEmpty
                  ? _idCtrl[i].text.trim()
                  : null,
              isMinor: i > 0 && draft.childCount > 0,
            ),
          );
    }

    // Trigger fare estimate fetch
    final updatedDraft = ref.read(bookingFlowProvider);
    if (updatedDraft.routeId != null) {
      final date = updatedDraft.selectedDate != null
          ? DateFormat('yyyy-MM-dd').format(updatedDraft.selectedDate!)
          : DateFormat('yyyy-MM-dd').format(DateTime.now());
      ref.read(fareEstimateProvider.notifier).fetch(
            routeId: updatedDraft.routeId!,
            flightId: updatedDraft.selectedFlightId,
            date: date,
            paxCount: updatedDraft.totalPassengers,
            fareClass: updatedDraft.fareClass.name,
            seatCodes: updatedDraft.selectedSeats,
          );
    }

    context.push(AppRoutes.bookingSummary);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final draft = ref.watch(bookingFlowProvider);
    final paxCount = draft.totalPassengers > 0 ? draft.totalPassengers : 1;
    final clampedCount = paxCount.clamp(1, _maxPax).toInt();

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: cs.surfaceContainerLow,
        resizeToAvoidBottomInset: true,
        body: SafeArea(
          child: Column(
            children: [
              _SimpleNavBar(cs: cs, theme: theme, title: 'Passenger details'),
              const BookingFlowStep(currentStep: 1),
              Expanded(
                child: Form(
                  key: _formKey,
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsetsDirectional.fromSTEB(
                        18, 0, 18, 24),
                    itemCount: clampedCount + 1,
                    itemBuilder: (context, idx) {
                      if (idx < clampedCount) {
                        return Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                              0, 0, 0, 14),
                          child: _PassengerCard(
                            index: idx,
                            isP1: idx == 0,
                            isPreFilled: idx == 0 && _p1PreFilled,
                            nameController: _nameCtrl[idx],
                            dobController: _dobCtrl[idx],
                            idController: _idCtrl[idx],
                            idTypeValue: _idTypeValues[idx],
                            onIdTypeChanged: (v) =>
                                setState(() => _idTypeValues[idx] = v),
                            cs: cs,
                            theme: theme,
                          ),
                        );
                      }
                      // CTA at end
                      return BookingCTA(
                        label: 'Review booking',
                        onPressed: _onReview,
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Passenger card ────────────────────────────────────────────────────────────

class _PassengerCard extends StatelessWidget {
  const _PassengerCard({
    required this.index,
    required this.isP1,
    required this.isPreFilled,
    required this.nameController,
    required this.dobController,
    required this.idController,
    required this.idTypeValue,
    required this.onIdTypeChanged,
    required this.cs,
    required this.theme,
  });

  final int index;
  final bool isP1;
  final bool isPreFilled;
  final TextEditingController nameController;
  final TextEditingController dobController;
  final TextEditingController idController;
  final String? idTypeValue;
  final ValueChanged<String?> onIdTypeChanged;
  final ColorScheme cs;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isP1 ? cs.primary : cs.outline,
          width: isP1 ? 2.0 : 1.5,
        ),
        boxShadow: isP1
            ? [
                BoxShadow(
                  color: cs.primary.withOpacity(0.15),
                  blurRadius: 12,
                )
              ]
            : null,
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding:
                const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
            decoration: BoxDecoration(
              color: isP1
                  ? cs.primary.withOpacity(0.08)
                  : Colors.transparent,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(14),
              ),
              border: Border(
                bottom: BorderSide(
                  color: isP1
                      ? cs.primary.withOpacity(0.15)
                      : cs.outline.withOpacity(0.5),
                  width: 1,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: isP1
                            ? cs.primary
                            : cs.surfaceContainerHighest,
                        shape: BoxShape.circle,
                        border: isP1
                            ? null
                            : Border.all(
                                color: cs.outline,
                                width: 1.5,
                              ),
                      ),
                      child: Center(
                        child: Text(
                          'P${index + 1}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isP1
                                ? cs.onPrimary
                                : cs.onSurface.withOpacity(0.55),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Passenger ${index + 1}',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: isP1 ? cs.primary : cs.onSurface,
                      ),
                    ),
                  ],
                ),
                if (isP1 && isPreFilled)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.check_circle_outline_rounded,
                        size: 16,
                        color: cs.primary,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'From account',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: cs.primary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  )
                else if (!isP1)
                  Text(
                    'Required',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: cs.onSurface.withOpacity(0.38),
                    ),
                  ),
              ],
            ),
          ),

          // Fields
          Padding(
            padding:
                const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
            child: Column(
              children: [
                _ValidatedField(
                  label: 'Full name',
                  controller: nameController,
                  placeholder: 'Enter full name',
                  prefixIcon: Icons.person_outline_rounded,
                  validator: (v) {
                    if (v == null || v.trim().length < 2) {
                      return 'Full name is required (min 2 characters)';
                    }
                    return null;
                  },
                  cs: cs,
                ),
                const SizedBox(height: 10),
                BookingInputField(
                  label: 'Date of birth',
                  controller: dobController,
                  placeholder: 'DD MMM YYYY',
                  prefixIcon: Icons.calendar_today_rounded,
                  keyboardType: TextInputType.datetime,
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'ID Type',
                  ),
                  value: idTypeValue,
                  items: ['aadhar', 'passport', 'pan']
                      .map(
                        (t) => DropdownMenuItem(
                          value: t,
                          child: Text(t.toUpperCase()),
                        ),
                      )
                      .toList(),
                  validator: (v) => v == null ? 'Select ID type' : null,
                  onChanged: onIdTypeChanged,
                ),
                const SizedBox(height: 10),
                BookingInputField(
                  label: 'ID / Passport',
                  controller: idController,
                  placeholder: 'Aadhar / Passport no.',
                  prefixIcon: Icons.shield_outlined,
                  textInputAction: TextInputAction.next,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Validated field (for P1 name validation) ──────────────────────────────────

class _ValidatedField extends StatelessWidget {
  const _ValidatedField({
    required this.label,
    required this.controller,
    required this.placeholder,
    required this.prefixIcon,
    required this.validator,
    required this.cs,
  });

  final String label;
  final TextEditingController controller;
  final String placeholder;
  final IconData prefixIcon;
  final FormFieldValidator<String> validator;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: cs.onSurface.withOpacity(0.7),
            letterSpacing: -0.01,
          ),
        ),
        const SizedBox(height: 7),
        TextFormField(
          controller: controller,
          validator: validator,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            hintText: placeholder,
            prefixIcon: Icon(prefixIcon, size: 20,
                color: cs.onSurface.withOpacity(0.35)),
          ),
        ),
      ],
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
