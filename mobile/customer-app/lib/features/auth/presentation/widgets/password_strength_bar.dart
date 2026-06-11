import 'package:flutter/material.dart';

/// Four-segment password strength bar.
/// Score is derived from the password string using [_score].
/// Colors map: 1=error, 2=warn, 3=warn, 4=secondary(ok).
class PasswordStrengthBar extends StatelessWidget {
  final String password;

  const PasswordStrengthBar({required this.password, super.key});

  static int _score(String pw) {
    int s = 0;
    if (pw.length >= 8) s++;
    if (pw.contains(RegExp(r'[0-9]'))) s++;
    if (pw.contains(RegExp(r'[A-Z]'))) s++;
    if (pw.contains(RegExp(r'[!@#\$%^&*]'))) s++;
    return s.clamp(1, 4);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    const warn = Color(0xFFC97B0C);

    if (password.isEmpty) return const SizedBox.shrink();

    final score = _score(password);
    final colors = [cs.error, warn, warn, cs.secondary];
    final labels = ['Weak', 'Fair', 'Good', 'Strong'];
    final activeColor = colors[score - 1];
    final label = labels[score - 1];

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(4, (i) {
              return Expanded(
                child: Container(
                  margin: EdgeInsetsDirectional.only(end: i < 3 ? 5 : 0),
                  height: 3,
                  decoration: BoxDecoration(
                    color: i < score
                        ? activeColor
                        : cs.onSurface.withOpacity(0.14),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 5),
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: activeColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
