import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:dbl_driver/models/flight_status.dart';
import 'package:dbl_driver/widgets/flight_strip.dart';

/// The flight strip, measured rather than looked at.
///
/// Flutter draws to a canvas, so the browser pane cannot read this widget and
/// its screenshots of the app under viewport emulation came back clipped
/// against a layout that was correct. Two bugs were chased that way and
/// neither existed. A widget test measures the real render tree at a width a
/// phone actually has.
///
/// The failure this guards against is the one that bit the admin photo strip:
/// a long airline name next to a fixed-width button, with nothing allowed to
/// shrink, pushes content off the edge and no page scroll reveals it.
const phone = Size(400, 860);

/// Narrower than any current handset, as a margin.
const smallPhone = Size(320, 640);

FlightStatus flight({
  String number = 'AA1423',
  String airline = 'American Airlines',
  String status = 'Expected',
  String? scheduled = '14:05',
  String? expected,
  int? delayMinutes,
  String delayFrom = '',
  String terminal = '',
  String gate = '',
  String belt = '',
  DateTime? fetchedAt,
  bool stale = false,
}) =>
    FlightStatus(
      found: true,
      number: number,
      airline: airline,
      status: status,
      kind: 'arrival',
      scheduled: scheduled,
      expected: expected,
      delayMinutes: delayMinutes,
      delayFrom: delayFrom,
      terminal: terminal,
      gate: gate,
      baggageBelt: belt,
      fetchedAt: fetchedAt,
      stale: stale,
    );

Future<void> pumpStrip(
  WidgetTester tester,
  FlightStatus? f, {
  Size size = phone,
  bool loading = false,
  DateTime? now,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: Align(
        alignment: Alignment.topCenter,
        child: Padding(
          // The padding the trip card puts around its contents, so the strip
          // is measured at the width it really gets rather than the screen's.
          padding: const EdgeInsets.all(16),
          child: FlightStrip(
            flight: f,
            loading: loading,
            onRefresh: () {},
            now: now ?? DateTime(2026, 11, 1, 14, 0),
          ),
        ),
      ),
    ),
  ));
  await tester.pump(const Duration(milliseconds: 300));
}

