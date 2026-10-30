import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/driver_api.dart';
import '../theme.dart';

/// Signing in.
///
/// The office creates the account and passes the password on, so there is no
/// sign-up and no "forgot password" — a driver who cannot get in calls
/// dispatch, and the screen says so rather than offering a link that would go
/// nowhere.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, required this.api, required this.onSignedIn});

  final DriverApi api;
  final VoidCallback onSignedIn;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _passwordFocus = FocusNode();
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  /// Labels the session in the admin's device list, so "sign this one out"
  /// means something to whoever is looking.
  String get _deviceLabel {
    if (kIsWeb) return 'Browser';
    try {
      return Platform.isIOS ? 'iPhone' : 'Android phone';
    } catch (_) {
      return 'Mobile';
    }
  }

  Future<void> _submit() async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.signIn(
        email: _email.text,
        password: _password.text,
        device: _deviceLabel,
      );
      widget.onSignedIn();
    } on ApiException catch (e) {
      // The server's wording is already written for a driver to read, so it is
      // shown as-is rather than replaced with something vaguer.
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Image.asset(
                      'assets/logo.png',
                      height: 96,
                      // The app must still sign in if the asset is ever
                      // missing, so this degrades to the wordmark.
                      errorBuilder: (_, _, _) => const Text(
                        'DENVER BLACK LIMO',
                        style: TextStyle(
                          color: Brand.gold,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'Driver sign in',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 32),

                  TextField(
                    controller: _email,
                    autofillHints: const [AutofillHints.username],
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    enableSuggestions: false,
                    decoration: const InputDecoration(hintText: 'Email address'),
                    onSubmitted: (_) => _passwordFocus.requestFocus(),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _password,
                    focusNode: _passwordFocus,
                    autofillHints: const [AutofillHints.password],
                    obscureText: _obscure,
                    textInputAction: TextInputAction.go,
                    decoration: InputDecoration(
                      hintText: 'Password',
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                        tooltip: _obscure ? 'Show password' : 'Hide password',
                      ),
                    ),
                    onSubmitted: (_) => _submit(),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Brand.bad.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Brand.bad.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.error_outline, size: 18, color: Brand.bad),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(_error!,
                                style: const TextStyle(color: Brand.bad, fontSize: 13, height: 1.4)),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Brand.black),
                          )
                        : const Text('SIGN IN'),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Your password comes from the office.\nCall dispatch if you cannot sign in.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white38, fontSize: 12, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
