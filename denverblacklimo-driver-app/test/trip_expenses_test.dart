import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:dbl_driver/api/api_client.dart';
import 'package:dbl_driver/api/auth_store.dart';
import 'package:dbl_driver/api/driver_api.dart';
import 'package:dbl_driver/api/pending_status.dart';
import 'package:dbl_driver/widgets/trip_expenses.dart';

import 'package:flutter/services.dart';

/// Tolls and parking.
///
/// This is money, so the cases that matter are the ones that would put a wrong
/// figure on an invoice or leave a driver out of pocket: an unusable amount
/// accepted, or a total that concatenates the strings the API returns instead
/// of adding them.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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
          default:
            return null;
        }
      },
    );
  });

  Future<DriverApi> apiThat(Future<http.Response> Function(http.Request) handler) async {
    final store = AuthStore();
    await store.load();
    await store.saveTokens(access: 'a', refresh: 'r');
    await store.saveDriver({'id': 'driver-1', 'name': 'Marcus Bell'});
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
    );
  }

  Future<void> pumpSheet(WidgetTester tester, DriverApi api) async {
    tester.view.physicalSize = const Size(400, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: TripExpenseSheet(api: api, tripId: 'trip-1')),
    ));
    await tester.pumpAndSettle();
  }

  group('what can be recorded', () {
    testWidgets('nothing can be sent until there is a usable amount', (tester) async {
      final api = await apiThat((_) async => http.Response('[]', 200));
      await pumpSheet(tester, api);

      expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);

      await tester.enterText(find.byType(TextField).first, '0');
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull,
          reason: 'a zero toll is a mistake, not an expense');

      await tester.enterText(find.byType(TextField).first, '13.50');
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNotNull);
    });

    testWidgets('the amount goes up as a number, not a formatted string', (tester) async {
      Object? sentAmount;
      String? sentKind;

      final api = await apiThat((req) async {
        if (req.method == 'POST') {
          final body = req.body;
          sentAmount = RegExp(r'"amount":([0-9.]+)').firstMatch(body)?.group(1);
          sentKind = RegExp(r'"kind":"([a-z]+)"').firstMatch(body)?.group(1);
          return http.Response('{"ok":true}', 201);
        }
        return http.Response('[]', 200);
      });
      await pumpSheet(tester, api);

      await tester.tap(find.text('Parking'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, '28.00');
      await tester.pumpAndSettle();
      await tester.tap(find.byType(FilledButton));
      await tester.pumpAndSettle();

      expect(sentAmount, '28.0');
      expect(sentKind, 'parking');
    });

    testWidgets('a refusal from the server is shown, not swallowed', (tester) async {
      final api = await apiThat((req) async => req.method == 'POST'
          ? http.Response('{"error":"That is over the \$2000 limit. Call dispatch."}', 400)
          : http.Response('[]', 200));
      await pumpSheet(tester, api);

      await tester.enterText(find.byType(TextField).first, '2500');
      await tester.pumpAndSettle();
      await tester.tap(find.byType(FilledButton));
      await tester.pumpAndSettle();

      expect(find.textContaining('over the'), findsOneWidget);
    });
  });

  group('what has already been recorded', () {
    testWidgets('the total adds the amounts rather than joining them', (tester) async {
      // Exactly as node-pg hands NUMERIC back: as strings.
      final api = await apiThat((_) async => http.Response(
            '[{"id":"1","kind":"toll","amount":"13.50","note":"E-470"},'
            '{"id":"2","kind":"parking","amount":"28.00","note":null}]',
            200,
          ));
      await pumpSheet(tester, api);

      expect(find.text(r'$13.50'), findsOneWidget);
      expect(find.text(r'$28.00'), findsOneWidget);
      expect(find.text(r'$41.50'), findsOneWidget,
          reason: 'string concatenation would read 13.5028.00');
    });

    testWidgets('an empty trip says so plainly', (tester) async {
      final api = await apiThat((_) async => http.Response('[]', 200));
      await pumpSheet(tester, api);
      expect(find.text('Nothing recorded on this trip yet.'), findsOneWidget);
    });

    testWidgets('being offline does not break the sheet', (tester) async {
      final api = await apiThat((_) async => http.Response('nope', 500));
      await pumpSheet(tester, api);

      // The list fails quietly; recording a new one is still possible.
      expect(find.text('Nothing recorded on this trip yet.'), findsOneWidget);
      expect(find.byType(FilledButton), findsOneWidget);
    });
  });
}
