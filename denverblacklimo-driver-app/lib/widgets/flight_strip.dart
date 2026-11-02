import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/driver_api.dart';
import '../models/flight_status.dart';
import '../theme.dart';

/// The flight, as it is actually running.
///
/// Split in two on purpose. [FlightStrip] is the layout and holds no state, so
/// a widget test can measure it at a real phone width with any flight put in
/// front of it — which is the only honest way to check this app's layout, since
/// Flutter draws to a canvas and the browser pane's screenshots of it lie.
/// [TripFlightStrip] is the part that fetches.
class FlightStrip extends StatelessWidget {
  const FlightStrip({
    super.key,
    required this.flight,
    required this.loading,
    required this.onRefresh,
    this.now,
  });

  final FlightStatus? flight;
  final bool loading;
  final VoidCallback onRefresh;

  /// For the "as of" age. Injected so a test is not at the mercy of the clock.
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final f = flight;

    // Nothing to say: not an airport trip, or the trip is not due for hours.
    // A placeholder here would be a line of furniture on the one screen that
    // has to stay scannable from arm's length.
    if (f != null && f.isSilent) return const SizedBox.shrink();
    if (f == null && !loading) return const SizedBox.shrink();

    final accent = f == null
        ? Brand.line
        : f.isCancelled
            ? Brand.bad
            : (f.isLate || f.isEarly)
                ? Brand.warn
                : Brand.ok;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: BoxDecoration(
        color: Brand.black,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: accent.withValues(alpha: 0.45)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            f != null && f.isCancelled ? Icons.airplanemode_inactive : Icons.flight_takeoff,
            size: 16,
            color: accent,
          ),
          const SizedBox(width: 10),
          // The principle that bit the admin photo strip applies here too: the
          // flexible child has to be allowed to shrink, or a long airline name
          // pushes the refresh button off a phone with nothing to reveal it.
          Expanded(child: _body(f)),
          SizedBox(
            height: 32,
            width: 32,
            child: loading
                ? const Padding(
                    padding: EdgeInsets.all(7),
                    child: CircularProgressIndicator(strokeWidth: 2, color: Brand.gold),
                  )
                : IconButton(
                    onPressed: onRefresh,
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                    tooltip: 'Check the flight again',
                    icon: const Icon(Icons.refresh, size: 18, color: Colors.white38),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _body(FlightStatus? f) {
    if (f == null) {
      return const Text(
        'Checking the flight...',
        style: TextStyle(fontSize: 12.5, color: Colors.white54),
      );
    }

    if (!f.found) {
      return Text(
        switch (f.reason) {
          'not_found' => 'The airline has no record of this flight today.',
          'invalid' => 'The flight number on this booking cannot be looked up.',
          _ => 'Flight status unavailable. Check the airline.',
        },
        style: const TextStyle(fontSize: 12.5, height: 1.35, color: Colors.white54),
      );
    }

    final where = _where(f);
    final age = _age(f);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Flexible(
              child: Text(
                [f.number, f.airline].where((s) => s.isNotEmpty).join(' · '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
            if (f.status.isNotEmpty) ...[
              const SizedBox(width: 8),
              Text(
                f.status.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  letterSpacing: 0.5,
                  fontWeight: FontWeight.w700,
                  color: f.isCancelled ? Brand.bad : Colors.white38,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 3),
        _times(f),
        if (where.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Text(
              where,
              maxLines: 2,
              style: const TextStyle(fontSize: 11.5, color: Colors.white54),
            ),
          ),
        if (age.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Text(
              age,
              style: TextStyle(
                fontSize: 10.5,
                color: f.stale ? Brand.warn : Colors.white24,
              ),
            ),
          ),
      ],
    );
  }

  /// Scheduled and expected, side by side.
  ///
  /// The scheduled time is shown even when nothing has moved, so a driver can
  /// see the flight was actually checked rather than infer it from the absence
  /// of a warning. The word is "expected", never "arrives" — this is the
  /// airline's estimate, and on an arrival it is not the gate.
  Widget _times(FlightStatus f) {
    final scheduled = f.scheduled;
    if (scheduled == null) {
      return const Text(
        'No time published for this flight yet.',
        style: TextStyle(fontSize: 12, color: Colors.white54),
      );
    }

    final expected = f.expected;
    final minutes = f.delayMinutes;
    final shifted = expected != null && expected != scheduled;

    return Wrap(
      spacing: 8,
      runSpacing: 2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          shifted ? 'Sched $scheduled' : scheduled,
          style: TextStyle(
            fontSize: shifted ? 12 : 15,
            fontWeight: shifted ? FontWeight.w400 : FontWeight.w700,
            color: shifted ? Colors.white38 : Colors.white,
            decoration: shifted ? TextDecoration.lineThrough : null,
            decorationColor: Colors.white38,
          ),
        ),
        if (shifted)
          Text(
            expected,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
          ),
        if (minutes != null && (f.isLate || f.isEarly))
          Text(
            [
              minutes > 0 ? '$minutes min late' : '${-minutes} min early',
              if (f.delayBasis.isNotEmpty) f.delayBasis,
            ].join(' · '),
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: Brand.warn,
            ),
          ),
      ],
    );
  }

  /// Terminal, gate, belt — whichever the provider knows.
  String _where(FlightStatus f) => [
        if (f.terminal.isNotEmpty) 'Terminal ${f.terminal}',
        if (f.gate.isNotEmpty) 'Gate ${f.gate}',
        if (f.baggageBelt.isNotEmpty) 'Belt ${f.baggageBelt}',
      ].join(' · ');

  String _age(FlightStatus f) {
    final at = f.fetchedAt;
    final clock = now;
    if (at == null || clock == null) return '';
    final mins = clock.difference(at).inMinutes;
    final when = mins < 1
        ? 'just now'
        : mins < 60
            ? '$mins min ago'
            : 'over an hour ago';
    return f.stale ? 'Could not reach the airline — as of $when' : 'Checked $when';
  }
}

/// Loads the flight for one trip and hands it to [FlightStrip].
///
/// Asked once, when the card first appears, and then only when the driver taps
/// refresh. Deliberately not on the thirty-second tick the rest of this screen
/// runs on: the provider is metered at roughly three hundred lookups a month
/// for the whole company, and the server will not give a fresher answer than
/// ten minutes old anyway.
class TripFlightStrip extends StatefulWidget {
  const TripFlightStrip({super.key, required this.api, required this.tripId});

  final DriverApi api;
  final String tripId;

  @override
  State<TripFlightStrip> createState() => _TripFlightStripState();
}

class _TripFlightStripState extends State<TripFlightStrip> {
  FlightStatus? _flight;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    FlightStatus next;
    try {
      next = await widget.api.tripFlight(widget.tripId);
    } on ApiException {
      // Not worth interrupting a driver for. A flight the app could not check
      // is a strip that says so, and the published time is still on the card.
      next = const FlightStatus(found: false, reason: 'unavailable');
    }
    if (!mounted) return;
    setState(() {
      _flight = next;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) => FlightStrip(
        flight: _flight,
        loading: _loading,
        onRefresh: _load,
        now: DateTime.now(),
      );
}
