import 'package:flutter_test/flutter_test.dart';

import 'package:dbl_driver/models/flight_status.dart';

/// Parsing a flight the server relayed from AeroDataBox.
///
/// This is third-party data two hops away, so the cases that matter are the
/// absences: a flight with no revised time, a side the provider knows nothing
/// about, a field that arrives as a string where a number was expected. None
/// of them may throw, because the trip card they sit on is the screen the
/// driver works from.
///
/// The shapes here are the ones `flights.js` builds, not invented: `side()`
/// puts the published time in flat `time`, and the live ones under `revised`
/// and `runway`.
Map<String, dynamic> side({
  String time = '14:05',
  String? revised,
  String? runway,
  int? delayMinutes,
  String? delayFrom,
  String terminal = '',
  String gate = '',
  String belt = '',
}) => {
      'iata': 'DEN',
      'city': 'Denver',
      'name': 'Denver International',
      'date': '2026-11-01',
      'time': time,
      'terminal': terminal,
      'gate': gate,
      'baggageBelt': belt,
      'revised': revised == null ? null : {'date': '2026-11-01', 'time': revised},
      'runway': runway == null ? null : {'date': '2026-11-01', 'time': runway},
      'delayMinutes': delayMinutes,
      'delayFrom': delayFrom,
    };

Map<String, dynamic> found({
  String kind = 'arrival',
  String status = 'Expected',
  Map<String, dynamic>? arrival,
  Map<String, dynamic>? departure,
  String? fetchedAt,
  bool stale = false,
}) => {
      'found': true,
      'number': 'AA1423',
      'airline': {'name': 'American Airlines', 'iata': 'AA'},
      'status': status,
      'kind': kind,
      'servesDenver': true,
      'fetchedAt': fetchedAt,
      'stale': stale,
      'arrival': arrival ?? side(),
      'departure': departure ?? side(time: '11:30'),
    };

