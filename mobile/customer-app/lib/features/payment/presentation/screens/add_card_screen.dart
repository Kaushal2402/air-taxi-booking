// 4.2 — Add Card Screen
//
// Presents a card preview that updates as the user types, plus:
//   - Card number field (formatted with spaces)
//   - Name on card field
//   - Expiry date field (MM/YY format)
//   - CVV field (masked)
//   - "Save for future payments" toggle
//   - "Add card & pay ₹XX,XXX" CTA
//
// When submitted:
//   1. App calls Razorpay SDK to tokenize the card (PCI-DSS: raw PAN never
//      leaves the device via our code — Razorpay handles it).
//   2. On SDK success, calls PaymentService.addCard with the token.
//   3. Navigates to ProcessingScreen.
//
// If the Razorpay SDK is not yet configured (UnimplementedError stub),
// the CTA shows an informational snackbar rather than crashing.
//
// No business logic here — validation is client-side format-only;
// final server validation happens at confirm.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../widgets/payment_widgets.dart';

class AddCardScreen extends ConsumerStatefulWidget {
  const AddCardScreen({
    super.key,
    required this.fareAmountMinor,
    required this.estimateRef,
  });

  final int fareAmountMinor;
  final String estimateRef;

  @override
  ConsumerState<AddCardScreen> createState() => _AddCardScreenState();
}

class _AddCardScreenState extends ConsumerState<AddCardScreen> {
  final _formKey = GlobalKey<FormState>();

  final _cardNumberCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _expiryCtrl = TextEditingController();
  final _cvvCtrl = TextEditingController();

  bool _saveCard = true;
  bool _isSubmitting = false;

  // Live preview state (updated on field change)
  String? _previewCardNumber;
  String? _previewName;
  String? _previewExpiry;

  @override
  void dispose() {
    _cardNumberCtrl.dispose();
    _nameCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    super.dispose();
  }

  String _formatCardInput(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    final buf = StringBuffer();
    for (var i = 0; i < digits.length && i < 16; i++) {
      if (i > 0 && i % 4 == 0) buf.write(' ');
      buf.write(digits[i]);
    }
    return buf.toString();
  }

