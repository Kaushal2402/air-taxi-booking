import 'package:flutter/material.dart';

/// A labeled text input field styled for the mobile auth screens.
/// Uses theme tokens — no hardcoded colors.
class MobileInputField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? hintText;
  final IconData? prefixIcon;
  final Widget? suffix;
  final bool focused;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;

  const MobileInputField({
    required this.label,
    required this.controller,
    this.keyboardType,
    this.obscureText = false,
    this.hintText,
    this.prefixIcon,
    this.suffix,
    this.focused = false,
    this.validator,
    this.onChanged,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: cs.onSurface.withOpacity(0.75),
          ),
        ),
        const SizedBox(height: 7),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          onChanged: onChanged,
          validator: validator,
          autofocus: focused,
          style: theme.textTheme.bodyLarge,
          decoration: InputDecoration(
            prefixIcon: prefixIcon != null
                ? Icon(
                    prefixIcon,
                    size: 20,
                    color: cs.onSurface.withOpacity(0.38),
                  )
                : null,
            suffix: suffix,
            hintText: hintText,
            filled: true,
            fillColor: cs.surface,
            contentPadding: const EdgeInsetsDirectional.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: cs.onSurface.withOpacity(0.22),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: cs.onSurface.withOpacity(0.22),
                width: 1.5,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: cs.primary,
                width: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
