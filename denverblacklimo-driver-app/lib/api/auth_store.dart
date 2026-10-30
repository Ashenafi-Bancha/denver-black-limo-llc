import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where the driver's session lives on the device.
///
/// Secure storage, not shared preferences: these tokens are credentials. On
/// Android they go to the Keystore-backed EncryptedSharedPreferences, on iOS to
/// the Keychain. Shared preferences is a plain file that any backup — or
/// anyone with the handset unlocked — can read.
class AuthStore {
  AuthStore({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  static const _kAccess = 'dbl_access_token';
  static const _kRefresh = 'dbl_refresh_token';
  static const _kDriver = 'dbl_driver';

  final FlutterSecureStorage _storage;

  String? _access;
  String? _refresh;
  Map<String, dynamic>? _driver;

  String? get accessToken => _access;
  String? get refreshToken => _refresh;
  Map<String, dynamic>? get driver => _driver;
  bool get isSignedIn => _refresh != null;

  /// Read once at startup so later calls are synchronous — every request needs
  /// the token, and awaiting the Keychain on each would be felt.
  Future<void> load() async {
    _access = await _storage.read(key: _kAccess);
    _refresh = await _storage.read(key: _kRefresh);
    final raw = await _storage.read(key: _kDriver);
    _driver = raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> saveTokens({required String access, required String refresh}) async {
    _access = access;
    _refresh = refresh;
    await _storage.write(key: _kAccess, value: access);
    await _storage.write(key: _kRefresh, value: refresh);
  }

  Future<void> saveDriver(Map<String, dynamic> driver) async {
    _driver = driver;
    await _storage.write(key: _kDriver, value: jsonEncode(driver));
  }

  Future<void> clear() async {
    _access = null;
    _refresh = null;
    _driver = null;
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
    await _storage.delete(key: _kDriver);
  }
}
