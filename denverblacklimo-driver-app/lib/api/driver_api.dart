import '../models/flight_status.dart';
import '../models/trip.dart';
import 'api_client.dart';
import 'auth_store.dart';
import 'pending_photo.dart';
import 'pending_status.dart';
import 'trip_cache.dart';

/// The driver app's view of the API, in the app's own vocabulary.
///
/// Every endpoint is scoped to the signed-in driver by the token — nothing here
/// takes a driver id, because the server does not accept one. That is the whole
/// of the access control, and it is deliberately not something this client can
/// get wrong.
/// Whether a press reached the server or is waiting on the phone.
enum StatusDelivery { sent, queued }

/// What one drain of the queue did, so the driver can be told plainly.
class FlushOutcome {
  const FlushOutcome({this.sent = 0, this.dropped = 0, this.expired = 0, this.remaining = 0});

  /// Accepted by the server and removed from the queue.
  final int sent;

  /// Refused in a way retrying cannot fix — a cancelled trip, or one no longer
  /// assigned to this driver. Kept separate from [sent] because the driver
  /// believed these were recorded and they were not.
  final int dropped;

  /// Too old for the server to honour the original time. See [PendingQueue.maxAge].
  final int expired;

  final int remaining;

  bool get changedAnything => sent > 0 || dropped > 0 || expired > 0;
}

class DriverApi {
  DriverApi({
    required this.client,
    required this.store,
    required this.pending,
    PendingPhotoQueue? photos,
    TripCache? cache,
  })  : photos = photos ?? PendingPhotoQueue(),
        cache = cache ?? TripCache();

  final ApiClient client;
  final AuthStore store;
  final PendingQueue pending;

  /// Photographs waiting to upload. Separate from [pending] because a picture
  /// has a file attached and is megabytes rather than bytes, so it is capped
  /// and expired on its own terms.
  final PendingPhotoQueue photos;

  /// The last trips the server sent, so the app still works with no signal.
  final TripCache cache;

  /// One drain at a time. The screen flushes on a timer, on refresh and after
  /// a press, and two overlapping drains would post the same entry twice —
  /// which an append-only event log would faithfully record as the driver
  /// pressing twice.
  Future<FlushOutcome>? _flushing;
  Future<FlushOutcome>? _flushingPhotos;

  String get _driverId => '${store.driver?['id'] ?? ''}';

  /// Refused for a reason that will be refused again: a status the server does
  /// not accept, a trip that is cancelled, or one not assigned to this driver.
  /// Retrying these forever would jam everything queued behind them.
  static bool _isPermanent(ApiException e) =>
      e.statusCode == 400 || e.statusCode == 404 || e.statusCode == 409;

  /// Signs in and stores the session. Throws [ApiException] with a message
  /// already fit to show a driver.
  Future<Map<String, dynamic>> signIn({
    required String email,
    required String password,
    String? device,
  }) async {
    final body = await client.post(
      '/driver/login',
      authenticated: false,
      body: {'email': email.trim(), 'password': password, 'device': ?device},
    ) as Map<String, dynamic>;

    await store.saveTokens(
      access: body['accessToken'] as String,
      refresh: body['refreshToken'] as String,
    );
    final driver = Map<String, dynamic>.from(body['driver'] as Map);
    await store.saveDriver(driver);
    return driver;
  }

  /// Ends the session on the server as well as the device.
  ///
  /// A failure is swallowed on purpose: signing out must always leave the app
  /// signed out locally, or a driver with no signal could not sign out of a
  /// handset they are about to hand over.
  Future<void> signOut() async {
    final refresh = store.refreshToken;
    if (refresh != null) {
      try {
        await client.post('/driver/logout', authenticated: false, body: {'refreshToken': refresh});
      } catch (_) {
        // Deliberately ignored — see above.
      }
    }
    await store.clear();
    // The cache holds passengers' names, numbers and addresses. A handset
    // whose driver has signed out must not still be carrying them.
    await cache.clear();
  }

  Future<Map<String, dynamic>> me() async =>
      Map<String, dynamic>.from(await client.get('/driver/me') as Map);

