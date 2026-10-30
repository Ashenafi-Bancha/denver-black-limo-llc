import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Status presses that have not reached the server yet.
///
/// Denver work runs into the mountains, and a canyon with no bars is the
/// normal case rather than the exception. A driver who presses ARRIVED at a
/// gate with no signal has done their job; losing that press loses the
/// timestamp the wait-time charge is billed from, and the customer is the one
/// who benefits from our record being empty.
///
/// So a press is written here first and sent afterwards. The API already
/// accepts `occurredAt` and keeps the gap between when it happened and when it
/// heard — the admin shows that gap as "pressed with no signal and synced
/// afterwards" — so a late arrival is recorded as the true time, not the time
/// the phone found a tower.
///
/// Order is preserved and the queue is flushed in sequence. The server's cache
/// of the current status is last-write-wins, so flushing out of order would
/// leave a trip showing a status it had already moved past.
class PendingStatus {
  const PendingStatus({
    required this.id,
    required this.driverId,
    required this.tripId,
    required this.status,
    required this.occurredAt,
    this.lat,
    this.lng,
  });

  /// Local only, and only so an entry can be removed unambiguously once it has
  /// been accepted. Two identical presses are possible and must not collapse.
  final String id;

  /// Who pressed it. A handset can be handed to the next shift, and flushing
  /// one driver's presses under another's token would have the server reject
  /// them as not that driver's trip — binning the evidence for good. Entries
  /// are only ever sent by the driver who made them.
  final String driverId;

  final String tripId;
  final String status;
  final DateTime occurredAt;
  final double? lat;
  final double? lng;

  Map<String, dynamic> toJson() => {
        'id': id,
        'driverId': driverId,
        'tripId': tripId,
        'status': status,
        'occurredAt': occurredAt.toUtc().toIso8601String(),
        'lat': ?lat,
        'lng': ?lng,
      };

  /// What goes to the API. `id` and `driverId` are the phone's own bookkeeping;
  /// the server scopes the write by the token, never by a field in the body.
  Map<String, dynamic> toBody() => {
        'status': status,
        'occurredAt': occurredAt.toUtc().toIso8601String(),
        'lat': ?lat,
        'lng': ?lng,
      };

  /// Returns null rather than throwing on a malformed row. A queue entry that
  /// cannot be read is already lost; taking the whole queue down with it would
  /// lose the good entries too.
  static PendingStatus? fromJson(Object? raw) {
    if (raw is! Map) return null;
    final id = raw['id'];
    final driverId = raw['driverId'];
    final tripId = raw['tripId'];
    final status = raw['status'];
    final at = DateTime.tryParse('${raw['occurredAt']}');
    if (id is! String || driverId is! String || tripId is! String || status is! String || at == null) {
      return null;
    }
    return PendingStatus(
      id: id,
      driverId: driverId,
      tripId: tripId,
      status: status,
      occurredAt: at,
      lat: double.tryParse('${raw['lat']}'),
      lng: double.tryParse('${raw['lng']}'),
    );
  }
}

/// What one trip's unsent presses add up to, for the card to paint over the
/// server's answer.
class PendingOverlay {
  const PendingOverlay({
    required this.status,
    required this.statusAt,
    required this.count,
    this.arrivedAt,
  });

  /// The most recent press, which is what the trip should appear to be.
  final String status;
  final DateTime statusAt;

  /// The earliest queued arrival, matching the server's rule that an arrival
  /// is set once and never moved.
  final DateTime? arrivedAt;

  final int count;
}

class PendingQueue {
  PendingQueue({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  static const _key = 'dbl_pending_status';

  /// The same store the tokens use. These entries are not secrets, but they
  /// are the only other thing this app must not lose, and reusing a plugin
  /// already proven to build on both platforms beats adding a second one for
  /// a list that rarely holds more than a couple of rows.
  final FlutterSecureStorage _storage;

  /// The server ignores an `occurredAt` older than seven days and stamps the
  /// event with the time it arrived instead. A week-old press would therefore
  /// be recorded as happening now — a false time in the record a charge is
  /// argued from. Losing the press is bad; inventing a timestamp is worse.
  static const maxAge = Duration(days: 7);

  /// A full phone is not a reason to drop the press a driver just made, so new
  /// entries win and the oldest go. Nothing realistic reaches this: it is here
  /// so a bug cannot grow the queue without limit.
  static const maxEntries = 200;

  List<PendingStatus> _items = const [];
  int _seq = 0;

  List<PendingStatus> get items => List.unmodifiable(_items);
  int get length => _items.length;
  bool get isEmpty => _items.isEmpty;

  int countFor(String driverId) => _items.where((e) => e.driverId == driverId).length;

  /// What this trip will show once the queue drains, or null if nothing for it
  /// is waiting. The screen paints this over the server's answer so a driver
  /// sees the press land instead of pressing again.
  PendingStatus? latestFor(String tripId) {
    for (var i = _items.length - 1; i >= 0; i--) {
      if (_items[i].tripId == tripId) return _items[i];
    }
    return null;
  }

  /// Everything waiting for one trip, or null if nothing is.
  PendingOverlay? overlayFor(String tripId) {
    final mine = _items.where((e) => e.tripId == tripId).toList();
    if (mine.isEmpty) return null;
    final last = mine.last;
    final arrived = mine.where((e) => e.status == 'arrived');
    return PendingOverlay(
      status: last.status,
      statusAt: last.occurredAt,
      arrivedAt: arrived.isEmpty ? null : arrived.first.occurredAt,
      count: mine.length,
    );
  }

  /// Unique within this device, which is all that is needed — it never leaves.
  String nextId() => '${DateTime.now().microsecondsSinceEpoch}-${_seq++}';

  Future<void> load() async {
    final raw = await _storage.read(key: _key);
    if (raw == null) {
      _items = const [];
      return;
    }
    try {
      final decoded = jsonDecode(raw);
      _items = decoded is List
          ? decoded.map(PendingStatus.fromJson).nonNulls.toList()
          : const [];
    } catch (_) {
      // Unreadable queue. Start clean rather than failing to launch.
      _items = const [];
    }
  }

  Future<void> add(PendingStatus entry) async {
    final next = [..._items, entry];
    _items = next.length > maxEntries ? next.sublist(next.length - maxEntries) : next;
    await _save();
  }

  Future<void> remove(String id) async {
    final next = _items.where((e) => e.id != id).toList();
    if (next.length == _items.length) return;
    _items = next;
    await _save();
  }

  /// Drops entries the server would re-stamp, and reports how many went, so
  /// the driver can be told rather than left believing they were recorded.
  Future<int> dropExpired({DateTime? now}) async {
    final cutoff = (now ?? DateTime.now()).toUtc().subtract(maxAge);
    final kept = _items.where((e) => e.occurredAt.toUtc().isAfter(cutoff)).toList();
    final dropped = _items.length - kept.length;
    if (dropped > 0) {
      _items = kept;
      await _save();
    }
    return dropped;
  }

  Future<void> clear() async {
    _items = const [];
    await _storage.delete(key: _key);
  }

  Future<void> _save() => _storage.write(
        key: _key,
        value: jsonEncode(_items.map((e) => e.toJson()).toList()),
      );
}
