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

/// Photographs waiting to upload.
///
/// The queue owns files as well as rows, so the cases that matter are the ones
/// where the two can disagree: an entry whose file has gone, and a file whose
/// entry has gone. Either one left behind is a phone slowly filling with
/// pictures nobody will ever see.
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
    tmp = await Directory.systemTemp.createTemp('dbl_photos_test');
  });

  tearDown(() async {
    if (await tmp.exists()) await tmp.delete(recursive: true);
  });

  /// Stands in for a photo the picker just handed over.
  Future<String> aPicture(String name) async {
    final f = File('${tmp.path}${Platform.pathSeparator}$name');
    await f.writeAsBytes(List<int>.filled(64, 7));
    return f.path;
  }

  PendingPhotoQueue queueIn(Directory dir) => PendingPhotoQueue(directory: dir);

  group('the photo queue', () {
    test('copies the picture somewhere durable, away from the picker', () async {
      final q = queueIn(tmp);
      await q.load();
      final source = await aPicture('from_picker.jpg');

      final kept = await q.keep(source, 'entry-1');

      expect(kept, isNot(source));
      expect(await File(kept).exists(), isTrue);
      // The original is the picker's to clean up; ours is a copy.
      expect(await File(source).exists(), isTrue);
    });

    test('removing an entry deletes its file', () async {
      final q = queueIn(tmp);
      await q.load();
      final kept = await q.keep(await aPicture('a.jpg'), 'a');
      await q.add(PendingPhoto(
        id: 'a',
        driverId: 'd1',
        tripId: 't1',
        kind: 'damage',
        filePath: kept,
        takenAt: DateTime.now(),
      ));

      await q.remove('a');

      expect(q.isEmpty, isTrue);
      expect(await File(kept).exists(), isFalse, reason: 'an orphaned file is a leaked megabyte');
    });

    test('an entry whose file has vanished is dropped on load', () async {
      final first = queueIn(tmp);
      await first.load();
      final kept = await first.keep(await aPicture('b.jpg'), 'b');
      await first.add(PendingPhoto(
        id: 'b',
        driverId: 'd1',
        tripId: 't1',
        kind: 'damage',
        filePath: kept,
        takenAt: DateTime.now(),
      ));

      // The system reclaimed it, or the user cleared storage.
      await File(kept).delete();

      final second = queueIn(tmp);
      await second.load();

      expect(second.isEmpty, isTrue, reason: 'it can never be uploaded, and showing it would lie');
    });

    test('photos too old for the server to date correctly are dropped with their files', () async {
      final q = queueIn(tmp);
      await q.load();
      final now = DateTime.utc(2026, 10, 30, 12);
      final stale = await q.keep(await aPicture('old.jpg'), 'old');
      final fresh = await q.keep(await aPicture('new.jpg'), 'new');

      await q.add(PendingPhoto(
        id: 'old', driverId: 'd1', tripId: 't1', kind: 'damage',
        filePath: stale, takenAt: now.subtract(const Duration(days: 9)),
      ));
      await q.add(PendingPhoto(
        id: 'new', driverId: 'd1', tripId: 't1', kind: 'damage',
        filePath: fresh, takenAt: now.subtract(const Duration(hours: 2)),
      ));

      expect(await q.dropExpired(now: now), 1);
      expect(q.items.single.id, 'new');
      expect(await File(stale).exists(), isFalse);
      expect(await File(fresh).exists(), isTrue);
    });

    test('forTrip only returns that trip', () async {
      final q = queueIn(tmp);
      await q.load();
      for (final t in ['t1', 't2', 't1']) {
        final id = q.nextId();
        await q.add(PendingPhoto(
          id: id, driverId: 'd1', tripId: t, kind: 'other',
          filePath: await q.keep(await aPicture('$id.jpg'), id), takenAt: DateTime.now(),
        ));
      }
      expect(q.forTrip('t1').length, 2);
      expect(q.forTrip('t2').length, 1);
      expect(q.forTrip('nope'), isEmpty);
    });
  });

  group('sending photographs', () {
    late AuthStore store;
    late PendingPhotoQueue photos;

    Future<DriverApi> apiThat(Future<http.Response> Function(http.Request) handler) async {
      store = AuthStore();
      await store.load();
      await store.saveTokens(access: 'access-token', refresh: 'refresh-token');
      await store.saveDriver({'id': 'driver-1', 'name': 'Marcus Bell'});
      photos = queueIn(tmp);
      await photos.load();
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
        photos: photos,
      );
    }

    test('no connection keeps the photo on the phone', () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));

      final how = await api.addTripPhoto(
        tripId: 't1',
        kind: 'damage',
        filePath: await aPicture('seat.jpg'),
      );

      expect(how, StatusDelivery.queued);
      expect(api.photos.length, 1);
      expect(await File(api.photos.items.single.filePath).exists(), isTrue);
    });

    test('a photo that got through leaves nothing behind', () async {
      final api = await apiThat((_) async => http.Response('{"ok":true}', 201));
      final before = api.photos.items.map((e) => e.filePath).toList();

      final how = await api.addTripPhoto(
        tripId: 't1',
        kind: 'damage',
        filePath: await aPicture('seat.jpg'),
      );

      expect(how, StatusDelivery.sent);
      expect(api.photos.isEmpty, isTrue);
      for (final p in before) {
        expect(await File(p).exists(), isFalse);
      }
      // And no copy is left in the queue's directory.
      final leftovers = await tmp
          .list()
          .where((f) => f.path.contains('pending') || f.path.endsWith('.jpg'))
          .toList();
      expect(leftovers.any((f) => f.path.contains('-0.jpg')), isFalse);
    });

    test('the upload carries the clientId that makes a retry safe', () async {
      var body = '';
      final api = await apiThat((req) async {
        body = req.body;
        return http.Response('{"ok":true}', 201);
      });

      await api.addTripPhoto(
        tripId: 't1',
        kind: 'no_show',
        filePath: await aPicture('door.jpg'),
        note: 'Nobody at the door',
      );

      expect(body, contains('clientId'));
      expect(body, contains('no_show'));
      expect(body, contains('Nobody at the door'));
      expect(body, contains('takenAt'));
    });

    test('a refusal that will never succeed drops the photo and its file', () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.addTripPhoto(tripId: 'gone', kind: 'damage', filePath: await aPicture('x.jpg'));
      final path = api.photos.items.single.filePath;

      // The trip was cancelled while the phone was out of range.
      final online = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async => http.Response('{"error":"Trip not found"}', 404)),
        ),
        store: store,
        pending: PendingQueue(),
        photos: photos,
      );
      final out = await online.flushPendingPhotos();

      expect(out.dropped, 1);
      expect(out.sent, 0);
      expect(photos.isEmpty, isTrue);
      expect(await File(path).exists(), isFalse);
    });

    test('a server error keeps the photo for the next try', () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.addTripPhoto(tripId: 't1', kind: 'damage', filePath: await aPicture('y.jpg'));
      final path = api.photos.items.single.filePath;

      final flaky = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async => http.Response('{"error":"nope"}', 500)),
        ),
        store: store,
        pending: PendingQueue(),
        photos: photos,
      );
      final out = await flaky.flushPendingPhotos();

      expect(out.sent, 0);
      expect(out.dropped, 0);
      expect(photos.length, 1);
      expect(await File(path).exists(), isTrue);
    });

    test("another driver's photographs are left alone", () async {
      final api = await apiThat((_) async => throw const SocketException('offline'));
      await api.addTripPhoto(tripId: 't1', kind: 'damage', filePath: await aPicture('z.jpg'));

      await store.saveDriver({'id': 'driver-2', 'name': 'David Okonkwo'});

      var calls = 0;
      final next = DriverApi(
        client: ApiClient(
          baseUrl: 'https://example.test/api',
          store: store,
          httpClient: MockClient((_) async {
            calls++;
            return http.Response('{"ok":true}', 201);
          }),
        ),
        store: store,
        pending: PendingQueue(),
        photos: photos,
      );
      final out = await next.flushPendingPhotos();

      expect(calls, 0);
      expect(out.sent, 0);
      expect(photos.length, 1);
    });
  });
}