  String _formatExpiry(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 3) {
      return '${digits.substring(0, 2)} / ${digits.substring(2, digits.length.clamp(2, 4))}';
    } else if (digits.length == 2) {
      return '$digits / ';
    }
    return digits;
  }

  bool get _formValid {
    final rawNumber =
        _cardNumberCtrl.text.replaceAll(RegExp(r'\D'), '');
    return rawNumber.length == 16 &&
        _nameCtrl.text.trim().length >= 2 &&
        _expiryCtrl.text.replaceAll(RegExp(r'\D'), '').length == 4 &&
        _cvvCtrl.text.length >= 3;
  }

  Future<void> _onAddCardAndPay() async {
    if (!_formValid || _isSubmitting) return;
    setState(() => _isSubmitting = true);

    // In production: open Razorpay SDK card form here to tokenize.
    // Since backend is not yet live, we show an informational message
    // and navigate to ProcessingScreen with a null method ID (stub mode).
    try {
      // TODO(backend): replace with Razorpay.openCheckout({...card params...})
      // and call PaymentService.addCard(razorpayToken, _saveCard)
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'Card tokenization requires Razorpay SDK — backend pending.',
          ),
          backgroundColor: Theme.of(context).colorScheme.primary,
        ),
      );
      // Navigate to ProcessingScreen anyway (stub flow)
      context.push(AppRoutes.paymentProcessing, extra: {
        'fareAmountMinor': widget.fareAmountMinor,
        'estimateRef': widget.estimateRef,
        'paymentMethodId': null, // will be resolved once backend exists
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final totalStr =
        (widget.fareAmountMinor ~/ 100).toString().replaceAllMapped(
              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
              (m) => '${m[1]},',
            );

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
                      'Add card',
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

            Expanded(
              child: SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding:
                    const EdgeInsetsDirectional.fromSTEB(18, 8, 18, 0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Card preview
                      CardPreviewWidget(
                        cardNumber: _previewCardNumber,
                        holderName: _previewName,
                        expiry: _previewExpiry,
                      ),

                      const SizedBox(height: 20),

                      // Card number
                      _FieldLabel(label: 'Card number', cs: cs, tt: tt),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _cardNumberCtrl,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(16),
                        ],
                        decoration: InputDecoration(
                          hintText: '•••• •••• •••• ••••',
                          prefixIcon: Icon(Icons.credit_card_rounded,
                              color: cs.onSurface.withOpacity(0.35)),
                        ),
                        onChanged: (v) {
                          final formatted = _formatCardInput(v);
                          if (formatted != _cardNumberCtrl.text) {
                            _cardNumberCtrl.value = TextEditingValue(
                              text: formatted,
                              selection: TextSelection.collapsed(
                                  offset: formatted.length),
                            );
                          }
                          setState(() => _previewCardNumber =
                              v.replaceAll(RegExp(r'\D'), ''));
                        },
                      ),

                      const SizedBox(height: 16),

                      // Name on card
                      _FieldLabel(label: 'Name on card', cs: cs, tt: tt),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _nameCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: 'PRIYA SHARMA',
                          prefixIcon: Icon(Icons.person_outline_rounded,
                              color: cs.onSurface.withOpacity(0.35)),
                        ),
                        onChanged: (v) => setState(() => _previewName = v),
                      ),

                      const SizedBox(height: 16),

                      // Expiry + CVV row
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _FieldLabel(
                                    label: 'Expiry date', cs: cs, tt: tt),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: _expiryCtrl,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                    LengthLimitingTextInputFormatter(4),
                                  ],
                                  decoration: const InputDecoration(
                                    hintText: 'MM / YY',
                                  ),
                                  onChanged: (v) {
                                    final formatted = _formatExpiry(v);
                                    setState(
                                        () => _previewExpiry = formatted);
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _FieldLabel(label: 'CVV', cs: cs, tt: tt),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: _cvvCtrl,
                                  keyboardType: TextInputType.number,
                                  obscureText: true,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                    LengthLimitingTextInputFormatter(4),
                                  ],
                                  decoration: InputDecoration(
                                    hintText: '•••',
                                    prefixIcon: Icon(Icons.lock_rounded,
                                        color:
                                            cs.onSurface.withOpacity(0.35)),
                                  ),
                                  onChanged: (_) => setState(() {}),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Save for future toggle
                      Container(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                            14, 10, 14, 10),
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
                                    'Save for future payments',
                                    style: tt.bodyMedium?.copyWith(
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Encrypted & stored securely',
                                    style: tt.bodySmall?.copyWith(
                                      color:
                                          cs.onSurface.withOpacity(0.45),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: _saveCard,
                              activeColor: cs.primary,
                              onChanged: (v) => setState(() => _saveCard = v),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Add card & pay CTA
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed:
                              (_formValid && !_isSubmitting)
                                  ? _onAddCardAndPay
                                  : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: cs.primary,
                            foregroundColor: cs.onPrimary,
                            shape: const StadiumBorder(),
                            elevation: 0,
                          ),
                          child: _isSubmitting
                              ? SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: cs.onPrimary,
                                  ),
                                )
                              : Text(
                                  'Add card & pay ₹$totalStr',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: -0.02,
                                  ),
                                ),
                        ),
                      ),

                      const SizedBox(height: 36),
                    ],
                  ),
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

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({
    required this.label,
    required this.cs,
    required this.tt,
  });
  final String label;
  final ColorScheme cs;
  final TextTheme tt;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: tt.bodySmall?.copyWith(
        fontWeight: FontWeight.w500,
        color: cs.onSurface.withOpacity(0.7),
      ),
    );
  }
}