  /// `scope` is one of `upcoming` (the default), `past` or `all`.
  ///
  /// Falls back to the last answer this driver was given when the server
  /// cannot be reached, marked with when it was fetched. An address from this
  /// morning beats an error screen in a canyon; the only thing that matters is
  /// that the screen says which it is showing.
  ///
  /// A failure that is not about the network — an expired session, a server
  /// error — is rethrown. Those need acting on, not papering over with a
  /// stale list.
  Future<TripsResult> trips({String scope = 'upcoming'}) async {
    final driverId = _driverId;
    try {
      final rows = await client.get('/driver/trips', query: {'scope': scope}) as List;
      if (driverId.isNotEmpty) {
        await cache.save(scope: scope, driverId: driverId, payload: rows);
      }
      return TripsResult(
        trips: rows
            .whereType<Map>()
            .map((r) => Trip.fromJson(Map<String, dynamic>.from(r)))
            .toList(growable: false),
      );
    } on ApiException catch (e) {
      // statusCode == null is the client's own "the request did not happen".
      final offline = e.statusCode == null && !e.needsSignIn;
      if (!offline || driverId.isEmpty) rethrow;
      final cached = await cache.read(scope: scope, driverId: driverId);
      if (cached == null) rethrow;
      return TripsResult(trips: cached.trips, cachedAt: cached.fetchedAt);
    }
  }

  /// Records what the driver pressed.
  ///
  /// `occurredAt` is sent as well as the status so the server keeps when it
  /// happened rather than when it heard, which is what makes a press made with
  /// no signal still worth something once it syncs.
  ///
  /// Returns [StatusDelivery.queued] when there was no connection: the press is
  /// on the phone and will go when there is one. An expired session is queued
  /// too and then rethrown — the driver has to sign in again, but the work they
  /// did is not thrown away with the token. Anything the server actually
  /// refused is rethrown without queueing, because it will be refused again.
  Future<StatusDelivery> setTripStatus({
    required String tripId,
    required String status,
    DateTime? occurredAt,
    double? lat,
    double? lng,
  }) async {
    // Read before the call: a failed refresh clears the store, and an entry
    // with no owner could never be flushed.
    final driverId = _driverId;
    final at = occurredAt ?? DateTime.now();

    PendingStatus entry() => PendingStatus(
          id: pending.nextId(),
          driverId: driverId,
          tripId: tripId,
          status: status,
          occurredAt: at,
          lat: lat,
          lng: lng,
        );

    try {
      await client.post('/driver/trips/$tripId/status', body: entry().toBody());
      return StatusDelivery.sent;
    } on ApiException catch (e) {
      if (_isPermanent(e)) rethrow;
      if (driverId.isNotEmpty) await pending.add(entry());
      if (e.needsSignIn) rethrow;
      return StatusDelivery.queued;
    }
  }

  /// Sends whatever is waiting, oldest first, and stops at the first failure
  /// that retrying could fix.
  ///
  /// Only this driver's entries are touched. A handset passed to the next
  /// shift still holds the last driver's presses, and sending them under the
  /// new token would have the server refuse them as somebody else's trip —
  /// which, being a permanent refusal, would delete them.
  Future<FlushOutcome> flushPending() =>
      _flushing ??= _flush().whenComplete(() => _flushing = null);

  Future<FlushOutcome> _flush() async {
    final driverId = _driverId;
    if (driverId.isEmpty) return const FlushOutcome();

    final expired = await pending.dropExpired();
    var sent = 0;
    var dropped = 0;

    for (final e in pending.items.where((e) => e.driverId == driverId).toList()) {
      try {
        await client.post('/driver/trips/${e.tripId}/status', body: e.toBody());
        await pending.remove(e.id);
        sent++;
      } on ApiException catch (ex) {
        if (_isPermanent(ex)) {
          await pending.remove(e.id);
          dropped++;
          continue;
        }
        // No signal, a server error, or a session to renew. Leave this entry
        // and everything after it: order within a trip has to hold.
        break;
      }
    }

    return FlushOutcome(
      sent: sent,
      dropped: dropped,
      expired: expired,
      remaining: pending.countFor(driverId),
    );
  }

