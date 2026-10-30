import '../models/trip.dart';
import 'api_client.dart';
import 'auth_store.dart';
import 'pending_status.dart';

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
  DriverApi({required this.client, required this.store, required this.pending});

  final ApiClient client;
  final AuthStore store;
  final PendingQueue pending;

  /// One drain at a time. The screen flushes on a timer, on refresh and after
  /// a press, and two overlapping drains would post the same entry twice —
  /// which an append-only event log would faithfully record as the driver
  /// pressing twice.
  Future<FlushOutcome>? _flushing;

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
  }

  Future<Map<String, dynamic>> me() async =>
      Map<String, dynamic>.from(await client.get('/driver/me') as Map);

  /// `scope` is one of `upcoming` (the default), `past` or `all`.
  Future<List<Trip>> trips({String scope = 'upcoming'}) async {
    final rows = await client.get('/driver/trips', query: {'scope': scope}) as List;
    return rows
        .whereType<Map>()
        .map((r) => Trip.fromJson(Map<String, dynamic>.from(r)))
        .toList(growable: false);
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
