import 'package:flutter/material.dart';

/// AvailBadge — small pill badge for route/seat availability status.
/// [type]: 'ok' | 'warn' | 'info'
class AvailBadge extends StatelessWidget {
  final String label;
  final String type;

  const AvailBadge({
    required this.label,
    this.type = 'ok',
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final Color bg;
    final Color fg;

    switch (type) {
      case 'warn':
        bg = const Color(0xFFFDF1DC);
        fg = const Color(0xFFC97B0C);
      case 'info':
        bg = const Color(0xFFE7EFFE);
        fg = const Color(0xFF1762BA);
      case 'ok':
      default:
        bg = cs.secondary.withOpacity(0.18);
        fg = cs.secondary;
    }

    return Container(
      height: 22,
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(11),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
          height: 1,
        ),
      ),
    );
  }
}
