/// How a flight is actually running, as the server reports it.
///
/// The time on a trip card is the schedule as published when the booking was
/// taken, which can be months before the trip. This is the same flight on the
/// day, so the chauffeur knows before setting off that the 14:05 is now a
/// 15:40 — something they have until now discovered by standing in the
/// terminal.
///
/// Parsed as defensively as [Trip], and for an extra reason: this is a third
/// party's data relayed through our API, so a field can be absent on one
/// flight and present on the next.
class FlightStatus {
  const FlightStatus({
    required this.found,
    this.reason = '',
    this.number = '',
    this.airline = '',
    this.status = '',
    this.kind = '',
    this.fetchedAt,
    this.stale = false,
    this.scheduled,
    this.expected,
    this.delayMinutes,
    this.delayFrom = '',
    this.terminal = '',
    this.gate = '',
    this.baggageBelt = '',
  });

  /// False when there is nothing to show. [reason] says why, and only some
  /// reasons are worth a line on the card:
  ///
  ///   * `no_flight`  — not an airport trip. Show nothing.
  ///   * `too_early`  — the trip is not due for hours. Show nothing; the
  ///                    published time on the card is all anyone needs yet.
  ///   * `not_found`  — the provider does not know this flight on this date.
  ///   * `unavailable`— the provider could not answer, or is not configured.
  ///   * `invalid`    — the flight number on the booking is not one.
  final bool found;
  final String reason;

  final String number;
  final String airline;

  /// The provider's word: Expected, EnRoute, Arrived, Delayed, Canceled,
  /// Diverted, Unknown. Shown as it comes rather than mapped, because a word
  /// we do not recognise is still better than silence.
  final String status;

  /// Which end of the flight is Denver's — 'arrival' when the driver is
  /// meeting it, 'departure' when they are dropping off, 'none' when the
  /// flight does not touch DEN at all.
  final String kind;

  /// When the server last heard from the provider.
  final DateTime? fetchedAt;

  /// The provider could not be reached and this is the last good answer.
  final bool stale;

  /// Wall-clock times at the Denver end, as text — "15:40". Strings rather
  /// than DateTimes on purpose: they are the airport's local time, which is
  /// the only form anybody at the kerb wants, and converting them through a
  /// zone is how a time lands an hour out.
  final String? scheduled;

  /// What the airline now says, when it differs from the schedule.
  final String? expected;

  /// Minutes against the schedule: positive late, negative early.
  final int? delayMinutes;

  /// Which time the delay was measured from — 'revised' (the airline's own
  /// estimate or actual) or 'runway' (wheels on the tarmac). Never read as
  /// gate arrival: touchdown is several minutes before the door opens, and the
  /// agreement's airport wait is billed from the gate.
  final String delayFrom;

  final String terminal;
  final String gate;
  final String baggageBelt;

  static String _str(dynamic v) => v == null ? '' : v.toString().trim();

  static String? _time(dynamic side, String key) {
    if (side is! Map) return null;
    final t = key == 'scheduled' ? side['time'] : (side[key] is Map ? side[key]['time'] : null);
    final s = _str(t);
    return s.isEmpty ? null : s;
  }

  factory FlightStatus.fromJson(Map<String, dynamic> j) {
    if (j['found'] != true) {
      return FlightStatus(found: false, reason: _str(j['reason']));
    }

    // The side the driver cares about. 'departure' means the flight leaves
    // Denver, so the Denver clock is the departure's; otherwise it arrives.
    final kind = _str(j['kind']);
    final side = (kind == 'departure' ? j['departure'] : j['arrival']) as Map?;

    final airline = j['airline'];
    final revised = _time(side, 'revised');
    final runway = _time(side, 'runway');

    return FlightStatus(
      found: true,
      number: _str(j['number']),
      airline: airline is Map ? _str(airline['name']) : '',
      status: _str(j['status']),
      kind: kind,
      fetchedAt: DateTime.tryParse(_str(j['fetchedAt']))?.toLocal(),
      stale: j['stale'] == true,
      scheduled: _time(side, 'scheduled'),
      expected: revised ?? runway,
      // The server sends a number, but it reaches here through JSON from a
      // relayed third party, so it is converted rather than cast.
      delayMinutes: side == null ? null : int.tryParse(_str(side['delayMinutes'])),
      delayFrom: side == null ? '' : _str(side['delayFrom']),
      terminal: side == null ? '' : _str(side['terminal']),
      gate: side == null ? '' : _str(side['gate']),
      baggageBelt: side == null ? '' : _str(side['baggageBelt']),
    );
  }

  /// Nothing to put on the card at all — not an airport trip, or too soon to
  /// be worth asking about.
  bool get isSilent => !found && (reason == 'no_flight' || reason == 'too_early');

  /// Late enough to matter. Under this a driver would leave at the same time
  /// anyway, and a card that shouts about four minutes trains them to ignore it.
  bool get isLate => (delayMinutes ?? 0) >= 15;

  /// Early enough to matter — the case that catches a chauffeur out, because
  /// the passenger is already at the kerb.
  bool get isEarly => (delayMinutes ?? 0) <= -15;

  bool get isCancelled {
    final s = status.toLowerCase();
    return s.contains('cancel') || s.contains('divert');
  }

  /// What the delay is measured from, in words, or empty when it is only an
  /// estimate. Said out loud because the difference is money: the agreement
  /// bills airport waiting from thirty minutes after the gate, and touchdown
  /// is not the gate.
  String get delayBasis => switch (delayFrom) {
        'runway' => 'wheels down',
        _ => '',
      };
}
