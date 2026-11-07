import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:dbl_driver/api/api_client.dart';
import 'package:dbl_driver/api/auth_store.dart';
import 'package:dbl_driver/api/driver_api.dart';
import 'package:dbl_driver/api/pending_status.dart';
import 'package:dbl_driver/models/trip.dart';

/// The offline queue.
///
/// This is the part of the app that decides whether a press made in a canyon
/// survives, so the cases worth testing are the unhappy ones: a refusal that
/// will never succeed must not sit at the head of the queue forever, and a
/// refusal that might succeed must not be thrown away.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // flutter_secure_storage speaks over a platform channel the test runner does
  // not have. Answer it from a map; the queue's own logic is what is under
  // test, not the Keychain.
  late Map<String, String> vault;

  setUp(() {
    vault = <String, String>{};
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async {
        final args = (call.arguments as Map?)?.cast<String, dynamic>() ?? {};
        switch (call.method) {
          case 'write':
            vault[args['key'] as String] = args['value'] as String;
            return null;
          case 'read':
            return vault[args['key'] as String];
          case 'delete':
            vault.remove(args['key'] as String);
            return null;
          case 'deleteAll':
            vault.clear();
            return null;
          case 'readAll':
            return vault;
          default:
            return null;
        }
      },
    );
  });

  PendingStatus entry({
    required String id,
    String driverId = 'driver-1',
    String tripId = 'trip-1',
    String status = 'arrived',
    DateTime? at,
  }) =>
      PendingStatus(
        id: id,
        driverId: driverId,
        tripId: tripId,
        status: status,
        occurredAt: at ?? DateTime.now().toUtc(),
      );

  group('the queue itself', () {
    test('survives a restart', () async {
      final first = PendingQueue();
      await first.load();
      await first.add(entry(id: 'a'));
      await first.add(entry(id: 'b', status: 'on_board'));

      // A second instance reads the same storage, as a relaunch would.
      final second = PendingQueue();
      await second.load();

      expect(second.length, 2);
      expect(second.items.map((e) => e.status), ['arrived', 'on_board']);
    });

    test('a corrupt row is skipped without losing the good ones', () async {
      vault['dbl_pending_status'] = jsonEncode([
        {'id': 'good', 'driverId': 'd', 'tripId': 't', 'status': 'arrived', 'occurredAt': '2026-10-30T12:00:00Z'},
        {'id': 'bad', 'tripId': 't'}, // no driverId, no status, no time
        'not even a map',
      ]);

      final q = PendingQueue();
      await q.load();

      expect(q.length, 1);
      expect(q.items.single.id, 'good');
    });

    test('unreadable storage starts clean rather than failing to launch', () async {
      vault['dbl_pending_status'] = 'this is not json';
      final q = PendingQueue();
      await q.load();
      expect(q.isEmpty, isTrue);
    });

    test('the overlay shows the latest status but the earliest arrival', () async {
      final q = PendingQueue();
      await q.load();
      final base = DateTime.utc(2026, 10, 30, 14);
      await q.add(entry(id: '1', status: 'arrived', at: base));
      // A second arrival — a driver correcting themselves. The server only
      // ever keeps the first, so the card must agree with it.
      await q.add(entry(id: '2', status: 'arrived', at: base.add(const Duration(minutes: 5))));
      await q.add(entry(id: '3', status: 'on_board', at: base.add(const Duration(minutes: 20))));

      final o = q.overlayFor('trip-1')!;
      expect(o.status, 'on_board');
      expect(o.arrivedAt, base);
      expect(o.count, 3);
      expect(q.overlayFor('other-trip'), isNull);
    });

    test('presses too old for the server to time correctly are dropped', () async {
      final q = PendingQueue();
      await q.load();
      final now = DateTime.utc(2026, 10, 30, 12);
      await q.add(entry(id: 'fresh', at: now.subtract(const Duration(days: 2))));
      await q.add(entry(id: 'stale', at: now.subtract(const Duration(days: 8))));

      expect(await q.dropExpired(now: now), 1);
      expect(q.items.single.id, 'fresh');
    });

    test('the cap keeps the newest presses, not the oldest', () async {
      final q = PendingQueue();
      await q.load();
      for (var i = 0; i < PendingQueue.maxEntries + 5; i++) {
        await q.add(entry(id: 'e$i'));
      }
      expect(q.length, PendingQueue.maxEntries);
      expect(q.items.last.id, 'e${PendingQueue.maxEntries + 4}');
      expect(q.items.first.id, 'e5');
    });
  });

  group('sending what is queued', () {
    late AuthStore store;
    late PendingQueue queue;
    late List<String> sentTripPaths;

    Future<DriverApi> apiThat(Future<http.Response> Function(http.Request) handler) async {
      store = AuthStore();
      await store.load();
      await store.saveTokens(access: 'access-token', refresh: 'refresh-token');
      await store.saveDriver({'id': 'driver-1', 'name': 'Marcus Bell'});
      queue = PendingQueue();
      await queue.load();
      return DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((req) async {
            sentTripPaths.add(req.url.path);
            return handler(req);
          }),
        ),
        store: store,
        pending: queue,
      );
    }

    setUp(() => sentTripPaths = []);

    test('no connection queues the press instead of losing it', () async {
      final api = await apiThat((_) async => throw const SocketException('no route to host'));

      final how = await api.setTripStatus(tripId: 'trip-1', status: 'arrived');

      expect(how, StatusDelivery.queued);
      expect(api.pending.length, 1);
      expect(api.pending.items.single.driverId, 'driver-1');
    });

    test('a press that got through is not queued', () async {
      final api = await apiThat((_) async => http.Response('{"ok":true}', 200));
      expect(await api.setTripStatus(tripId: 'trip-1', status: 'arrived'), StatusDelivery.sent);
      expect(api.pending.isEmpty, isTrue);
    });

    test('the original time is sent, not the time it synced', () async {
      // Relative to now, not a fixed date. The queue drops anything older
      // than seven days, so a hardcoded timestamp makes this pass on the day
      // it is written and fail a week later for no visible reason.
      final pressedAt = DateTime.now().toUtc().subtract(const Duration(minutes: 30));
      var body = <String, dynamic>{};

      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.setTripStatus(tripId: 'trip-1', status: 'arrived', occurredAt: pressedAt);

      // Back in signal half an hour later.
      final online = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((req) async {
            body = jsonDecode(req.body) as Map<String, dynamic>;
            return http.Response('{"ok":true}', 200);
          }),
        ),
        store: store,
        pending: queue,
      );
      final out = await online.flushPending();

      expect(out.sent, 1);
      expect(body['occurredAt'], pressedAt.toIso8601String());
      expect(queue.isEmpty, isTrue);
    });

    test('a refusal that will never succeed is dropped, not retried forever', () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.setTripStatus(tripId: 'gone', status: 'arrived');
      await api.setTripStatus(tripId: 'trip-1', status: 'on_board');

      // The first trip was cancelled while the phone was out of signal.
      var call = 0;
      final online = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((req) async {
            call++;
            return req.url.path.contains('gone')
                ? http.Response('{"error":"Trip not found"}', 404)
                : http.Response('{"ok":true}', 200);
          }),
        ),
        store: store,
        pending: queue,
      );
      final out = await online.flushPending();

      expect(call, 2, reason: 'the dropped entry must not block the one behind it');
      expect(out.sent, 1);
      expect(out.dropped, 1);
      expect(queue.isEmpty, isTrue);
    });

    test('a server error keeps the press and stops, preserving order', () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.setTripStatus(tripId: 'trip-1', status: 'arrived');
      await api.setTripStatus(tripId: 'trip-1', status: 'on_board');

      var calls = 0;
      final flaky = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async {
            calls++;
            return http.Response('{"error":"Could not record that."}', 500);
          }),
        ),
        store: store,
        pending: queue,
      );
      final out = await flaky.flushPending();

      expect(calls, 1, reason: 'stop at the first retryable failure');
      expect(out.sent, 0);
      expect(out.dropped, 0);
      expect(queue.length, 2);
      expect(queue.items.first.status, 'arrived', reason: 'order must hold');
    });

    test("another driver's presses are left alone", () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.setTripStatus(tripId: 'trip-1', status: 'arrived');

      // The handset goes to the next shift.
      await store.saveDriver({'id': 'driver-2', 'name': 'David Okonkwo'});

      var calls = 0;
      final next = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async {
            calls++;
            return http.Response('{"ok":true}', 200);
          }),
        ),
        store: store,
        pending: queue,
      );
      final out = await next.flushPending();

      expect(calls, 0);
      expect(out.sent, 0);
      expect(queue.length, 1, reason: "the first driver's evidence is still theirs");
    });

    test('two overlapping flushes do not send the same press twice', () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.setTripStatus(tripId: 'trip-1', status: 'arrived');

      var calls = 0;
      final online = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async {
            calls++;
            // Long enough that the second flush starts while this is in flight.
            await Future<void>.delayed(const Duration(milliseconds: 40));
            return http.Response('{"ok":true}', 200);
          }),
        ),
        store: store,
        pending: queue,
      );

      await Future.wait([online.flushPending(), online.flushPending()]);

      expect(calls, 1, reason: 'an append-only log would record a double send as two presses');
      expect(queue.isEmpty, isTrue);
    });
  });

  group('what the driver sees while it waits', () {
    Trip tripWith({String status = '', DateTime? arrivedAt}) => Trip(
          id: 'trip-1',
          reference: 'DBL-1',
          status: 'Confirmed',
          serviceType: 'Airport Transportation',
          pickupDate: '2026-12-20',
          pickupTime: '18:03',
          pickupAt: null,
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
          pay: '0',
          driverStatus: status,
          statusAt: null,
          arrivedAt: arrivedAt,
        );

      test('the wait counter runs from an arrival that has not synced', () {
      final pressedAt = DateTime.utc(2026, 10, 30, 14, 23);
      final now = pressedAt.add(const Duration(minutes: 22));

      // Nothing has reached the server, so without the override this is null —
      // and the one number that turns into money would read as no wait at all.
      expect(tripWith().waitingFor(now), isNull);
      expect(
        tripWith().waitingFor(now, queuedArrivedAt: pressedAt, queuedStatus: 'arrived')?.inMinutes,
        22,
      );
    });

    test('the counter stops once the passenger is aboard, synced or not', () {
      final pressedAt = DateTime.utc(2026, 10, 30, 14, 23);
      final now = pressedAt.add(const Duration(minutes: 40));
      expect(
        tripWith(arrivedAt: pressedAt).waitingFor(now, queuedStatus: 'on_board'),
        isNull,
      );
    });

    test("the server's arrival wins, because an arrival is never moved", () {
      final recorded = DateTime.utc(2026, 10, 30, 14, 23);
      final later = recorded.add(const Duration(minutes: 9));
      final now = recorded.add(const Duration(minutes: 30));

      expect(
        tripWith(arrivedAt: recorded).waitingFor(now, queuedArrivedAt: later)?.inMinutes,
        30,
      );
    });
  });
}
