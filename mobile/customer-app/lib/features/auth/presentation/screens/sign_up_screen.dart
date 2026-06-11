import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';
import '../../../../features/auth/domain/auth_provider.dart';
import '../widgets/mobile_input_field.dart';
import '../widgets/password_strength_bar.dart';
import '../widgets/forest_header.dart';

// SCREEN 1.5 — Sign Up
// Forest gradient header, registration form with password strength bar,
// terms checkbox, "Create account" CTA.

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _termsAccepted = false;
  bool _showPassword = false;
  bool _isLoading = false;
  String? _errorMsg;
  String _passwordValue = '';

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(() {
      setState(() => _passwordValue = _passwordController.text);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onRegister() async {
    if (!_termsAccepted) {
      setState(
        () => _errorMsg = 'Please accept the Terms of Service and Privacy Policy.',
      );
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    try {
      await ref.read(authNotifierProvider.notifier).signUp(
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (mounted) {
        context.go(
          '${AppRoutes.otp}?phone=${Uri.encodeComponent(_phoneController.text.trim())}',
        );
      }
    } catch (e) {
      setState(() {
        _errorMsg = e is UnimplementedError
            ? 'Registration is not yet available. Please try again later.'
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
      // ignore: deprecated_member_use
      backgroundColor: theme.colorScheme.background,
      body: Column(
        children: [
          // Forest header
          ForestHeader(
            navBar: _SignUpNavBar(cs: cs),
            monoLabel: 'New account',
            heading: 'Join Acme',
            headingItalicSuffix: 'Mobility.',
          ),
          // Form card
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(top: -24),
              decoration: BoxDecoration(
                color: cs.surface,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.45),
                    blurRadius: 56,
                    offset: const Offset(0, -28),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsetsDirectional.fromSTEB(28, 28, 28, 36),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MobileInputField(
                      label: 'Full name',
                      controller: _nameController,
                      prefixIcon: Icons.person_outline,
                      hintText: 'Jane Smith',
                    ),
                    const SizedBox(height: 16),
                    MobileInputField(
                      label: 'Email address',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                      hintText: 'you@example.com',
                    ),
                    const SizedBox(height: 16),
                    MobileInputField(
                      label: 'Mobile number',
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      prefixIcon: Icons.phone_outlined,
                      hintText: '+1 555 0100',
                    ),
                    const SizedBox(height: 16),
                    MobileInputField(
                      label: 'Password',
                      controller: _passwordController,
                      obscureText: !_showPassword,
                      prefixIcon: Icons.lock_outline,
                      hintText: '8+ characters',
                      suffix: GestureDetector(
                        onTap: () =>
                            setState(() => _showPassword = !_showPassword),
                        child: Icon(
                          _showPassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          size: 20,
                          color: cs.onSurface.withOpacity(0.38),
                        ),
                      ),
                    ),
                    if (_passwordValue.isNotEmpty)
                      PasswordStrengthBar(password: _passwordValue),
                    const SizedBox(height: 20),
                    // Terms checkbox
                    _TermsRow(
                      accepted: _termsAccepted,
                      cs: cs,
                      theme: theme,
                      onToggle: (v) => setState(() => _termsAccepted = v),
                    ),
                    const SizedBox(height: 20),
                    if (_errorMsg != null) ...[
                      Text(
                        _errorMsg!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: cs.error,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    ElevatedButton(
                      onPressed: _isLoading ? null : _onRegister,
                      child: _isLoading
                          ? SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: cs.onPrimary,
                              ),
                            )
                          : const Text('Create account'),
                    ),
                    const SizedBox(height: 18),
                    Center(
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: 'Already registered? ',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: cs.onSurface.withOpacity(0.55),
                                fontSize: 14.5,
                              ),
                            ),
                            WidgetSpan(
                              child: GestureDetector(
                                onTap: () => context.go(AppRoutes.signIn),
                                child: Text(
                                  'Sign in',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: cs.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14.5,
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
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

class _SignUpNavBar extends StatelessWidget {
  final ColorScheme cs;

  const _SignUpNavBar({required this.cs});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: 8,
          vertical: 4,
        ),
        child: Row(
          children: [
            IconButton(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
            ),
            const Spacer(),
            TextButton(
              onPressed: () => context.go(AppRoutes.signIn),
              style: TextButton.styleFrom(
                foregroundColor: Colors.white.withOpacity(0.65),
              ),
              child: const Text('Sign in'),
            ),
          ],
        ),
      ),
    );
  }
}

class _TermsRow extends StatelessWidget {
  final bool accepted;
  final ColorScheme cs;
  final ThemeData theme;
  final ValueChanged<bool> onToggle;

  const _TermsRow({
    required this.accepted,
    required this.cs,
    required this.theme,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onToggle(!accepted),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Custom checkbox
          Container(
            width: 22,
            height: 22,
            margin: const EdgeInsetsDirectional.only(top: 1),
            decoration: BoxDecoration(
              color: accepted ? cs.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(6),
              border: accepted
                  ? null
                  : Border.all(
                      color: cs.onSurface.withOpacity(0.38),
                      width: 1.5,
                    ),
            ),
            child: accepted
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'I agree to the ',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.75),
                      fontSize: 13.5,
                      height: 1.55,
                    ),
                  ),
                  TextSpan(
                    text: 'Terms of Service',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.primary,
                      fontWeight: FontWeight.w500,
                      fontSize: 13.5,
                    ),
                  ),
                  TextSpan(
                    text: ' and ',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.75),
                      fontSize: 13.5,
                    ),
                  ),
                  TextSpan(
                    text: 'Privacy Policy',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.primary,
                      fontWeight: FontWeight.w500,
                      fontSize: 13.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
