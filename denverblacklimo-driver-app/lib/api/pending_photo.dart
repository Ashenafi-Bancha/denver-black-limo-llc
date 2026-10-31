import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

/// Photographs that have not reached the server yet.
///
/// A damaged seat is photographed where it is damaged — a kerb, a hotel
/// forecourt, a mountain road — which is exactly where there is no signal. The
/// picture is the evidence behind a charge the agreement allows, so it waits
/// on the phone rather than failing.
///
/// Unlike a status press this has a file attached, and that changes two
/// things. The bytes live on disk, not in the queue, because secure storage is
/// the wrong place for megabytes. And the file is copied somewhere durable
/// first: the picker hands back a path in a cache directory the system is free
/// to empty, which is not where evidence can sit waiting for a tower.
class PendingPhoto {
  const PendingPhoto({
    required this.id,
    required this.driverId,
    required this.tripId,
    required this.kind,
    required this.filePath,
    required this.takenAt,
    this.note,
    this.lat,
    this.lng,
  });

  /// Sent to the server as `clientId`. An upload can time out after the server
  /// has already stored it, so the retry has to be recognisable as the same
  /// photograph rather than a second one.
  final String id;

  final String driverId;
  final String tripId;
  final String kind;
  final String filePath;
  final DateTime takenAt;
  final String? note;
  final double? lat;
  final double? lng;

  Map<String, dynamic> toJson() => {
        'id': id,
        'driverId': driverId,
        'tripId': tripId,
        'kind': kind,
        'filePath': filePath,
        'takenAt': takenAt.toUtc().toIso8601String(),
        'note': ?note,
        'lat': ?lat,
        'lng': ?lng,
      };

  static PendingPhoto? fromJson(Object? raw) {
    if (raw is! Map) return null;
    final id = raw['id'];
    final driverId = raw['driverId'];
    final tripId = raw['tripId'];
    final kind = raw['kind'];
    final filePath = raw['filePath'];
    final at = DateTime.tryParse('${raw['takenAt']}');
    if (id is! String ||
        driverId is! String ||
        tripId is! String ||
        kind is! String ||
        filePath is! String ||
        at == null) {
      return null;
    }
    return PendingPhoto(
      id: id,
      driverId: driverId,
      tripId: tripId,
      kind: kind,
      filePath: filePath,
      takenAt: at,
      note: raw['note'] is String ? raw['note'] as String : null,
      lat: double.tryParse('${raw['lat']}'),
      lng: double.tryParse('${raw['lng']}'),
    );
  }
}

class PendingPhotoQueue {
  PendingPhotoQueue({FlutterSecureStorage? storage, Directory? directory})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            ),
        // Injected in tests, where there is no application documents
        // directory to ask for.
        // ignore: prefer_initializing_formals
        _directory = directory;

  static const _key = 'dbl_pending_photos';

  /// The server ignores a `takenAt` older than seven days and stamps the photo
  /// with the time it arrived. A picture of a seat, dated a week wrong, is
  /// worse than no picture at all in an argument about who tore it.
  static const maxAge = Duration(days: 7);

  /// Photographs are megabytes, so this is far lower than the status queue's.
  /// A driver with fifty unsent pictures has a problem the office needs to
  /// hear about, not a queue that should keep growing.
  static const maxEntries = 50;

  final FlutterSecureStorage _storage;
  Directory? _directory;

  List<PendingPhoto> _items = const [];
  int _seq = 0;

  List<PendingPhoto> get items => List.unmodifiable(_items);
  int get length => _items.length;
  bool get isEmpty => _items.isEmpty;

  int countFor(String driverId) => _items.where((e) => e.driverId == driverId).length;

  List<PendingPhoto> forTrip(String tripId) =>
      _items.where((e) => e.tripId == tripId).toList(growable: false);

  String nextId() => '${DateTime.now().microsecondsSinceEpoch}-${_seq++}';

  /// Where a photo waits. Under the documents directory rather than the cache,
  /// so the system does not reclaim it while the driver is still out of range.
  Future<Directory> directory() async {
    final dir = _directory ??= Directory(
      '${(await getApplicationDocumentsDirectory()).path}${Platform.pathSeparator}pending_photos',
    );
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  /// Copies the picker's file somewhere durable and returns the new path.
  Future<String> keep(String sourcePath, String id) async {
    final dir = await directory();
    final ext = sourcePath.contains('.') ? sourcePath.split('.').last : 'jpg';
    final target = '${dir.path}${Platform.pathSeparator}$id.$ext';
    await File(sourcePath).copy(target);
    return target;
  }

  Future<void> load() async {
    final raw = await _storage.read(key: _key);
    if (raw == null) {
      _items = const [];
      return;
    }
    try {
      final decoded = jsonDecode(raw);
      final parsed = decoded is List
          ? decoded.map(PendingPhoto.fromJson).nonNulls.toList()
          : <PendingPhoto>[];
      // An entry whose file has gone can never be uploaded, and keeping it
      // would show the driver a photo that no longer exists.
      final kept = <PendingPhoto>[];
      for (final e in parsed) {
        if (await File(e.filePath).exists()) kept.add(e);
      }
      _items = kept;
      if (kept.length != parsed.length) await _save();
    } catch (_) {
      _items = const [];
    }
  }

  Future<void> add(PendingPhoto entry) async {
    final next = [..._items, entry];
    if (next.length > maxEntries) {
      // Dropping the oldest means deleting its file too, or the phone fills
      // with pictures nothing refers to.
      for (final gone in next.take(next.length - maxEntries)) {
        await _deleteFile(gone);
      }
      _items = next.sublist(next.length - maxEntries);
    } else {
      _items = next;
    }
    await _save();
  }

  Future<void> remove(String id) async {
    final gone = _items.where((e) => e.id == id).toList();
    if (gone.isEmpty) return;
    for (final e in gone) {
      await _deleteFile(e);
    }
    _items = _items.where((e) => e.id != id).toList();
    await _save();
  }

  Future<int> dropExpired({DateTime? now}) async {
    final cutoff = (now ?? DateTime.now()).toUtc().subtract(maxAge);
    final stale = _items.where((e) => !e.takenAt.toUtc().isAfter(cutoff)).toList();
    if (stale.isEmpty) return 0;
    for (final e in stale) {
      await _deleteFile(e);
    }
    _items = _items.where((e) => e.takenAt.toUtc().isAfter(cutoff)).toList();
    await _save();
    return stale.length;
  }

  Future<void> clear() async {
    for (final e in _items) {
      await _deleteFile(e);
    }
    _items = const [];
    await _storage.delete(key: _key);
  }

  Future<void> _deleteFile(PendingPhoto e) async {
    try {
      final f = File(e.filePath);
      if (await f.exists()) await f.delete();
    } catch (_) {
      // A file that will not delete is a leaked megabyte, not a lost photo.
      // Never worth failing the queue operation that was actually asked for.
    }
  }

  Future<void> _save() => _storage.write(
        key: _key,
        value: jsonEncode(_items.map((e) => e.toJson()).toList()),
      );
}