  /// Adds a photograph to a trip.
  ///
  /// The file is copied somewhere durable and queued *before* it is sent. In
  /// that order a driver who loses signal mid-upload, or closes the app on a
  /// spinner, still has the picture; the other way round loses it.
  ///
  /// Reuses [StatusDelivery] — the two answers are the same here: it reached
  /// the server, or it is on the phone.
  Future<StatusDelivery> addTripPhoto({
    required String tripId,
    required String kind,
    required String filePath,
    String? note,
    DateTime? takenAt,
    double? lat,
    double? lng,
  }) async {
    final driverId = _driverId;
    if (driverId.isEmpty) {
      throw ApiException('Please sign in again.', needsSignIn: true);
    }

    final id = photos.nextId();
    final entry = PendingPhoto(
      id: id,
      driverId: driverId,
      tripId: tripId,
      kind: kind,
      filePath: await photos.keep(filePath, id),
      takenAt: takenAt ?? DateTime.now(),
      note: note,
      lat: lat,
      lng: lng,
    );
    await photos.add(entry);

    try {
      await _uploadPhoto(entry);
      await photos.remove(entry.id);
      return StatusDelivery.sent;
    } on ApiException catch (e) {
      // Refused for good — the trip is cancelled, or not this driver's. Keep
      // nothing: it will be refused identically forever.
      if (_isPermanent(e)) {
        await photos.remove(entry.id);
        rethrow;
      }
      // An expired session is still worth keeping the picture for.
      if (e.needsSignIn) rethrow;
      return StatusDelivery.queued;
    }
  }

  Future<void> _uploadPhoto(PendingPhoto e) => client.postFile(
        '/driver/trips/${e.tripId}/photos',
        fieldName: 'photo',
        filePath: e.filePath,
        fields: {
          'kind': e.kind,
          // Makes a retry idempotent: the server recognises a photo it has
          // already stored instead of filing it a second time.
          'clientId': e.id,
          'takenAt': e.takenAt.toUtc().toIso8601String(),
          'note': ?e.note,
          if (e.lat != null) 'lat': '${e.lat}',
          if (e.lng != null) 'lng': '${e.lng}',
        },
      );

  /// Uploads whatever photographs are waiting, oldest first.
  Future<FlushOutcome> flushPendingPhotos() =>
      _flushingPhotos ??= _flushPhotos().whenComplete(() => _flushingPhotos = null);

  Future<FlushOutcome> _flushPhotos() async {
    final driverId = _driverId;
    if (driverId.isEmpty) return const FlushOutcome();

    final expired = await photos.dropExpired();
    var sent = 0;
    var dropped = 0;

    for (final e in photos.items.where((e) => e.driverId == driverId).toList()) {
      try {
        await _uploadPhoto(e);
        await photos.remove(e.id);
        sent++;
      } on ApiException catch (ex) {
        if (_isPermanent(ex)) {
          await photos.remove(e.id);
          dropped++;
          continue;
        }
        break;
      }
    }

    return FlushOutcome(
      sent: sent,
      dropped: dropped,
      expired: expired,
      remaining: photos.countFor(driverId),
    );
  }

  /// The photographs the server already holds for a trip.
  Future<List<Map<String, dynamic>>> tripPhotos(String tripId) async {
    final rows = await client.get('/driver/trips/$tripId/photos') as List;
    return rows.whereType<Map>().map((r) => Map<String, dynamic>.from(r)).toList(growable: false);
  }

  /// How the trip's flight is actually running.
  ///
  /// Takes no flight number: the server reads it off the booking. The provider
  /// behind this is metered for the whole company, so there is nothing here a
  /// client could point at a flight of its own choosing.
  ///
  /// Not cached on the device and not queued, unlike trips and status presses.
  /// A flight status from the last time there was signal is worse than none —
  /// it is exactly the figure that will have changed — and the server already
  /// refuses to answer with anything older than ten minutes.
  Future<FlightStatus> tripFlight(String tripId) async {
    final body = await client.get('/driver/trips/$tripId/flight');
    return FlightStatus.fromJson(
      body is Map ? Map<String, dynamic>.from(body) : const {'found': false},
    );
  }

  Future<void> changePassword({required String current, required String next}) async {
    await client.post('/driver/password', body: {
      'currentPassword': current,
      'newPassword': next,
    });
    // The server ends every session on a password change, this one included,
    // so the local copy is now worthless.
    await store.clear();
  }
}
