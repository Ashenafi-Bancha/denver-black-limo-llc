import 'package:flutter/material.dart';

import 'api/api_client.dart';
import 'api/auth_store.dart';
import 'api/driver_api.dart';
import 'screens/sign_in_screen.dart';
import 'screens/trips_screen.dart';
import 'theme.dart';

/// Denver Black Limo — driver app.
///
/// Talks to the same API as the website and the admin. Nothing is duplicated
/// here: the server decides what a trip is, who it belongs to and what a
/// driver may see.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final store = AuthStore();
  // Read the session before the first frame, so a signed-in driver never sees
  // the sign-in screen flash past on the way to their trips.
  await store.load();

  final client = ApiClient(baseUrl: ApiClient.defaultBaseUrl, store: store);
  runApp(DriverApp(api: DriverApi(client: client, store: store)));
}

class DriverApp extends StatefulWidget {
  const DriverApp({super.key, required this.api});

  final DriverApi api;

  @override
  State<DriverApp> createState() => _DriverAppState();
}

class _DriverAppState extends State<DriverApp> {
  late bool _signedIn = widget.api.store.isSignedIn;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DBL Driver',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: _signedIn
          ? TripsScreen(
              api: widget.api,
              // Reached when the session is gone, whether the driver signed
              // out or the office signed the device out remotely.
              onSignedOut: () => setState(() => _signedIn = false),
            )
          : SignInScreen(
              api: widget.api,
              onSignedIn: () => setState(() => _signedIn = true),
            ),
    );
  }
}
