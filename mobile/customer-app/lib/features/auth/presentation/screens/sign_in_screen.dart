import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../features/auth/domain/auth_provider.dart';
import '../widgets/mobile_input_field.dart';

// SCREEN 1.3 — Sign In
// Email + password fields, forgot password link, social buttons,
// sign-up footer. Uses authNotifierProvider for sign-in mutation.

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _showPassword = false;
  String? _errorMsg;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onSignIn() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    try {
      await ref.read(authNotifierProvider.notifier).signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
    } catch (e) {
      setState(() {
        _errorMsg = e is UnimplementedError
            ? 'Sign-in service is not yet available. Please try again later.'
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

    return Scaffold(
      // ignore: deprecated_member_use
      backgroundColor: theme.colorScheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // NavBar
            _SignInNavBar(cs: cs, theme: theme),
            // Form body
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsetsDirectional.fromSTEB(28, 8, 28, 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome back.',
                      style: theme.textTheme.displaySmall?.copyWith(
                        fontSize: 36,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Sign in to continue your journey.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: cs.onSurface.withOpacity(0.55),
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 28),
                    MobileInputField(
                      label: 'Email address',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                      hintText: 'you@example.com',
                    ),
                    const SizedBox(height: 16),
                    MobileInputField(
                      label: 'Password',
                      controller: _passwordController,
                      obscureText: !_showPassword,
                      prefixIcon: Icons.lock_outline,
                      hintText: '••••••••',
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
                    const SizedBox(height: 12),
                    // Forgot password
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: TextButton(
                        onPressed: () =>
                            context.go(AppRoutes.forgotPassword),
                        child: const Text('Forgot password?'),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Error message
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
                    // Sign in button
                    ElevatedButton(
                      onPressed: _isLoading ? null : _onSignIn,
                      child: _isLoading
                          ? SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: cs.onPrimary,
                              ),
                            )
                          : const Text('Sign in →'),
                    ),
                    const SizedBox(height: 24),
                    // Social divider
                    _SocialDivider(cs: cs, theme: theme),
                    const SizedBox(height: 16),
                    // Social buttons
                    _SocialButtons(cs: cs, theme: theme),
                    const SizedBox(height: 40),
                    // Sign up footer
                    Center(
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: 'New here? ',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: cs.onSurface.withOpacity(0.55),
                                fontSize: 15,
                              ),
                            ),
                            WidgetSpan(
                              child: GestureDetector(
                                onTap: () => context.go(AppRoutes.signUp),
                                child: Text(
                                  'Create an account',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: cs.primary,
                                    fontWeight: FontWeight.w600,
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
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

class _SignInNavBar extends StatelessWidget {
  final ColorScheme cs;
  final ThemeData theme;

  const _SignInNavBar({required this.cs, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.symmetric(
        horizontal: 8,
        vertical: 4,
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => context.pop(),
            icon: Icon(Icons.arrow_back_ios_new, color: cs.onSurface),
          ),
          const Spacer(),
          TextButton(
            onPressed: () => context.go(AppRoutes.signUp),
            child: const Text('Sign up'),
          ),
        ],
      ),
    );
  }
}

class _SocialDivider extends StatelessWidget {
  final ColorScheme cs;
  final ThemeData theme;

  const _SocialDivider({required this.cs, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Divider(color: cs.onSurface.withOpacity(0.14), thickness: 1),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 14),
          child: Text(
            'or continue with',
            style: theme.textTheme.labelMedium?.copyWith(
              color: cs.onSurface.withOpacity(0.38),
              fontSize: 13,
            ),
          ),
        ),
        Expanded(
          child: Divider(color: cs.onSurface.withOpacity(0.14), thickness: 1),
        ),
      ],
    );
  }
}

class _SocialButtons extends StatelessWidget {
  final ColorScheme cs;
  final ThemeData theme;

  const _SocialButtons({required this.cs, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _SocialButton(
            label: 'Google',
            icon: 'G',
            bgColor: cs.surface,
            fgColor: cs.onSurface,
            borderColor: cs.onSurface.withOpacity(0.22),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Google sign-in coming soon')),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _SocialButton(
            label: 'Apple',
            icon: '',
            bgColor: cs.onSurface,
            fgColor: cs.surface,
            borderColor: cs.onSurface,
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Apple sign-in coming soon')),
            ),
          ),
        ),
      ],
    );
  }
}

class _SocialButton extends StatelessWidget {
  final String label;
  final String icon;
  final Color bgColor;
  final Color fgColor;
  final Color borderColor;
  final VoidCallback onTap;

  const _SocialButton({
    required this.label,
    required this.icon,
    required this.bgColor,
    required this.fgColor,
    required this.borderColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon.isNotEmpty)
              Text(
                icon,
                style: TextStyle(
                  color: fgColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            if (icon.isNotEmpty) const SizedBox(width: 10),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: fgColor,
                fontWeight: FontWeight.w500,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
