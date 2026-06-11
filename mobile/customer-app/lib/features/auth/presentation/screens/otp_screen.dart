import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';
import '../../../../features/auth/domain/auth_provider.dart';

// SCREEN 1.4 — OTP Verification
// 6-box OTP entry, 60-second countdown, resend button, security disclaimer.

class OtpScreen extends ConsumerStatefulWidget {
  final String phone;

  const OtpScreen({required this.phone, super.key});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _digits = List.filled(6, '');
  final _controllers = List.generate(6, (_) => TextEditingController());
  final _focusNodes = List.generate(6, (_) => FocusNode());

  Timer? _timer;
  int _secondsLeft = 60;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _secondsLeft = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft <= 1) {
        t.cancel();
        if (mounted) setState(() => _secondsLeft = 0);
      } else {
        if (mounted) setState(() => _secondsLeft--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String _formatTime(int secs) {
    final m = (secs ~/ 60).toString().padLeft(2, '0');
    final s = (secs % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void _onDigitChanged(int index, String value) {
    if (value.length > 1) value = value[value.length - 1];
    setState(() => _digits[index] = value);

    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    // Auto-verify when all 6 filled
    if (_digits.every((d) => d.isNotEmpty)) {
      _verifyOtp();
    }
  }

  void _onKeyEvent(int index, RawKeyEvent event) {
    if (event is RawKeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.backspace &&
        _digits[index].isEmpty &&
        index > 0) {
      _focusNodes[index - 1].requestFocus();
      setState(() => _digits[index - 1] = '');
      _controllers[index - 1].clear();
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _digits.join();
    if (otp.length < 6) {
      setState(() => _error = 'Please enter the complete 6-digit code.');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await ref.read(authNotifierProvider.notifier).verifyOtp(
        phone: widget.phone,
        otp: otp,
      );
      if (mounted) context.go(AppRoutes.profileSetup);
    } catch (e) {
      setState(() {
        _error = e is UnimplementedError
            ? 'OTP verification is not yet available. Please try again later.'
            : e.toString();
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ??
        AppBrandConfig.fallback();

    return Scaffold(
      backgroundColor: cs.surface,
      body: SafeArea(
        child: Column(
          children: [
            // NavBar
            Padding(
              padding: const EdgeInsetsDirectional.symmetric(
                horizontal: 8,
                vertical: 4,
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: Icon(
                      Icons.arrow_back_ios_new,
                      color: cs.onSurface,
                    ),
                  ),
                ],
              ),
            ),
            // Body
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsetsDirectional.fromSTEB(28, 20, 28, 48),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Phone icon circle
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: brand.mint,
                        border: Border.all(
                          color: cs.primary.withOpacity(0.2),
                          width: 1.5,
                        ),
                      ),
                      child: Center(
                        child: Icon(
                          Icons.phone_outlined,
                          size: 34,
                          color: cs.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 26),
                    Text(
                      'Verify your\nnumber.',
                      style: theme.textTheme.displaySmall?.copyWith(
                        fontSize: 34,
                        fontWeight: FontWeight.w400,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'We sent a 6-digit code to ',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: cs.onSurface.withOpacity(0.55),
                              height: 1.6,
                            ),
                          ),
                          TextSpan(
                            text: widget.phone,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: cs.onSurface.withOpacity(0.75),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    // OTP boxes
                    _OtpBoxRow(
                      digits: _digits,
                      controllers: _controllers,
                      focusNodes: _focusNodes,
                      onChanged: _onDigitChanged,
                      onKeyEvent: _onKeyEvent,
                      cs: cs,
                      brand: brand,
                    ),
                    const SizedBox(height: 32),
                    // Verify button
                    ElevatedButton(
                      onPressed: _isLoading ? null : _verifyOtp,
                      child: _isLoading
                          ? SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: cs.onPrimary,
                              ),
                            )
                          : const Text('Verify →'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: cs.error,
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: 22),
                    // Timer / resend
                    Center(
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: 'Resend code in ',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: cs.onSurface.withOpacity(0.55),
                                fontSize: 14,
                              ),
                            ),
                            TextSpan(
                              text: _formatTime(_secondsLeft),
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: cs.onSurface.withOpacity(0.75),
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Center(
                      child: TextButton(
                        onPressed: _secondsLeft == 0 ? _startTimer : null,
                        child: Text(
                          'Use email instead',
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: _secondsLeft == 0
                                ? cs.primary
                                : cs.onSurface.withOpacity(0.38),
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    // Security disclaimer
                    Container(
                      padding: const EdgeInsetsDirectional.all(16),
                      decoration: BoxDecoration(
                        color: cs.onSurface.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.shield_outlined,
                            size: 18,
                            color: cs.onSurface.withOpacity(0.55),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Never share this code with anyone. '
                              'Acme Mobility will never ask for it.',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: cs.onSurface.withOpacity(0.55),
                                fontSize: 13,
                                height: 1.55,
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
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// OTP box row
// ---------------------------------------------------------------------------

class _OtpBoxRow extends StatelessWidget {
  final List<String> digits;
  final List<TextEditingController> controllers;
  final List<FocusNode> focusNodes;
  final void Function(int, String) onChanged;
  final void Function(int, RawKeyEvent) onKeyEvent;
  final ColorScheme cs;
  final AppBrandConfig brand;

  const _OtpBoxRow({
    required this.digits,
    required this.controllers,
    required this.focusNodes,
    required this.onChanged,
    required this.onKeyEvent,
    required this.cs,
    required this.brand,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(6, (i) {
        final isCurrent = focusNodes[i].hasFocus;
        final isFilled = digits[i].isNotEmpty;

        return Expanded(
          child: Padding(
            padding: EdgeInsetsDirectional.only(end: i < 5 ? 10 : 0),
            child: RawKeyboardListener(
              focusNode: FocusNode(),
              onKey: (e) => onKeyEvent(i, e),
              child: SizedBox(
                height: 64,
                child: TextFormField(
                  controller: controllers[i],
                  focusNode: focusNodes[i],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: (v) => onChanged(i, v),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 30,
                    fontWeight: FontWeight.w500,
                    color: cs.onSurface,
                  ),
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: isCurrent ? brand.mint : cs.surface,
                    contentPadding: EdgeInsets.zero,
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(
                        color: isFilled
                            ? cs.onSurface.withOpacity(0.22)
                            : cs.onSurface.withOpacity(0.14),
                        width: 2,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(
                        color: cs.primary,
                        width: 2,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}
