import 'dart:convert';
import 'package:http/http.dart' as http;

import 'auth_store.dart';

/// Talking to the Denver Black Limo API.
///
/// Two things about this backend shape every call here, and both are easy to
/// get wrong from Dart:
///
///   * **An expired token answers 403, not 401.** 401 means no credentials
///     were sent at all. So 403 is what means "sign in again" — treating it as
///     a permissions error leaves a driver staring at a refusal they cannot
///     act on.
///   * **Numbers arrive as strings.** Postgres NUMERIC columns are serialised
///     as `"95.00"`, so nothing here casts straight to `double`.
///
/// A 403 triggers one refresh attempt and one retry. If that fails the session
/// is cleared and the caller is told to sign in, rather than being left in a
/// loop against a server that will keep saying no.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.needsSignIn = false});

  final String message;
  final int? statusCode;

  /// The caller should send the driver back to the sign-in screen.
  final bool needsSignIn;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required this.baseUrl, required this.store, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  /// Overridden at build time:
  /// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api`
  ///
  /// 10.0.2.2 rather than localhost: on an Android emulator localhost is the
  /// emulated device itself, not the machine running the server.
  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://denverblacklimo.llc/api',
  );

  final String baseUrl;
  final AuthStore store;
  final http.Client _http;

  /// Guards against several 403s at once each firing their own refresh, which
  /// would rotate the token repeatedly and invalidate the one just issued.
  Future<bool>? _refreshing;

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$baseUrl$path').replace(queryParameters: query);

  Map<String, String> _headers(String? token) => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<dynamic> get(String path, {Map<String, String>? query}) =>
      _send(() async => _http.get(_uri(path, query), headers: _headers(store.accessToken)));

  Future<dynamic> post(String path, {Object? body, bool authenticated = true}) =>
      _send(() async => _http.post(
            _uri(path),
            headers: _headers(authenticated ? store.accessToken : null),
            body: jsonEncode(body ?? const {}),
          ));

  /// Runs a request, refreshing once if the token has expired.
  Future<dynamic> _send(Future<http.Response> Function() request) async {
    var res = await _guarded(request);

    if (res.statusCode == 403 && store.refreshToken != null) {
      final refreshed = await _refreshOnce();
      if (refreshed) {
        res = await _guarded(request);
      } else {
        await store.clear();
        throw ApiException('Your session has expired. Please sign in again.',
            statusCode: 403, needsSignIn: true);
      }
    }

    return _decode(res);
  }

  Future<http.Response> _guarded(Future<http.Response> Function() request) async {
    try {
      return await request();
    } catch (_) {
      // Any socket or DNS failure reads the same way to a driver standing in a
      // car park: the request did not happen.
      throw ApiException('No connection. Check your signal and try again.');
    }
  }

  /// At most one refresh in flight; everyone else waits for its result.
  /// _doRefresh never throws, so sharing the future cannot leave an
  /// unhandled error behind for the callers that did not start it.
  Future<bool> _refreshOnce() =>
      _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<bool> _doRefresh() async {
    final refresh = store.refreshToken;
    if (refresh == null) return false;
    try {
      final res = await _http.post(
        _uri('/driver/refresh'),
        headers: _headers(null),
        body: jsonEncode({'refreshToken': refresh}),
      );
      if (res.statusCode != 200) return false;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      await store.saveTokens(
        access: body['accessToken'] as String,
        refresh: body['refreshToken'] as String,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? null : jsonDecode(res.body);

    if (res.statusCode >= 200 && res.statusCode < 300) return body;

    final message = body is Map && body['error'] is String
        ? body['error'] as String
        : 'Something went wrong. Please try again.';

    throw ApiException(
      message,
      statusCode: res.statusCode,
      // 401 here means the header was missing, which for a signed-in app means
      // the session is gone.
      needsSignIn: res.statusCode == 403 || res.statusCode == 401,
    );
  }

  void close() => _http.close();
}
