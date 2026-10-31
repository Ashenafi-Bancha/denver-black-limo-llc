import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/trip.dart';

/// The last trips the server sent, kept on the phone.
///
/// Everything else this app does offline — queued presses, queued photographs
/// — assumed the driver could still read the trip. They could not. `trips()`
/// was network-only, so a chauffeur in the DIA parking structure or a canyon
/// on the way to Vail opened the app to check a drop-off address or a
/// passenger's number and got "Could not load your trips". The app failed in
/// exactly the places it exists for.
///
/// So the last good answer is kept and shown, clearly marked as of its time.
/// A day-old address is worth far more than an error screen; what matters is
/// that the driver knows which they are looking at.
///
/// The raw server payload is stored rather than re-serialised [Trip] objects.
/// There is then only one parser, [Trip.fromJson], and a field added to the
/// API cannot quietly go missing from the cached copy.
class TripCache {
  TripCache({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  /// Secure storage, not a plain file. This holds passengers' names, telephone
  /// numbers, home addresses and flight numbers — a list of where people will
  /// be and when. It is the most sensitive thing on the handset after the
  /// token.
  final FlutterSecureStorage _storage;

  static String _key(String scope) => 'dbl_trips_$scope';

  Future<void> save({
    required String scope,
    required String driverId,
    required List<dynamic> payload,
  }) =>
      _storage.write(
        key: _key(scope),
        value: jsonEncode({
          'driverId': driverId,
          'fetchedAt': DateTime.now().toUtc().toIso8601String(),
          'trips': payload,
        }),
      );

  /// What was last saved for this driver, or null.
  ///
  /// A cache belonging to someone else is ignored rather than shown: a handset
  /// handed to the next shift must not display the previous driver's
  /// passengers, who are nothing to do with them.
  Future<CachedTrips?> read({required String scope, required String driverId}) async {
    try {
      final raw = await _storage.read(key: _key(scope));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return null;
      if (decoded['driverId'] != driverId) return null;
      final at = DateTime.tryParse('${decoded['fetchedAt']}');
      final list = decoded['trips'];
      if (at == null || list is! List) return null;
      return CachedTrips(
        trips: list
            .whereType<Map>()
            .map((r) => Trip.fromJson(Map<String, dynamic>.from(r)))
            .toList(growable: false),
        fetchedAt: at,
      );
    } catch (_) {
      // A cache that cannot be read is not worth failing a launch over.
      return null;
    }
  }

  /// Called on sign-out. Leaving a passenger list on a handset whose driver
  /// has signed out is the one thing this must never do.
  Future<void> clear() async {
    for (final scope in const ['upcoming', 'past', 'all']) {
      await _storage.delete(key: _key(scope));
    }
  }
}

class CachedTrips {
  const CachedTrips({required this.trips, required this.fetchedAt});

  final List<Trip> trips;
  final DateTime fetchedAt;
}

/// Trips, and whether they came from the server just now.
class TripsResult {
  const TripsResult({required this.trips, this.cachedAt});

  final List<Trip> trips;

  /// When this was last fetched, if it is being shown because the server could
  /// not be reached. Null means it is fresh.
  final DateTime? cachedAt;

  bool get isStale => cachedAt != null;
}
