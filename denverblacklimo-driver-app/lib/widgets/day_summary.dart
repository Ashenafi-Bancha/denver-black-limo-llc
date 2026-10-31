import 'package:flutter/material.dart';

import '../models/trip.dart';
import '../theme.dart';

/// What today comes to.
///
/// A chauffeur working a split shift wants two numbers before anything else:
/// how many more runs, and what the day is worth. Both are already on the
/// cards; adding them up is the app's job, not the driver's at a kerb.
///
/// Only the trips still to come are counted. A total that quietly included
/// this morning's completed airport run would be the kind of number someone
/// plans their evening around and then finds was wrong.
class DaySummary extends StatelessWidget {
  const DaySummary({super.key, required this.count, required this.total});

  final int count;
  final double total;

  /// Null when there is nothing left today — an empty strip saying "0 trips"
  /// is noise on the one screen that should be scannable at a glance.
  static DaySummary? forToday(List<Trip> trips, DateTime now) {
    final todays = trips.where((t) {
      final at = t.pickupAt;
      if (at == null || t.isClosed) return false;
      final local = at.toLocal();
      return local.year == now.year && local.month == now.month && local.day == now.day;
    }).toList();

    if (todays.isEmpty) return null;
    final total = todays.fold<double>(0, (sum, t) => sum + (t.payAmount ?? 0));
    return DaySummary(count: todays.length, total: total);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Brand.surfaceHigh,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Brand.line),
      ),
      child: Row(
        children: [
          const Icon(Icons.today_outlined, size: 18, color: Brand.gold),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              count == 1 ? '1 trip left today' : '$count trips left today',
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
          // Hidden rather than shown as zero: a driver whose trips carry no
          // fee should not be told the day is worth nothing.
          if (total > 0)
            Text(
              '\$${total.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Brand.ok,
              ),
            ),
        ],
      ),
    );
  }
}
