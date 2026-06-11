import 'package:flutter/material.dart';

/// ShimmerCard — animated loading placeholder.
/// Pulses between surface and a slightly darker surface variant.
class ShimmerCard extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;
  final Color? baseColor;

  const ShimmerCard({
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 16,
    this.baseColor,
    super.key,
  });

  @override
  State<ShimmerCard> createState() => _ShimmerCardState();
}

class _ShimmerCardState extends State<ShimmerCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final base = widget.baseColor ?? cs.surface;
    final highlight = cs.onSurface.withOpacity(0.08);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, _) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Color.lerp(base, Color.alphaBlend(highlight, base), _animation.value),
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
        );
      },
    );
  }
}
