import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:dbl_driver/models/trip.dart';
import 'package:dbl_driver/screens/name_board_screen.dart';

/// The name board.
///
/// Verified here rather than by eye. Flutter web draws to a canvas, and the
/// browser pane's screenshots of it under viewport emulation came back tiled
/// and clipped — a layout that was fine looked broken, which is worse than no
/// check at all. A widget test measures the real render tree at a real size.
///
/// What matters is that a long name never runs off the board. This is the one
/// screen a paying customer sees, in a hall full of people holding signs.
Trip tripFor(String name, {String airline = '', String flight = ''}) => Trip(
      id: 'trip-1',
      reference: 'DBL-ABC123',
      status: 'Confirmed',
      serviceType: 'Airport Transportation',
      pickupDate: '2026-12-20',
      pickupTime: '18:03',
      pickupAt: null,
      pickupLocation: 'Denver International Airport',
      dropoffLocation: 'The Westin Denver Downtown',
      passengerName: name,
      passengerPhone: '3035550199',
      passengers: '1',
      luggage: '2',
      vehicle: 'Executive SUV',
      additionalStops: '',
      airlineName: airline,
      flightNumber: flight,
      terminal: 'West Terminal',
      airportDirection: 'Arrival',
      specialRequests: '',
      dispatchNotes: '',
      pay: '95.00',
      driverStatus: 'arrived',
      statusAt: null,
      arrivedAt: null,
    );

Future<void> pumpBoard(WidgetTester tester, Trip trip, Size size) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(MaterialApp(home: NameBoardScreen(trip: trip)));
  await tester.pump(const Duration(milliseconds: 300));
}

void main() {
  group('the name fits the board', () {
    for (final name in const [
      'Ana Li',
      'Tatiana Jimenez',
      'Mr. Christopher Vandenberghe',
      'Dr. Wilhelmina Oyelaran-Fitzgerald III',
    ]) {
      testWidgets('"$name" stays on the board in portrait', (tester) async {
        await pumpBoard(tester, tripFor(name), const Size(400, 860));

        // An overflow raises; this is the assertion that a long name does not
        // run off the edge.
        expect(tester.takeException(), isNull);

        final text = tester.widget<Text>(find.text(name));
        expect(text.maxLines, 1, reason: 'a name must never wrap mid-word on a sign');

        final box = tester.getRect(find.text(name));
        expect(box.left, greaterThanOrEqualTo(-0.5));
        expect(box.right, lessThanOrEqualTo(400.5),
            reason: 'the whole name has to be readable across a hall');
      });

      testWidgets('"$name" stays on the board held sideways', (tester) async {
        await pumpBoard(tester, tripFor(name), const Size(860, 400));
        expect(tester.takeException(), isNull);
        final box = tester.getRect(find.text(name));
        expect(box.right, lessThanOrEqualTo(860.5));
      });
    }
  });

  group('what else is on it', () {
    testWidgets('the company is named, below the passenger in weight', (tester) async {
      await pumpBoard(tester, tripFor('Tatiana Jimenez'), const Size(400, 860));

      expect(find.text('DENVER BLACK LIMO'), findsOneWidget);

      final company = tester.widget<Text>(find.text('DENVER BLACK LIMO'));
      final passenger = tester.widget<Text>(find.text('Tatiana Jimenez'));
      expect(
        company.style!.fontSize!,
        lessThan(passenger.style!.fontSize!),
        reason: 'the guest is the subject of the board, not the firm',
      );
    });

    testWidgets('the flight is shown, so two Smiths can tell the cars apart', (tester) async {
      await pumpBoard(
        tester,
        tripFor('John Smith', airline: 'United Airlines', flight: 'UA 761'),
        const Size(400, 860),
      );
      expect(find.text('UNITED AIRLINES UA 761'), findsOneWidget);
    });

    testWidgets('no flight, no empty line', (tester) async {
      await pumpBoard(tester, tripFor('John Smith'), const Size(400, 860));
      expect(find.textContaining('UA'), findsNothing);
    });

    testWidgets('a booking with no name still produces a usable board', (tester) async {
      await pumpBoard(tester, tripFor('   '), const Size(400, 860));
      expect(tester.takeException(), isNull);
      expect(find.text('Our guest'), findsOneWidget,
          reason: 'better a courteous placeholder than a blank sign');
    });

    testWidgets('tapping hides the controls without leaving the board', (tester) async {
      await pumpBoard(tester, tripFor('Tatiana Jimenez'), const Size(400, 860));

      final chrome = find.byTooltip('Close the name board');
      expect(tester.widget<AnimatedOpacity>(
        find.ancestor(of: chrome, matching: find.byType(AnimatedOpacity)).first,
      ).opacity, 1.0);

      await tester.tap(find.text('Tatiana Jimenez'), warnIfMissed: false);
      await tester.pump(const Duration(milliseconds: 300));

      expect(tester.widget<AnimatedOpacity>(
        find.ancestor(of: chrome, matching: find.byType(AnimatedOpacity)).first,
      ).opacity, 0.0);
      // Still on the board — a brush against the screen must not dismiss it.
      expect(find.text('Tatiana Jimenez'), findsOneWidget);
    });
  });
}
