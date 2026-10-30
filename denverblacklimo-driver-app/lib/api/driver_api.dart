import '../models/trip.dart';
import 'api_client.dart';
import 'auth_store.dart';

/// The driver app's view of the API, in the app's own vocabulary.
///
/// Every endpoint is scoped to the signed-in driver by the token — nothing here
/// takes a driver id, because the server does not accept one. That is the whole
/// of the access control, and it is deliberately not something this client can
/// get wrong.
class DriverApi {
  DriverApi({required this.client, required this.store});

  final ApiClient client;
  final AuthStore store;

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
