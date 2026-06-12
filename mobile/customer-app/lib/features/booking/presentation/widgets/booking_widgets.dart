// Shared widgets used across booking flow screens (3.1 – 3.7).
// All colors come from Theme.of(context).colorScheme — no hardcoded hex.
// All layouts use EdgeInsetsDirectional for RTL safety.

import 'package:flutter/material.dart';

// ---------------------------------------------------------------------------
// Route summary pill (forest dark background) — used on screens 3.2, 3.3, 3.4
// ---------------------------------------------------------------------------

class RoutePill extends StatelessWidget {
  const RoutePill({
    super.key,
    required this.originCode,
    required this.destinationCode,
    this.subtitle,
  });

  final String originCode;
  final String destinationCode;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(14, 0, 14, 0),
      height: 34,
      decoration: BoxDecoration(
        color: cs.primary.withOpacity(0.18),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: cs.primary.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.flight_takeoff_rounded, size: 14, color: cs.primary),
          const SizedBox(width: 6),
          Text(
            '$originCode → $destinationCode'
            '${subtitle != null ? ' · $subtitle' : ''}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: cs.onSurface,
              letterSpacing: -0.01,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Booking flow step indicator (Seats → Details → Payment)
// ---------------------------------------------------------------------------

class BookingFlowStep extends StatelessWidget {
  const BookingFlowStep({
    super.key,
    this.steps = const ['Seats', 'Details', 'Payment'],
    required this.currentStep,
  });

  final List<String> steps;
  final int currentStep; // 0-indexed

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(24, 10, 24, 14),
      child: Row(
        children: [
          for (int i = 0; i < steps.length; i++) ...[
            _StepDot(
              index: i,
              label: steps[i],
              isDone: i < currentStep,
              isCurrent: i == currentStep,
              cs: cs,
              tt: tt,
            ),
            if (i < steps.length - 1)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsetsDirectional.only(bottom: 18),
                  color: i < currentStep ? cs.primary : cs.outline,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({
    required this.index,
    required this.label,
    required this.isDone,
    required this.isCurrent,
    required this.cs,
    required this.tt,
  });

  final int index;
  final String label;
  final bool isDone;
  final bool isCurrent;
  final ColorScheme cs;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    final Color dotBg = isDone
        ? cs.primary
        : isCurrent
            ? cs.primary.withOpacity(0.18)
            : cs.surfaceContainerHighest;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: dotBg,
            shape: BoxShape.circle,
            border: (!isDone && !isCurrent)
                ? Border.all(color: cs.outline, width: 1.5)
                : null,
          ),
          child: Center(
            child: isDone
                ? Icon(Icons.check_rounded, size: 14, color: cs.onPrimary)
                : Text(
                    '${index + 1}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isCurrent ? cs.primary : cs.outline,
                      fontFamily: 'IBMPlexMono',
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
            color: isCurrent
                ? cs.onSurface
                : isDone
                    ? cs.primary
                    : cs.outline,
            fontFamily: 'IBMPlexMono',
            letterSpacing: 0.06,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Primary CTA button — full-width pill, 56px tall
// ---------------------------------------------------------------------------

class BookingCTA extends StatelessWidget {
  const BookingCTA({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.trailingIcon = Icons.arrow_forward_rounded,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData trailingIcon;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: cs.primary,
          foregroundColor: cs.onPrimary,
          shape: const StadiumBorder(),
          elevation: 0,
        ),
        child: isLoading
            ? SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: cs.onPrimary,
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.02,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(trailingIcon, size: 18),
                ],
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Passenger stepper row (used in screen 3.3)
// ---------------------------------------------------------------------------

class PassengerStepperRow extends StatelessWidget {
  const PassengerStepperRow({
    super.key,
    required this.label,
    required this.subLabel,
    required this.count,
    required this.onDecrement,
    required this.onIncrement,
    this.minCount = 0,
    this.maxCount = 6,
  });

  final String label;
  final String subLabel;
  final int count;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final int minCount;
  final int maxCount;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 18, vertical: 16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    color: cs.onSurface,
                    letterSpacing: -0.01,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subLabel,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: cs.onSurface.withOpacity(0.55),
                  ),
                ),
              ],
            ),
          ),
          _StepperButton(
            icon: Icons.remove_rounded,
            onTap: count > minCount ? onDecrement : null,
            cs: cs,
          ),
          SizedBox(
            width: 44,
            child: Text(
              '$count',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: count > 0 ? cs.onSurface : cs.onSurface.withOpacity(0.38),
                fontFamily: 'IBMPlexMono',
                letterSpacing: -0.02,
              ),
            ),
          ),
          _StepperButton(
            icon: Icons.add_rounded,
            onTap: count < maxCount ? onIncrement : null,
            cs: cs,
            isPrimary: true,
          ),
        ],
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  const _StepperButton({
    required this.icon,
    required this.onTap,
    required this.cs,
    this.isPrimary = false,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final ColorScheme cs;
  final bool isPrimary;

  @override
  Widget build(BuildContext context) {
    final Color bg = onTap == null
        ? cs.surfaceContainerHighest.withOpacity(0.5)
        : isPrimary
            ? cs.primary
            : cs.surfaceContainerHighest;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: Icon(
          icon,
          size: 16,
          color: onTap == null
              ? cs.onSurface.withOpacity(0.25)
              : isPrimary
                  ? cs.onPrimary
                  : cs.onSurface.withOpacity(0.7),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Labelled text input field (used in 3.6 passenger details)
// ---------------------------------------------------------------------------

class BookingInputField extends StatelessWidget {
  const BookingInputField({
    super.key,
    required this.label,
    this.controller,
    this.initialValue,
    this.placeholder,
    this.prefixIcon,
    this.isFocused = false,
    this.onChanged,
    this.keyboardType,
    this.textInputAction,
  }) : assert(
          controller == null || initialValue == null,
          'Cannot supply both a controller and an initialValue.',
        );

  final String label;
  final TextEditingController? controller;
  final String? initialValue;
  final String? placeholder;
  final IconData? prefixIcon;
  final bool isFocused;
  final ValueChanged<String>? onChanged;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
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
          initialValue: controller == null ? initialValue : null,
          onChanged: onChanged,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          decoration: InputDecoration(
            hintText: placeholder,
            prefixIcon: prefixIcon != null
                ? Icon(prefixIcon, size: 20,
                    color: cs.onSurface.withOpacity(0.35))
                : null,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Seat tile (used in screen 3.5)
// ---------------------------------------------------------------------------

class SeatTile extends StatelessWidget {
  const SeatTile({
    super.key,
    required this.seatCode,
    required this.isOccupied,
    required this.isSelected,
    this.passengerLabel,
    required this.onTap,
  });

  final String seatCode;
  final bool isOccupied;
  final bool isSelected;
  final String? passengerLabel; // "P1", "P2" if selected
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    final Color bg = isSelected
        ? cs.primary
        : isOccupied
            ? cs.surfaceContainerHighest
            : cs.surface;

    final Color borderColor =
        isSelected || (!isOccupied) ? cs.primary : cs.outline;

    final Color textColor = isSelected
        ? cs.onPrimary
        : isOccupied
            ? cs.onSurface.withOpacity(0.25)
            : cs.primary;

    return GestureDetector(
      onTap: isOccupied ? null : onTap,
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              seatCode,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                color: textColor,
                fontFamily: 'IBMPlexMono',
                letterSpacing: 0.04,
              ),
            ),
            if (passengerLabel != null) ...[
              const SizedBox(height: 3),
              Text(
                passengerLabel!,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: textColor,
                  fontFamily: 'IBMPlexMono',
                ),
              ),
            ],
            if (isOccupied && passengerLabel == null)
              Container(
                width: 28,
                height: 3,
                margin: const EdgeInsetsDirectional.only(top: 3),
                decoration: BoxDecoration(
                  color: cs.onSurface.withOpacity(0.20),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fare breakdown row (used in screen 3.7)
// ---------------------------------------------------------------------------

class FareRow extends StatelessWidget {
  const FareRow({
    super.key,
    required this.label,
    required this.amountMinor,
    this.isTotal = false,
    this.currency = '₹', // ₹
  });

  final String label;
  final int amountMinor;
  final bool isTotal;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final amount = (amountMinor / 100).toStringAsFixed(0);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 15 : 13.5,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w400,
            color: isTotal ? cs.onSurface : cs.onSurface.withOpacity(0.7),
          ),
        ),
        Text(
          '$currency$amount',
          style: TextStyle(
            fontSize: isTotal ? 22 : 13.5,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w500,
            color: isTotal ? cs.primary : cs.onSurface,
            fontFamily: 'IBMPlexMono',
            letterSpacing: isTotal ? -0.025 : 0,
          ),
        ),
      ],
    );
  }
}
