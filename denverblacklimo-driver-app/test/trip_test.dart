import 'package:flutter_test/flutter_test.dart';
import 'package:dbl_driver/models/trip.dart';

/// Guards the parsing, because this API's types are not what Dart assumes.
///
/// Every case here is something the backend genuinely sends: dates as text
/// rather than timestamps, numbers as strings, and nulls on fields that are
/// always present on newer bookings. A cast would throw on any of them, and a
/// chauffeur would see an empty schedule rather than their morning.
void main() {
  group('Trip.fromJson', () {
    test('reads a complete airport trip', () {
      final t = Trip.fromJson({
        'id': 'abc',
        'reference': 'DBL-823DF0',
        'status': 'Confirmed',
        'service_type': 'Airport Transportation',
        'pickup_date': '2026-12-20',
        'pickup_time': '18:03',
        'pickup_at': '2026-12-20T18:03:00.000Z',
        'pickup_location': 'Denver International Airport',
        'dropoff_location': 'The Westin Denver Downtown',
        'passenger_name': 'Tatiana Jimenez',
        'passenger_phone': '(562) 396-2259',
        'passengers': '1',
        'airline_name': 'United Airlines',
        'flight_number': '1263',
        'airport_direction': 'Arrival',
        'driver_pay': r'$140 flat',
      });

      expect(t.reference, 'DBL-823DF0');
      expect(t.isAirport, isTrue);
      expect(t.isArrival, isTrue);
      expect(t.flightLabel, 'United Airlines 1263');
      // The name board shows the surname, matching the dispatch email.
      expect(t.signName, 'JIMENEZ');
      // Fifteen minutes before the pick-up.
      expect(t.pickupAt!.difference(t.spotTime!), const Duration(minutes: 15));
    });

    test('survives a row with nulls throughout', () {
      final t = Trip.fromJson({'id': 'x'});

      expect(t.pickupDate, '');
      expect(t.passengerName, '');
      expect(t.pickupAt, isNull);
      expect(t.spotTime, isNull);
      expect(t.signName, '');
      expect(t.isAirport, isFalse);
    });

    test('does not choke on a malformed date', () {
      // pickup_date is VARCHAR, so anything can be in it.
      final t = Trip.fromJson({
        'id': 'x',
        'pickup_date': 'not a date',
        'pickup_time': '',
        'pickup_at': null,
      });

      expect(t.pickupDate, 'not a date');
      expect(t.pickupAt, isNull);
    });

    test('accepts numbers however the database sends them', () {
      // Postgres NUMERIC arrives as a string; plain integers arrive as ints.
      final asString = Trip.fromJson({'id': 'x', 'passengers': '3', 'luggage': '2'});
      final asNumber = Trip.fromJson({'id': 'x', 'passengers': 3, 'luggage': 2});

      expect(asString.passengers, '3');
      expect(asNumber.passengers, '3');
      expect(asNumber.luggage, '2');
    });

    test('builds a route link from both ends of the trip', () {
      final t = Trip.fromJson({
        'id': 'x',
        'pickup_location': 'Denver International Airport',
        'dropoff_location': 'Vail, Colorado',
      });

      final url = t.mapsUri.toString();
      expect(url, contains('Denver%20International%20Airport'));
      expect(url, contains('Vail%2C%20Colorado'));
    });
  });
}
