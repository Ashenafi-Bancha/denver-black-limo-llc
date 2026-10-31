import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:dbl_driver/models/trip.dart';
import 'package:dbl_driver/widgets/day_summary.dart';

/// What today comes to.
///
/// The number a driver plans their evening around, so the cases that matter
/// are the ones where it could overstate: a trip already finished, a trip
/// tomorrow, and a fee that is a string rather than a number.
Trip tripAt(DateTime? when, {String pay = '95.00', String status = ''}) => Trip(
      id: 'trip-${when?.millisecondsSinceEpoch ?? 0}-$status',
      reference: 'DBL-ABC123',
      status: 'Confirmed',
      serviceType: 'Airport Transportation',
      pickupDate: '2026-12-20',
      pickupTime: '18:03',
      pickupAt: when,
      pickupLocation: 'DEN',
      dropoffLocation: 'The Westin',
      passengerName: 'Tatiana Jimenez',
      passengerPhone: '3035550199',
      passengers: '1',
      luggage: '0',
      vehicle: '',
      additionalStops: '',
      airlineName: '',
      flightNumber: '',
      terminal: '',
      airportDirection: '',
      specialRequests: '',
      dispatchNotes: '',
      pay: pay,
      driverStatus: status,
      statusAt: null,
      arrivedAt: null,
    );

void main() {
  final now = DateTime(2026, 10, 31, 9);
  final laterToday = DateTime(2026, 10, 31, 17, 30);
  final alsoToday = DateTime(2026, 10, 31, 21);
  final tomorrow = DateTime(2026, 11, 1, 8);

  group('the fee is a string, not a number', () {
    test('it is parsed, never cast', () {
      expect(tripAt(now, pay: '95.00').payAmount, 95.0);
      expect(tripAt(now, pay: '1234.50').payLabel, r'$1234.50');
    });

    test(r'an empty or zero fee reads as nothing, not as $0.00', () {
      expect(tripAt(now, pay: '').payAmount, isNull);
      expect(tripAt(now, pay: '0.00').payAmount, isNull);
      expect(tripAt(now, pay: '').payLabel, '');
    });

    test('a fee that already carries a symbol still parses', () {
      expect(tripAt(now, pay: r'$120.00').payAmount, 120.0);
    });
  });

  group('what is counted', () {
    test('only trips still to come today', () {
      final summary = DaySummary.forToday([
        tripAt(laterToday),
        tripAt(alsoToday),
        tripAt(tomorrow),
      ], now);

      expect(summary, isNotNull);
      expect(summary!.count, 2, reason: 'tomorrow is not today');
      expect(summary.total, 190.0);
    });

    test('a trip already finished is not counted again', () {
      final summary = DaySummary.forToday([
        tripAt(laterToday),
        tripAt(alsoToday, status: 'dropped_off'),
      ], now);

      expect(summary!.count, 1);
      expect(summary.total, 95.0,
          reason: 'a total including this morning is one someone plans around and finds wrong');
    });

    test('a no-show is finished too', () {
      final summary = DaySummary.forToday([
        tripAt(laterToday),
        tripAt(alsoToday, status: 'no_show'),
      ], now);
      expect(summary!.count, 1);
    });

    test('a trip with no usable time is left out rather than guessed at', () {
      final summary = DaySummary.forToday([tripAt(laterToday), tripAt(null)], now);
      expect(summary!.count, 1);
    });

    test('nothing left today shows nothing at all', () {
      expect(DaySummary.forToday([tripAt(tomorrow)], now), isNull);
      expect(DaySummary.forToday([], now), isNull);
      expect(
        DaySummary.forToday([tripAt(laterToday, status: 'dropped_off')], now),
        isNull,
        reason: 'an empty strip saying "0 trips" is noise',
      );
    });
  });

  group('how it reads', () {
    Future<void> pump(WidgetTester tester, DaySummary s) =>
        tester.pumpWidget(MaterialApp(home: Scaffold(body: s)));

    testWidgets('one trip is not "1 trips"', (tester) async {
      await pump(tester, const DaySummary(count: 1, total: 95));
      expect(find.text('1 trip left today'), findsOneWidget);
      expect(find.text(r'$95.00'), findsOneWidget);
    });

    testWidgets('several trips read naturally', (tester) async {
      await pump(tester, const DaySummary(count: 3, total: 285.5));
      expect(find.text('3 trips left today'), findsOneWidget);
      expect(find.text(r'$285.50'), findsOneWidget);
    });

    testWidgets('no fee on the day means no figure, not zero', (tester) async {
      await pump(tester, const DaySummary(count: 2, total: 0));
      expect(find.text('2 trips left today'), findsOneWidget);
      expect(find.textContaining(r'$'), findsNothing);
    });
  });
}
