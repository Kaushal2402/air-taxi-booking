import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:utbp_theme/utbp_theme.dart';

import '../../../../core/router/app_router.dart';
import '../../../../features/auth/domain/auth_provider.dart';
import '../widgets/mobile_input_field.dart';
import '../widgets/forest_header.dart';

// SCREEN 1.6 — Profile Setup (Step 3 of 3)
// Forest header with step tracker, avatar upload, display name + home city,
// notifications toggle, "Complete setup" + "Skip" CTAs.

class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _nameController = TextEditingController();
  final _cityController = TextEditingController();
  bool _notificationsEnabled = true;
  bool _isLoading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _nameController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _onComplete() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    try {
      await ref.read(authNotifierProvider.notifier).completeProfileSetup(
        displayName: _nameController.text.trim(),
        homeCity: _cityController.text.trim().isEmpty
            ? null
            : _cityController.text.trim(),
        notificationsEnabled: _notificationsEnabled,
      );
      if (mounted) context.go(AppRoutes.home);
    } catch (e) {
      setState(() {
        _errorMsg = e is UnimplementedError
            ? 'Profile update is not yet available. Please try again later.'
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
          // Forest header with step tracker
          ForestHeader(
            navBar: const SizedBox.shrink(),
            preHeadingContent: _StepTracker(cs: cs, theme: theme),
            monoLabel: 'Step 3 of 3',
            heading: 'Your profile.',
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
                padding: const EdgeInsetsDirectional.fromSTEB(28, 32, 28, 36),
                child: Column(
                  children: [
                    // Avatar
                    _AvatarSection(brand: brand, cs: cs),
                    const SizedBox(height: 24),
                    MobileInputField(
                      label: 'Display name',
                      controller: _nameController,
                      prefixIcon: Icons.person_outline,
                      hintText: 'Your name',
                    ),
                    const SizedBox(height: 16),
                    MobileInputField(
                      label: 'Home city',
                      controller: _cityController,
                      prefixIcon: Icons.location_on_outlined,
                      hintText: 'e.g. New York, NY',
                    ),
                    const SizedBox(height: 20),
                    // Notifications toggle
                    _NotificationsToggle(
                      enabled: _notificationsEnabled,
                      cs: cs,
                      theme: theme,
                      onToggle: (v) =>
                          setState(() => _notificationsEnabled = v),
                    ),
                    const SizedBox(height: 24),
                    if (_errorMsg != null) ...[
                      Text(
                        _errorMsg!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: cs.error,
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                    ],
                    ElevatedButton(
                      onPressed: _isLoading ? null : _onComplete,
                      child: _isLoading
                          ? SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: cs.onPrimary,
                              ),
                            )
                          : const Text('Complete setup'),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        onPressed: () => context.go(AppRoutes.home),
                        style: TextButton.styleFrom(
                          foregroundColor: cs.onSurface.withOpacity(0.38),
                          textStyle: theme.textTheme.bodyMedium?.copyWith(
                            fontSize: 14,
                          ),
                        ),
                        child: const Text("Skip, I'll do this later"),
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

class _StepTracker extends StatelessWidget {
  final ColorScheme cs;
  final ThemeData theme;

  const _StepTracker({required this.cs, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(bottom: 8),
      child: Row(
        children: [
          for (int n = 1; n <= 3; n++) ...[
            _StepCircle(step: n, cs: cs, theme: theme),
            if (n < 3)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsetsDirectional.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color: n < 3
                        ? cs.primary
                        : Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _StepCircle extends StatelessWidget {
  final int step;
  final ColorScheme cs;
  final ThemeData theme;

  const _StepCircle({
    required this.step,
    required this.cs,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final isComplete = step < 3;
    final isCurrent = step == 3;

    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isComplete ? cs.primary : Colors.white.withOpacity(0.2),
        border: isCurrent
            ? Border.all(color: Colors.white.withOpacity(0.4), width: 2)
            : null,
      ),
      child: Center(
        child: isComplete
            ? const Icon(Icons.check, size: 15, color: Colors.white)
            : Text(
                '$step',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}

class _AvatarSection extends StatelessWidget {
  final AppBrandConfig brand;
  final ColorScheme cs;

  const _AvatarSection({required this.brand, required this.cs});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          children: [
            // Avatar circle
            GestureDetector(
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Photo upload coming soon'),
                ),
              ),
              child: Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: brand.mint,
                  boxShadow: [
                    BoxShadow(
                      color: cs.surface,
                      spreadRadius: 3,
                    ),
                    BoxShadow(
                      color: cs.primary,
                      spreadRadius: 5,
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Icon(
                  Icons.person_outline,
                  size: 38,
                  color: cs.primary,
                ),
              ),
            ),
            // Camera badge
            Positioned(
              bottom: 2,
              right: 2,
              child: Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: cs.primary,
                  border: Border.all(color: cs.surface, width: 2.5),
                ),
                child: const Icon(
                  Icons.camera_alt_outlined,
                  size: 15,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TextButton(
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Photo upload coming soon')),
          ),
          child: const Text('Add profile photo'),
        ),
      ],
    );
  }
}

class _NotificationsToggle extends StatelessWidget {
  final bool enabled;
  final ColorScheme cs;
  final ThemeData theme;
  final ValueChanged<bool> onToggle;

  const _NotificationsToggle({
    required this.enabled,
    required this.cs,
    required this.theme,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onToggle(!enabled),
      child: Container(
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        decoration: BoxDecoration(
          color: cs.onSurface.withOpacity(0.04),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Booking notifications',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Updates on your trips & flights',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: cs.onSurface.withOpacity(0.55),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            // Custom toggle
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 50,
              height: 30,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(15),
                color: enabled
                    ? cs.primary
                    : cs.onSurface.withOpacity(0.18),
              ),
              child: Stack(
                children: [
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 200),
                    top: 3,
                    right: enabled ? 3 : null,
                    left: enabled ? null : 3,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.18),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
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
    );
  }
}
