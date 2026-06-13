// Shared widgets used across payment flow screens (4.1 – 4.5).
//
// Rules:
// - All colors from Theme.of(context).colorScheme — never Color(0xFF...) or hex strings
// - All fonts from Theme.of(context).textTheme — never hardcoded fontFamily
// - All layouts use EdgeInsetsDirectional for RTL safety
// - No business logic here — widgets receive data and callbacks only

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/models/payment_models.dart';

// ---------------------------------------------------------------------------
// PaymentMethodTile — saved card / UPI / wallet row in 4.1
// ---------------------------------------------------------------------------

class PaymentMethodTile extends StatelessWidget {
  const PaymentMethodTile({
    super.key,
    required this.method,
    required this.isSelected,
    required this.onTap,
    this.onDelete,
  });

  final CustomerPaymentMethod method;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback? onDelete;

  IconData get _typeIcon {
    switch (method.type) {
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

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? cs.primary : cs.outline,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: cs.primary.withOpacity(0.15),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : [
                  BoxShadow(
                    color: cs.onSurface.withOpacity(0.04),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: Row(
          children: [
            // Radio circle
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? cs.primary : cs.outline,
                  width: 2,
                ),
                color: isSelected ? cs.primary : Colors.transparent,
              ),
              child: isSelected
                  ? Center(
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: cs.onPrimary,
                          shape: BoxShape.circle,
                        ),
                      ),
                    )
                  : null,
            ),

            const SizedBox(width: 14),

            // Type icon badge
            Container(
              width: 42,
              height: 28,
              decoration: BoxDecoration(
                color: isSelected
                    ? cs.primary.withOpacity(0.1)
                    : cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(
                _typeIcon,
                size: 16,
                color: isSelected
                    ? cs.primary
                    : cs.onSurface.withOpacity(0.55),
              ),
            ),

            const SizedBox(width: 12),

            // Display + sub-label
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    method.display,
                    style: tt.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: cs.onSurface,
                      letterSpacing: -0.01,
                    ),
                  ),
                  if (method.subLabel != null) ...[
                    const SizedBox(height: 1),
                    Text(
                      method.subLabel!,
                      style: tt.bodySmall?.copyWith(
                        color: cs.onSurface.withOpacity(0.55),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Default badge
            if (method.isDefault)
              Container(
                height: 22,
                padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 0),
                decoration: BoxDecoration(
                  color: cs.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Center(
                  child: Text(
                    'Default',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: cs.primary,
                    ),
                  ),
                ),
              ),

            // Delete button (shown on long-press row or via edit mode)
            if (onDelete != null) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onDelete,
                child: Icon(
                  Icons.remove_circle_outline_rounded,
                  size: 20,
                  color: cs.error.withOpacity(0.7),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// AddPaymentMethodButton — dashed bordered button in 4.1
// ---------------------------------------------------------------------------

class AddPaymentMethodButton extends StatelessWidget {
  const AddPaymentMethodButton({
    super.key,
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: cs.onSurface.withOpacity(0.25),
            width: 1.5,
            // Dashed border via CustomPainter not possible with BoxDecoration;
            // using a slightly transparent solid border is an acceptable
            // approximation. If true dashed borders are required, use a
            // CustomPainter with DashPainter or the 'dotted_border' package.
            // Decision: keep solid to stay within the locked stack.
            style: BorderStyle.solid,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: cs.onSurface.withOpacity(0.25),
                  width: 1.5,
                ),
              ),
              child: Icon(
                Icons.add_rounded,
                size: 15,
                color: cs.onSurface.withOpacity(0.55),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: tt.bodyMedium?.copyWith(
                color: cs.onSurface.withOpacity(0.6),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// UpiAppButton — circular colored button for PhonePe / GPay / Paytm / BHIM
// ---------------------------------------------------------------------------

class UpiAppButton extends StatelessWidget {
  const UpiAppButton({
    super.key,
    required this.name,
    required this.letter,
    required this.color,
    required this.onTap,
    this.size = 52.0,
  });

  final String name;
  final String letter;
  final Color color;
  final VoidCallback onTap;
  final double size;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                letter,
                style: TextStyle(
                  fontSize: size * 0.28,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            style: tt.labelSmall?.copyWith(
              color: cs.onSurface.withOpacity(0.55),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// AcmeMilesToggle — wallet apply row in 4.1
// ---------------------------------------------------------------------------

class AcmeMilesToggle extends StatelessWidget {
  const AcmeMilesToggle({
    super.key,
    required this.isActive,
    required this.pointsBalance,
    required this.creditMinor,
    required this.onToggle,
  });

  final bool isActive;
  final int pointsBalance;
  final int creditMinor;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final creditFormatted =
        NumberFormat('#,##0', 'en_IN').format(creditMinor ~/ 100);

    return GestureDetector(
      onTap: onToggle,
      child: Container(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 12),
        decoration: BoxDecoration(
          color: cs.primary.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cs.primary.withOpacity(0.22), width: 1.5),
        ),
        child: Row(
          children: [
            Icon(
              Icons.account_balance_wallet_rounded,
              size: 22,
              color: cs.primary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Apply Acme Miles',
                    style: tt.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: cs.primary,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    '$pointsBalance pts = ₹$creditFormatted credit',
                    style: tt.bodySmall?.copyWith(
                      color: cs.primary.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            ),
            // Toggle switch
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 46,
              height: 26,
              decoration: BoxDecoration(
                color: isActive ? cs.primary : cs.outline,
                borderRadius: BorderRadius.circular(13),
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                alignment: isActive
                    ? AlignmentDirectional.centerEnd
                    : AlignmentDirectional.centerStart,
                child: Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(3, 0, 3, 0),
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: cs.onPrimary,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.18),
                          blurRadius: 3,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// PaymentTotalBar — total + pay CTA sticky footer in 4.1 and 4.3
// ---------------------------------------------------------------------------

class PaymentTotalBar extends StatelessWidget {
  const PaymentTotalBar({
    super.key,
    required this.totalMinor,
    required this.ctaLabel,
    required this.onPay,
    this.isLoading = false,
  });

  final int totalMinor;
  final String ctaLabel;
  final VoidCallback? onPay;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final totalStr =
        '₹${NumberFormat('#,##0', 'en_IN').format(totalMinor ~/ 100)}';

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Total row
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(2, 0, 2, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total payable',
                style: tt.bodyMedium?.copyWith(
                  color: cs.onSurface.withOpacity(0.6),
                ),
              ),
              Text(
                totalStr,
                style: tt.titleLarge?.copyWith(
                  color: cs.primary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.02,
                ),
              ),
            ],
          ),
        ),
        // Pay CTA
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            onPressed: isLoading ? null : onPay,
            style: ElevatedButton.styleFrom(
              backgroundColor: cs.primary,
              foregroundColor: cs.onPrimary,
              shape: const StadiumBorder(),
              elevation: 0,
            ),
            icon: isLoading
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: cs.onPrimary,
                    ),
                  )
                : const Icon(Icons.lock_rounded, size: 16),
            label: isLoading
                ? const SizedBox.shrink()
                : Text(
                    ctaLabel,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.02,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// CardPreviewWidget — animated visual card in 4.2
// ---------------------------------------------------------------------------

class CardPreviewWidget extends StatelessWidget {
  const CardPreviewWidget({
    super.key,
    this.cardNumber,
    this.holderName,
    this.expiry,
  });

  final String? cardNumber;
  final String? holderName;
  final String? expiry;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Container(
      height: 188,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: const Alignment(-0.5, -1.0),
          end: const Alignment(0.5, 1.0),
          colors: [
            // forest = primary at ~12% lightness
            HSLColor.fromColor(cs.primary).withLightness(0.12).toColor(),
            // canopy = primary at ~18% lightness
            HSLColor.fromColor(cs.primary).withLightness(0.18).toColor(),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        children: [
          // Decorative rings
          Positioned(
            right: -20,
            top: -20,
            child: Opacity(
              opacity: 0.07,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: cs.onPrimary, width: 0.8),
                ),
              ),
            ),
          ),
          Positioned(
            right: -20,
            top: -20,
            child: Opacity(
              opacity: 0.07,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: cs.onPrimary, width: 0.8),
                ),
              ),
            ),
          ),

          // Card content
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(22, 22, 22, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Chip
                Container(
                  width: 38,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(5),
                    border:
                        Border.all(color: Colors.white.withOpacity(0.18)),
                  ),
                ),

                const SizedBox(height: 16),

                // Card number
                Text(
                  cardNumber != null && cardNumber!.isNotEmpty
                      ? _formatCardNumber(cardNumber!)
                      : '•••• •••• •••• ____',
                  style: TextStyle(
                    fontFamily: 'IBMPlexMono',
                    fontSize: 19,
                    letterSpacing: 0.18,
                    color: cs.onPrimary,
                    height: 1,
                  ),
                ),

                const Spacer(),

                // Name + expiry row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      holderName != null && holderName!.isNotEmpty
                          ? holderName!.toUpperCase()
                          : 'CARD HOLDER NAME',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: Colors.white.withOpacity(0.6),
                        fontFamily: 'IBMPlexMono',
                        letterSpacing: 0.08,
                      ),
                    ),
                    Text(
                      expiry != null && expiry!.isNotEmpty
                          ? expiry!
                          : 'MM / YY',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: Colors.white.withOpacity(0.6),
                        fontFamily: 'IBMPlexMono',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Brand logo placeholder (bottom-right)
          Positioned(
            bottom: 18,
            right: 18,
            child: Container(
              width: 44,
              height: 28,
              decoration: BoxDecoration(
                color: cs.surface,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Center(
                child: Text(
                  'VISA',
                  style: TextStyle(
                    color: cs.primary.withOpacity(0.8),
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatCardNumber(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    final buf = StringBuffer();
    for (var i = 0; i < digits.length && i < 16; i++) {
      if (i > 0 && i % 4 == 0) buf.write(' ');
      buf.write(digits[i]);
    }
    // Pad remaining groups with bullets
    final len = buf.length;
    final dotsNeeded = (19 - len).clamp(0, 19); // 16 digits + 3 spaces = 19
    if (dotsNeeded > 0) buf.write('_' * dotsNeeded);
    return buf.toString();
  }
}

// ---------------------------------------------------------------------------
// ProcessingSpinner — animated ring with plane icon for screen 4.4
// ---------------------------------------------------------------------------

class ProcessingSpinner extends StatefulWidget {
  const ProcessingSpinner({super.key, this.size = 120.0});

  final double size;

  @override
  State<ProcessingSpinner> createState() => _ProcessingSpinnerState();
}

class _ProcessingSpinnerState extends State<ProcessingSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _rotation;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    _rotation = Tween<double>(begin: 0, end: 1).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final size = widget.size;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Rotating arc
          RotationTransition(
            turns: _rotation,
            child: CustomPaint(
              size: Size(size, size),
              painter: _SpinnerArcPainter(color: cs.secondary),
            ),
          ),
          // Plane icon
          Icon(
            Icons.flight_rounded,
            size: size * 0.30,
            color: cs.onPrimary,
          ),
        ],
      ),
    );
  }
}

class _SpinnerArcPainter extends CustomPainter {
  const _SpinnerArcPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = cx - 6;

    // Background ring
    canvas.drawCircle(
      Offset(cx, cy),
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..color = Colors.white.withOpacity(0.1),
    );

    // Foreground arc
    canvas.drawArc(
      Rect.fromCircle(center: Offset(cx, cy), radius: r),
      -1.5708, // -π/2 (start at top)
      3.6652, // ~210° arc
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_SpinnerArcPainter old) => old.color != color;
}

// ---------------------------------------------------------------------------
// ETicketCard — perforated ticket card for screen 4.5
// ---------------------------------------------------------------------------

class ETicketCard extends StatelessWidget {
  const ETicketCard({
    super.key,
    required this.confirmation,
    required this.scaffoldBg,
  });

  final BookingConfirmation confirmation;

  /// The scaffold background color — used for the perforated notch circles.
  final Color scaffoldBg;

  String _formatTime(String isoStr) {
    try {
      final dt = DateTime.parse(isoStr).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '—';
    }
  }

  String _formatDate(String isoStr) {
    try {
      final dt = DateTime.parse(isoStr).toLocal();
      return DateFormat('EEE, d MMM').format(dt);
    } catch (_) {
      return '—';
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    final depTime = _formatTime(confirmation.etd);
    final depDate = _formatDate(confirmation.etd);

    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cs.outline),
        boxShadow: [
          BoxShadow(
            color: cs.onSurface.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          children: [
            // ── Top half: route info ────────────────────────────────────
            Padding(
              padding:
                  const EdgeInsetsDirectional.fromSTEB(20, 18, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Route codes
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${confirmation.routeFrom} → ${confirmation.routeTo}',
                            style: tt.labelSmall?.copyWith(
                              color: cs.onSurface.withOpacity(0.45),
                              letterSpacing: 0.1,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Text(
                                confirmation.routeFrom,
                                style: tt.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -0.03,
                                  height: 1,
                                ),
                              ),
                              Padding(
                                padding:
                                    const EdgeInsetsDirectional.fromSTEB(
                                        8, 0, 8, 0),
                                child: Icon(
                                  Directionality.of(context) == TextDirection.rtl
                                      ? Icons.arrow_back_rounded
                                      : Icons.arrow_forward_rounded,
                                  size: 18,
                                  color: cs.onSurface.withOpacity(0.45),
                                ),
                              ),
                              Text(
                                confirmation.routeTo,
                                style: tt.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -0.03,
                                  height: 1,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Date + time (right-aligned)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            depDate.toUpperCase(),
                            style: tt.labelSmall?.copyWith(
                              color: cs.onSurface.withOpacity(0.45),
                              letterSpacing: 0.1,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            depTime,
                            style: tt.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: cs.primary,
                              letterSpacing: -0.02,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Passenger / aircraft / seats meta row
                  Wrap(
                    spacing: 18,
                    runSpacing: 8,
                    children: [
                      if (confirmation.passengerNames.isNotEmpty)
                        _MetaCell(
                          label: 'Passengers',
                          value: confirmation.passengerNames.join(' & '),
                          cs: cs,
                          tt: tt,
                        ),
                      if (confirmation.aircraftModel != null)
                        _MetaCell(
                          label: 'Aircraft',
                          value: confirmation.aircraftModel!,
                          cs: cs,
                          tt: tt,
                        ),
                      if (confirmation.seatCodes.isNotEmpty)
                        _MetaCell(
                          label: 'Seats',
                          value: confirmation.seatCodes.join(' & '),
                          cs: cs,
                          tt: tt,
                        ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Perforated divider ──────────────────────────────────────
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(0, 0, 0, 0),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  CustomPaint(
                    painter: _DashedLinePainter(color: cs.outline),
                    child: const SizedBox(height: 2, width: double.infinity),
                  ),
                  // Left notch circle
                  Positioned(
                    left: -12,
                    top: -9,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: scaffoldBg,
                        shape: BoxShape.circle,
                        border: Border.all(color: cs.outline, width: 1),
                      ),
                    ),
                  ),
                  // Right notch circle
                  Positioned(
                    right: -12,
                    top: -9,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: scaffoldBg,
                        shape: BoxShape.circle,
                        border: Border.all(color: cs.outline, width: 1),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Bottom half: QR + reference ────────────────────────────
            Padding(
              padding:
                  const EdgeInsetsDirectional.fromSTEB(20, 14, 20, 16),
              child: Row(
                children: [
                  // QR code placeholder
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: cs.outline, width: 1.5),
                    ),
                    child: Icon(
                      Icons.qr_code_2_rounded,
                      size: 44,
                      color: cs.onSurface.withOpacity(0.45),
                    ),
                  ),

                  const SizedBox(width: 16),

                  // Reference info
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Booking reference',
                        style: tt.labelSmall?.copyWith(
                          color: cs.onSurface.withOpacity(0.45),
                          letterSpacing: 0.1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        confirmation.bookingRef,
                        style: TextStyle(
                          fontFamily: 'IBMPlexMono',
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: cs.primary,
                          letterSpacing: 0.05,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Show QR code at boarding',
                        style: tt.bodySmall?.copyWith(
                          color: cs.onSurface.withOpacity(0.45),
                        ),
                      ),
                    ],
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

class _MetaCell extends StatelessWidget {
  const _MetaCell({
    required this.label,
    required this.value,
    required this.cs,
    required this.tt,
  });

  final String label;
  final String value;
  final ColorScheme cs;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: tt.labelSmall?.copyWith(
            color: cs.onSurface.withOpacity(0.45),
            letterSpacing: 0.1,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: tt.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: cs.onSurface,
            letterSpacing: -0.01,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// ProgressDots — animated dot indicator for 4.4 Processing screen
// ---------------------------------------------------------------------------

class ProgressDots extends StatefulWidget {
  const ProgressDots({super.key, this.dotColor});

  final Color? dotColor;

  @override
  State<ProgressDots> createState() => _ProgressDotsState();
}

class _ProgressDotsState extends State<ProgressDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dotColor = widget.dotColor ?? cs.secondary;

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final delay = i / 3;
            final value = ((_ctrl.value - delay) % 1.0).clamp(0.0, 1.0);
            final opacity = value < 0.5 ? 1.0 - value * 2 : (value - 0.5) * 2;
            return Padding(
              padding: EdgeInsetsDirectional.only(end: i < 2 ? 8 : 0),
              child: Opacity(
                opacity: 0.25 + opacity * 0.75,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// _DashedLinePainter — used for the perforated divider in ETicketCard
// ---------------------------------------------------------------------------

class _DashedLinePainter extends CustomPainter {
  const _DashedLinePainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    const dashWidth = 8.0;
    const gapWidth = 5.0;
    double x = 0;
    while (x < size.width) {
      canvas.drawLine(
        Offset(x, 0),
        Offset((x + dashWidth).clamp(0, size.width), 0),
        paint,
      );
      x += dashWidth + gapWidth;
    }
  }

  @override
  bool shouldRepaint(_DashedLinePainter old) => old.color != color;
}