void main() {
  group('nothing runs off a phone', () {
    for (final size in const [phone, smallPhone]) {
      testWidgets('a long airline and a big delay fit ${size.width.toInt()}px',
          (tester) async {
        await pumpStrip(
          tester,
          flight(
            number: 'LH 8817',
            airline: 'Lufthansa CityLine operated by Air Dolomiti',
            status: 'Delayed',
            expected: '15:40',
            delayMinutes: 95,
            terminal: 'A',
            gate: 'A44',
            belt: '12',
            fetchedAt: DateTime(2026, 11, 1, 13, 52),
          ),
          size: size,
        );

        // An overflow raises in a test; this is the assertion that it does not.
        expect(tester.takeException(), isNull);

        final strip = tester.getRect(find.byType(FlightStrip));
        expect(strip.left, greaterThanOrEqualTo(0));
        expect(strip.right, lessThanOrEqualTo(size.width),
            reason: 'the strip itself must not exceed the screen');

        // The refresh control is the thing the admin strip lost: it sits after
        // the flexible child, so it is the first casualty of a long name.
        final refresh = tester.getRect(find.byIcon(Icons.refresh));
        expect(refresh.right, lessThanOrEqualTo(size.width),
            reason: 'a long airline name must not push the refresh off the edge');
        expect(refresh.width, greaterThan(0));
      });
    }

    testWidgets('every line of text stays inside the strip', (tester) async {
      await pumpStrip(
        tester,
        flight(
          airline: 'Lufthansa CityLine operated by Air Dolomiti',
          status: 'Delayed',
          expected: '15:40',
          delayMinutes: 95,
          terminal: 'A',
          gate: 'A44',
          belt: '12',
          fetchedAt: DateTime(2026, 11, 1, 13, 52),
        ),
        size: smallPhone,
      );

      final strip = tester.getRect(find.byType(FlightStrip));
      final texts = find.byType(Text);
      expect(texts, findsWidgets);

      for (var i = 0; i < texts.evaluate().length; i++) {
        final box = tester.getRect(texts.at(i));
        final label = tester.widget<Text>(texts.at(i)).data;
        expect(box.right, lessThanOrEqualTo(strip.right + 0.5), reason: '"$label" overflows right');
        expect(box.left, greaterThanOrEqualTo(strip.left - 0.5), reason: '"$label" overflows left');
      }
    });
  });

  group('what the driver reads', () {
    testWidgets('a delay shows the new time and strikes the old one', (tester) async {
      await pumpStrip(
        tester,
        flight(expected: '15:40', delayMinutes: 95),
      );

      expect(find.text('15:40'), findsOneWidget);
      expect(find.text('Sched 14:05'), findsOneWidget);
      expect(find.text('95 min late'), findsOneWidget);

      // Struck through, so the time that no longer applies cannot be misread
      // as the one to drive for.
      final old = tester.widget<Text>(find.text('Sched 14:05'));
      expect(old.style?.decoration, TextDecoration.lineThrough);
    });

    testWidgets('an early flight is flagged as early, not late', (tester) async {
      await pumpStrip(tester, flight(expected: '13:30', delayMinutes: -35));

      expect(find.text('35 min early'), findsOneWidget);
      expect(find.textContaining('late'), findsNothing);
    });

    testWidgets('wheels down says so next to the number', (tester) async {
      await pumpStrip(
        tester,
        flight(expected: '15:20', delayMinutes: 75, delayFrom: 'runway'),
      );

      // Named, because this is not the gate and the gate is what gets billed.
      expect(find.text('75 min late · wheels down'), findsOneWidget);
    });

    testWidgets('on time shows the scheduled time large and unstruck', (tester) async {
      await pumpStrip(tester, flight(status: 'Expected'));

      final t = tester.widget<Text>(find.text('14:05'));
      expect(t.style?.decoration, isNull);
      expect(t.style?.fontWeight, FontWeight.w700);
      // The scheduled time is shown even with nothing wrong, so the driver can
      // see the flight was checked rather than infer it from silence.
      expect(find.textContaining('min late'), findsNothing);
    });

    testWidgets('a four-minute slip is shown but not flagged', (tester) async {
      await pumpStrip(tester, flight(expected: '14:09', delayMinutes: 4));

      expect(find.text('14:09'), findsOneWidget);
      expect(find.textContaining('min late'), findsNothing);
    });

    testWidgets('terminal, gate and belt when the provider knows them', (tester) async {
      await pumpStrip(tester, flight(terminal: 'A', gate: 'A44', belt: '12'));
      expect(find.text('Terminal A · Gate A44 · Belt 12'), findsOneWidget);
    });

    testWidgets('a cancellation is unmissable', (tester) async {
      await pumpStrip(tester, flight(status: 'Canceled'));

      expect(find.text('CANCELED'), findsOneWidget);
      expect(find.byIcon(Icons.airplanemode_inactive), findsOneWidget);
    });
  });

  group('honest about its own age', () {
    testWidgets('says when it last heard', (tester) async {
      await pumpStrip(
        tester,
        flight(fetchedAt: DateTime(2026, 11, 1, 13, 52)),
        now: DateTime(2026, 11, 1, 14, 0),
      );
      expect(find.text('Checked 8 min ago'), findsOneWidget);
    });

    testWidgets('a stale answer is labelled, not passed off as current', (tester) async {
      await pumpStrip(
        tester,
        flight(fetchedAt: DateTime(2026, 11, 1, 13, 35), stale: true),
        now: DateTime(2026, 11, 1, 14, 0),
      );
      expect(find.text('Could not reach the airline — as of 25 min ago'), findsOneWidget);
    });
  });

  group('when there is nothing to show', () {
    testWidgets('a trip with no flight renders nothing at all', (tester) async {
      await pumpStrip(tester, const FlightStatus(found: false, reason: 'no_flight'));

      expect(find.byType(Text), findsNothing);
      // Zero height, not a collapsed box with padding: the card must close up
      // as though the strip were never there.
      expect(tester.getSize(find.byType(FlightStrip)), const Size(0, 0));
    });

    testWidgets('a trip that is not due yet renders nothing', (tester) async {
      await pumpStrip(tester, const FlightStatus(found: false, reason: 'too_early'));
      expect(tester.getSize(find.byType(FlightStrip)), const Size(0, 0));
    });

    testWidgets('a provider that could not answer says so', (tester) async {
      await pumpStrip(tester, const FlightStatus(found: false, reason: 'unavailable'));
      expect(find.text('Flight status unavailable. Check the airline.'), findsOneWidget);
    });

    testWidgets('a flight the airline does not know says that instead', (tester) async {
      await pumpStrip(tester, const FlightStatus(found: false, reason: 'not_found'));
      expect(find.text('The airline has no record of this flight today.'), findsOneWidget);
    });

    testWidgets('loading shows a spinner where the refresh button goes', (tester) async {
      await pumpStrip(tester, null, loading: true);

      expect(find.text('Checking the flight...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsNothing);
    });
  });

  testWidgets('the warning does not depend on an animation finishing', (tester) async {
    // The offline banner is rendered unconditionally for this reason, and a
    // delay is the same kind of fact: it has to be on screen on the first
    // frame, not after a transition that a throttled device may never run.
    await pumpStrip(tester, flight(expected: '15:40', delayMinutes: 95));
    await tester.pump();

    final delay = tester.getRect(find.text('95 min late'));
    expect(delay.width, greaterThan(0));
    expect(delay.height, greaterThan(0));
  });
}
