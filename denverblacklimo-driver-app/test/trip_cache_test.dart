import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:dbl_driver/api/api_client.dart';
import 'package:dbl_driver/api/auth_store.dart';
import 'package:dbl_driver/api/driver_api.dart';
import 'package:dbl_driver/api/pending_photo.dart';
import 'package:dbl_driver/api/pending_status.dart';
import 'package:dbl_driver/api/trip_cache.dart';

/// Reading trips with no signal.
///
/// The interesting cases are the ones where falling back would be wrong: an
/// expired session and a server error both need acting on, and showing a
/// cheerful day-old list instead would hide them.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Map<String, String> vault;
  late Directory tmp;

  setUp(() async {
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
          default:
            return null;
        }
      },
    );
    tmp = await Directory.systemTemp.createTemp('dbl_cache_test');
  });

  tearDown(() async {
    if (await tmp.exists()) await tmp.delete(recursive: true);
  });

  late AuthStore store;
  late TripCache cache;

  Future<DriverApi> apiThat(Future<http.Response> Function(http.Request) handler) async {
    store = AuthStore();
    await store.load();
    await store.saveTokens(access: 'access-token', refresh: 'refresh-token');
    await store.saveDriver({'id': 'driver-1', 'name': 'Marcus Bell'});
    cache = TripCache();
    final pending = PendingQueue();
    await pending.load();
    return DriverApi(
      client: ApiClient(
        baseUrl: 'https://example.test/api',
        store: store,
        httpClient: MockClient(handler),
      ),
      store: store,
      pending: pending,
      photos: PendingPhotoQueue(directory: tmp),
      cache: cache,
    );
  }

  group('trips with no signal', () {
    test('a good answer is kept', () async {
      final api = await apiThat((_) async => http.Response('[$_json]', 200));
      final fresh = await api.trips();

      expect(fresh.isStale, isFalse);
      expect(fresh.trips.single.passengerName, 'Tatiana Jimenez');

      final saved = await cache.read(scope: 'upcoming', driverId: 'driver-1');
      expect(saved, isNotNull);
      expect(saved!.trips.single.id, 'trip-1');
    });

    test('with no connection the last answer is shown, marked as of its time', () async {
      final online = await apiThat((_) async => http.Response('[$_json]', 200));
      await online.trips();

      // Same session and the same cache, on a client that reaches nothing.
      final offline = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async => throw const SocketException('no signal')),
        ),
        store: store,
        pending: PendingQueue(),
        photos: PendingPhotoQueue(directory: tmp),
        cache: cache,
      );

      final result = await offline.trips();

      expect(result.isStale, isTrue);
      expect(result.cachedAt, isNotNull);
      expect(result.trips.single.pickupLocation, 'Denver International Airport');
      expect(result.trips.single.passengerPhone, '3035550199',
          reason: 'the number to call is the whole point of working offline');
    });

    test('with no connection and nothing saved, the failure still surfaces', () async {
      final api = await apiThat((_) async => throw const SocketException('no signal'));
      await expectLater(api.trips(), throwsA(isA<ApiException>()));
    });

    test('an expired session is never papered over with a stale list', () async {
      final online = await apiThat((_) async => http.Response('[$_json]', 200));
      await online.trips();

      final expired = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          // 403 with no refresh token stored is the end of the session.
          httpClient: MockClient((_) async => http.Response('{"error":"expired"}', 403)),
        ),
        store: store,
        pending: PendingQueue(),
        photos: PendingPhotoQueue(directory: tmp),
        cache: cache,
      );

      await expectLater(
        expired.trips(),
        throwsA(isA<ApiException>().having((e) => e.needsSignIn, 'needsSignIn', isTrue)),
        reason: 'the driver has to sign in again, not read yesterday’s list',
      );
    });

    test('a server error is not treated as being offline', () async {
      final online = await apiThat((_) async => http.Response('[$_json]', 200));
      await online.trips();

      final broken = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async => http.Response('{"error":"boom"}', 500)),
        ),
        store: store,
        pending: PendingQueue(),
        photos: PendingPhotoQueue(directory: tmp),
        cache: cache,
      );

      await expectLater(broken.trips(), throwsA(isA<ApiException>()));
    });
  });

  group('whose trips they are', () {
    test("the next shift does not see the last driver's passengers", () async {
      final api = await apiThat((_) async => http.Response('[$_json]', 200));
      await api.trips();

      // The handset is handed over.
      await store.saveDriver({'id': 'driver-2', 'name': 'David Okonkwo'});

      expect(await cache.read(scope: 'upcoming', driverId: 'driver-2'), isNull);

      final offline = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async => throw const SocketException('no signal')),
        ),
        store: store,
        pending: PendingQueue(),
        photos: PendingPhotoQueue(directory: tmp),
        cache: cache,
      );

      await expectLater(
        offline.trips(),
        throwsA(isA<ApiException>()),
        reason: 'better an error than another driver’s passenger list',
      );
    });

    test('signing out leaves no passenger list on the phone', () async {
      final api = await apiThat((_) async => http.Response('[$_json]', 200));
      await api.trips();
      expect(await cache.read(scope: 'upcoming', driverId: 'driver-1'), isNotNull);

      await api.signOut();

      expect(
        vault.keys.where((k) => k.startsWith('dbl_trips_')),
        isEmpty,
        reason: 'names, numbers and addresses must not outlive the session',
      );
    });
  });
}

/// One row, as the API sends it.
const _json = '''
{"id":"trip-1","reference":"DBL-ABC123","status":"Confirmed",
 "service_type":"Airport Transportation","pickup_date":"2026-12-20","pickup_time":"18:03",
 "pickup_location":"Denver International Airport","dropoff_location":"The Westin Denver Downtown",
 "passenger_name":"Tatiana Jimenez","passenger_phone":"3035550199",
 "passengers":"1","luggage":"0","driver_pay":"95.00"}
''';