void main() {
  group('which end of the flight is read', () {
    test('an arrival reads the arrival side — that is the Denver clock', () {
      final f = FlightStatus.fromJson(found(
        kind: 'arrival',
        arrival: side(time: '14:05', revised: '15:40', delayMinutes: 95, delayFrom: 'revised'),
        departure: side(time: '11:30'),
      ));

      expect(f.scheduled, '14:05');
      expect(f.expected, '15:40');
      expect(f.delayMinutes, 95);
    });

    test('a departure reads the departure side', () {
      final f = FlightStatus.fromJson(found(
        kind: 'departure',
        arrival: side(time: '14:05'),
        departure: side(time: '11:30', revised: '11:55', delayMinutes: 25, delayFrom: 'revised'),
      ));

      expect(f.scheduled, '11:30');
      expect(f.expected, '11:55');
      expect(f.delayMinutes, 25);
    });
  });

  group('the delay a driver acts on', () {
    test('late past the threshold', () {
      final f = FlightStatus.fromJson(
        found(arrival: side(revised: '15:40', delayMinutes: 95, delayFrom: 'revised')),
      );
      expect(f.isLate, isTrue);
      expect(f.isEarly, isFalse);
    });

    test('four minutes late is not worth saying', () {
      // A card that shouts about four minutes is a card that gets ignored
      // when it says ninety-five.
      final f = FlightStatus.fromJson(
        found(arrival: side(revised: '14:09', delayMinutes: 4, delayFrom: 'revised')),
      );
      expect(f.isLate, isFalse);
      expect(f.expected, '14:09', reason: 'still shown, just not flagged');
    });

    test('early counts too — the passenger is already at the kerb', () {
      final f = FlightStatus.fromJson(
        found(arrival: side(revised: '13:30', delayMinutes: -35, delayFrom: 'revised')),
      );
      expect(f.isEarly, isTrue);
      expect(f.isLate, isFalse);
    });

    test('wheels down is named as such, never as gate arrival', () {
      // The agreement bills airport waiting from thirty minutes after the
      // gate. Touchdown is earlier, so anything reading this as the gate would
      // overcharge a customer in writing.
      final f = FlightStatus.fromJson(
        found(arrival: side(runway: '15:20', delayMinutes: 75, delayFrom: 'runway')),
      );
      expect(f.expected, '15:20');
      expect(f.delayBasis, 'wheels down');
    });

    test('an airline estimate carries no basis label', () {
      final f = FlightStatus.fromJson(
        found(arrival: side(revised: '15:40', delayMinutes: 95, delayFrom: 'revised')),
      );
      expect(f.delayBasis, isEmpty);
    });
  });

  group('absences do not throw', () {
    test('no revised and no runway time: scheduled only', () {
      final f = FlightStatus.fromJson(found(arrival: side()));
      expect(f.scheduled, '14:05');
      expect(f.expected, isNull);
      expect(f.delayMinutes, isNull);
      expect(f.isLate, isFalse);
    });

    test('the side is missing altogether', () {
      final payload = found();
      payload['arrival'] = null;
      final f = FlightStatus.fromJson(payload);

      expect(f.found, isTrue);
      expect(f.scheduled, isNull);
      expect(f.terminal, isEmpty);
      expect(f.delayMinutes, isNull);
    });

    test('delayMinutes as a string is converted, not cast', () {
      // Nothing in this stack promises a JSON number. Trip.payAmount exists
      // because of the same assumption made once about NUMERIC.
      final payload = found(arrival: side(revised: '15:40', delayFrom: 'revised'));
      (payload['arrival'] as Map)['delayMinutes'] = '95';
      expect(FlightStatus.fromJson(payload).delayMinutes, 95);
    });

    test('an unparseable delay is null rather than an exception', () {
      final payload = found();
      (payload['arrival'] as Map)['delayMinutes'] = 'quite late';
      expect(FlightStatus.fromJson(payload).delayMinutes, isNull);
    });

    test('a blank time is null, not an empty string on the card', () {
      final f = FlightStatus.fromJson(found(arrival: side(time: '')));
      expect(f.scheduled, isNull);
    });
  });

  group('when there is nothing to show', () {
    test('no flight on the booking is silent', () {
      final f = FlightStatus.fromJson({'found': false, 'reason': 'no_flight'});
      expect(f.isSilent, isTrue);
    });

    test('a trip that is not due yet is silent', () {
      final f = FlightStatus.fromJson({'found': false, 'reason': 'too_early'});
      expect(f.isSilent, isTrue);
    });

    test('a provider that could not answer is not silent — the driver is told', () {
      final f = FlightStatus.fromJson({'found': false, 'reason': 'unavailable'});
      expect(f.isSilent, isFalse);
      expect(f.found, isFalse);
    });
  });

  group('cancellation and diversion', () {
    for (final status in const ['Canceled', 'CanceledUncertain', 'Diverted']) {
      test('"$status" reads as cancelled', () {
        expect(FlightStatus.fromJson(found(status: status)).isCancelled, isTrue);
      });
    }

    test('an ordinary status does not', () {
      expect(FlightStatus.fromJson(found(status: 'EnRoute')).isCancelled, isFalse);
    });
  });

  test('fetchedAt comes through as a local time', () {
    final f = FlightStatus.fromJson(found(fetchedAt: '2026-11-01T18:30:00Z'));
    expect(f.fetchedAt, isNotNull);
    expect(f.fetchedAt!.isUtc, isFalse);
    expect(f.fetchedAt!.toUtc(), DateTime.utc(2026, 11, 1, 18, 30));
  });

  test('a stale answer says so', () {
    expect(FlightStatus.fromJson(found(stale: true)).stale, isTrue);
    expect(FlightStatus.fromJson(found()).stale, isFalse);
  });

  group('the body the server actually sends', () {
    // Captured verbatim from GET /api/driver/trips/:id/flight on a backend
    // running the real route and the real flights.js, with the provider
    // answered locally. Here so that a change to either side of the wire
    // breaks a test rather than a trip card.
    const arrival = {
      'found': true,
      'number': 'AA1423',
      'airline': {'name': 'American Airlines', 'iata': 'AA'},
      'status': 'Delayed',
      'departure': {
        'iata': 'DFW',
        'city': 'Dallas',
        'name': 'Dallas Fort Worth Intl',
        'date': '2026-11-02',
        'time': '11:30',
        'terminal': 'C',
        'gate': 'C12',
        'baggageBelt': '',
        'revised': null,
        'runway': null,
        'delayMinutes': null,
        'delayFrom': null,
      },
      'arrival': {
        'iata': 'DEN',
        'city': 'Denver',
        'name': 'Denver International',
        'date': '2026-11-02',
        'time': '14:05',
        'terminal': 'A',
        'gate': 'A44',
        'baggageBelt': '12',
        'revised': {'date': '2026-11-02', 'time': '15:40'},
        'runway': null,
        'delayMinutes': 95,
        'delayFrom': 'revised',
      },
      'servesDenver': true,
      'kind': 'arrival',
      'fetchedAt': '2026-11-01T19:50:18.542Z',
    };

    test('an arrival, read off the Denver end', () {
      final f = FlightStatus.fromJson(Map<String, dynamic>.from(arrival));

      expect(f.found, isTrue);
      expect(f.number, 'AA1423');
      expect(f.airline, 'American Airlines');
      expect(f.status, 'Delayed');
      expect(f.scheduled, '14:05');
      expect(f.expected, '15:40');
      expect(f.delayMinutes, 95);
      expect(f.delayFrom, 'revised');
      expect(f.isLate, isTrue);
      expect(f.terminal, 'A');
      expect(f.gate, 'A44');
      expect(f.baggageBelt, '12');
      expect(f.fetchedAt, isNotNull);
    });

    test('a departure, where the Denver end is the other side', () {
      // Also captured: the same route for a trip out of DEN, where reading the
      // arrival side would show Frankfurt's clock to a driver in Denver.
      final f = FlightStatus.fromJson({
        'found': true,
        'number': 'LH8817',
        'airline': {'name': 'Lufthansa', 'iata': 'LH'},
        'status': 'Expected',
        'departure': {
          'iata': 'DEN',
          'city': 'Denver',
          'name': 'Denver International',
          'date': '2026-11-02',
          'time': '11:30',
          'terminal': 'A',
          'gate': 'A38',
          'baggageBelt': '',
          'revised': {'date': '2026-11-02', 'time': '11:55'},
          'runway': null,
          'delayMinutes': 25,
          'delayFrom': 'revised',
        },
        'arrival': {
          'iata': 'FRA',
          'city': 'Frankfurt',
          'name': 'Frankfurt am Main',
          'date': '2026-11-02',
          'time': '07:45',
          'terminal': '1',
          'gate': '',
          'baggageBelt': '',
          'revised': null,
          'runway': null,
          'delayMinutes': null,
          'delayFrom': null,
        },
        'servesDenver': true,
        'kind': 'departure',
        'fetchedAt': '2026-11-01T19:51:18.519Z',
      });

      expect(f.kind, 'departure');
      expect(f.scheduled, '11:30', reason: "Denver's clock, not Frankfurt's");
      expect(f.expected, '11:55');
      expect(f.delayMinutes, 25);
      expect(f.gate, 'A38');
    });

    test('the refusals the route sends, verbatim', () {
      for (final reason in const ['no_flight', 'too_early', 'unavailable']) {
        final f = FlightStatus.fromJson({'found': false, 'reason': reason});
        expect(f.found, isFalse);
        expect(f.reason, reason);
      }
    });
  });
}
