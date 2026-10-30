@Tags(['integration'])
library;

import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dbl_driver/api/api_client.dart';
import 'package:dbl_driver/api/auth_store.dart';
import 'package:dbl_driver/api/driver_api.dart';

/// Exercises the real client against a real backend.
///
/// Everything else in this suite is pure Dart. This one needs a server, and it
/// exists because the parts most likely to break are the parts that only show
/// up when the two sides actually talk: whether a 403 is understood as "sign
/// in again", whether a refresh token really rotates, and whether the trip
/// payload parses when it comes from Postgres rather than from a literal in a
/// test file.
///
/// Run it with a backend up and seeded:
///
///   flutter test test/api_integration_test.dart \
///     --dart-define=API_BASE_URL=http://localhost:3010/api \
///     --dart-define=DRIVER_EMAIL=marcus@example.com \
///     --dart-define=DRIVER_PASSWORD=...
///
/// It skips itself rather than failing when no server is reachable, so a
/// normal `flutter test` on a machine with nothing running stays green.
void main() {
  const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  const email = String.fromEnvironment('DRIVER_EMAIL', defaultValue: '');
  const password = String.fromEnvironment('DRIVER_PASSWORD', defaultValue: '');

  TestWidgetsFlutterBinding.ensureInitialized();

  // flutter_test installs an HttpClient that refuses every real request, so
  // that an ordinary unit test can never silently depend on the network.
  // This suite is the exception: its whole point is the real conversation.
  HttpOverrides.global = null;

  // flutter_secure_storage talks to the platform over a channel that does not
  // exist in a test runner, so it is answered from a map instead. The store's
  // own logic is still the thing under test.
  final vault = <String, String>{};
  setUp(() {
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
          case 'readAll':
            return Map<String, String>.from(vault);
          case 'deleteAll':
            vault.clear();
            return null;
          case 'containsKey':
            return vault.containsKey(args['key'] as String);
        }
        return null;
      },
    );
  });

  Future<bool> serverUp() async {
    if (baseUrl.isEmpty) return false;
    try {
      final uri = Uri.parse(baseUrl);
      final socket = await Socket.connect(uri.host, uri.port, timeout: const Duration(seconds: 2));
      socket.destroy();
      return true;
    } catch (_) {
      return false;
    }
  }

  group('driver app against a live API', () {
    late DriverApi api;
    late AuthStore store;

    setUp(() {
      store = AuthStore();
      api = DriverApi(client: ApiClient(baseUrl: baseUrl, store: store), store: store);
    });

    test('signs in, stores the session, and reads back the trips', () async {
      if (!await serverUp()) {
        markTestSkipped('No backend at $baseUrl');
        return;
      }

      final driver = await api.signIn(email: email, password: password, device: 'Integration test');
      expect(driver['name'], isNotEmpty);
      expect(store.accessToken, isNotNull);
      expect(store.refreshToken, isNotNull);
      expect(store.isSignedIn, isTrue);

      final me = await api.me();
      expect(me['email'].toString().toLowerCase(), email.toLowerCase());

      final trips = await api.trips();
      // The seed assigns two trips to this driver and none of them is anyone
      // else's — scoping is enforced by the token, not by a parameter.
      expect(trips, isNotEmpty);
      for (final t in trips) {
        expect(t.reference, startsWith('DBL-'));
        expect(t.passengerName, isNotEmpty);
      }
    });

    test('a wrong password is refused without saving anything', () async {
      if (!await serverUp()) {
        markTestSkipped('No backend at $baseUrl');
        return;
      }

      await expectLater(
        api.signIn(email: email, password: 'definitely-not-the-password'),
        throwsA(isA<ApiException>()),
      );
      expect(store.isSignedIn, isFalse);
    });

    test('a dead access token is refreshed and the call retried', () async {
      if (!await serverUp()) {
        markTestSkipped('No backend at $baseUrl');
        return;
      }

      await api.signIn(email: email, password: password);
      final firstRefresh = store.refreshToken;

      // Exactly what an expired token looks like to the client: well-formed,
      // correctly signed once, and no longer accepted.
      await store.saveTokens(access: 'not.a.valid.token', refresh: firstRefresh!);

      final trips = await api.trips();
      expect(trips, isNotEmpty, reason: 'the call should have succeeded after a refresh');
      expect(store.accessToken, isNot('not.a.valid.token'), reason: 'a new access token was stored');
      expect(store.refreshToken, isNot(firstRefresh), reason: 'refresh tokens rotate on use');
    });

    test('signing out clears the device even though the server also hears it', () async {
      if (!await serverUp()) {
        markTestSkipped('No backend at $baseUrl');
        return;
      }

      await api.signIn(email: email, password: password);
      expect(store.isSignedIn, isTrue);

      await api.signOut();
      expect(store.isSignedIn, isFalse);
      expect(store.accessToken, isNull);
      expect(store.driver, isNull);
    });
  });
}
