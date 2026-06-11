import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';
import '../../../../features/auth/domain/auth_provider.dart';
import '../widgets/mobile_input_field.dart';

// SCREEN 1.7 — Forgot Password
// Lock icon circle, email field, "Send reset link" CTA,
// navigates to reset-sent screen on success.

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState
    extends ConsumerState<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _onSend() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _errorMsg = 'Please enter your email address.');
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    try {
      await ref
          .read(authNotifierProvider.notifier)
          .forgotPassword(email);
      if (mounted) {
        context.go(
          '${AppRoutes.resetSent}?email=${Uri.encodeComponent(email)}',
        );
      }
    } catch (e) {
      setState(() {
        _errorMsg = e is UnimplementedError
            ? 'Password reset is not yet available. Please try again later.'
            : e.toString();
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brand =
        ref.watch(brandingNotifierProvider).valueOrNull ??
        AppBrandConfig.fallback();
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

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
              child: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(28, 16, 28, 48),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Lock icon circle
                    Container(
                      width: 80,
                      height: 80,
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
                          Icons.lock_outline,
                          size: 36,
                          color: cs.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      'Forgot your\npassword?',
                      style: theme.textTheme.displaySmall?.copyWith(
                        fontSize: 34,
                        fontWeight: FontWeight.w400,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No worries. Enter your email address and we\'ll send a '
                      'secure reset link valid for 15 minutes.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: cs.onSurface.withOpacity(0.55),
                        fontSize: 15,
                        height: 1.65,
                      ),
                    ),
                    const SizedBox(height: 32),
                    MobileInputField(
                      label: 'Email address',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                      hintText: 'you@example.com',
                    ),
                    if (_errorMsg != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _errorMsg!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: cs.error,
                          fontSize: 13,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _onSend,
                      child: _isLoading
                          ? SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: cs.onPrimary,
                              ),
                            )
                          : const Text('Send reset link'),
                    ),
                    const Spacer(),
                    // Back to sign in
                    Center(
                      child: TextButton.icon(
                        onPressed: () => context.pop(),
                        icon: const Icon(Icons.arrow_back, size: 16),
                        label: const Text('Back to sign in'),
                        style: TextButton.styleFrom(
                          foregroundColor: cs.onSurface.withOpacity(0.75),
                          textStyle: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                            fontSize: 15,
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
    );
  }
}
