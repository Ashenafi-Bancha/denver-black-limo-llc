import 'package:flutter/material.dart';

import '../models/trip.dart';
import '../theme.dart';

/// The status control on a trip card.
///
/// One big button showing the obvious next step, because the driver is usually
/// holding the phone at arm's length with the other hand on a door handle.
/// Everything else — correcting a mistaken press, marking a no-show — is
/// behind the smaller control beside it, so the common case stays one tap and
/// the uncommon one is still possible.
///
/// Times are shown as they are recorded, so a driver can see what the office
/// will see. The wait counter is the one that earns money: the agreement bills
/// past a free window, and nobody can charge for what nobody wrote down.
class TripStatusBar extends StatelessWidget {
  const TripStatusBar({
    super.key,
    required this.trip,
    required this.busy,
    required this.onSet,
    required this.now,
  });

  final Trip trip;
  final bool busy;
  final void Function(String status) onSet;

  /// Passed in rather than read here, so the whole list ticks together and a
  /// widget rebuild cannot show two different "now"s on one screen.
  final DateTime now;

  static const labels = {
    'en_route': 'On the way',
    'arrived': 'Arrived',
    'on_board': 'Passenger on board',
    'dropped_off': 'Dropped off',
    'no_show': 'No-show',
  };

  /// The step a driver would normally press next.
  static String? nextAfter(String current) => switch (current) {
        '' => 'en_route',
        'en_route' => 'arrived',
        'arrived' => 'on_board',
        'on_board' => 'dropped_off',
        _ => null,
      };

  static String two(int n) => n.toString().padLeft(2, '0');
  static String clock(DateTime t) => '${two(t.hour)}:${two(t.minute)}';

  @override
  Widget build(BuildContext context) {
    final current = trip.driverStatus;
    final next = nextAfter(current);
    final waiting = trip.waitingFor(now);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (current.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Icon(
                  trip.isClosed ? Icons.check_circle : Icons.radio_button_checked,
                  size: 16,
                  color: trip.isClosed ? Brand.ok : Brand.gold,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    trip.statusAt == null
                        ? labels[current] ?? current
                        : '${labels[current] ?? current} · ${clock(trip.statusAt!)}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: trip.isClosed ? Brand.ok : Brand.gold,
                    ),
                  ),
                ),
                // Only while it is actually running: once the passenger is
                // aboard there is nothing to charge for.
                if (waiting != null && waiting.inMinutes >= 1)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Brand.warn.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Brand.warn.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      'waiting ${waiting.inMinutes} min',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Brand.warn,
                      ),
                    ),
                  ),
              ],
            ),
          ),

        if (next != null)
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: busy ? null : () => onSet(next),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                  child: busy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Brand.black),
                        )
                      : Text(labels[next]!.toUpperCase()),
                ),
              ),
              const SizedBox(width: 10),
              _MoreStatuses(busy: busy, current: current, onSet: onSet),
            ],
          )
        else
          // Finished. The trip stays visible with its times rather than
          // vanishing, so a driver can check what was recorded.
          Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Brand.black,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Brand.line),
            ),
            child: Text(
              current == 'no_show' ? 'Marked as a no-show' : 'Trip complete',
              style: const TextStyle(fontSize: 13, color: Colors.white54, fontWeight: FontWeight.w600),
            ),
          ),
      ],
    );
  }
}

/// Correcting a press, or marking a no-show.
class _MoreStatuses extends StatelessWidget {
  const _MoreStatuses({required this.busy, required this.current, required this.onSet});

  final bool busy;
  final String current;
  final void Function(String status) onSet;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      width: 52,
      child: PopupMenuButton<String>(
        enabled: !busy,
        tooltip: 'Other statuses',
        position: PopupMenuPosition.under,
        color: Brand.surfaceHigh,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Brand.line),
        ),
        onSelected: onSet,
        itemBuilder: (_) => [
          for (final entry in TripStatusBar.labels.entries)
            PopupMenuItem(
              value: entry.key,
              enabled: entry.key != current,
              child: Row(
                children: [
                  if (entry.key == current)
                    const Icon(Icons.check, size: 16, color: Brand.gold)
                  else
                    const SizedBox(width: 16),
                  const SizedBox(width: 10),
                  Text(
                    entry.value,
                    style: TextStyle(color: entry.key == 'no_show' ? Brand.bad : Colors.white),
                  ),
                ],
              ),
            ),
        ],
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Brand.line),
          ),
          child: const Icon(Icons.more_horiz, color: Colors.white70),
        ),
      ),
    );
  }
}
