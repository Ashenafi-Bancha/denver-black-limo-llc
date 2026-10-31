import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../models/trip.dart';
import '../theme.dart';

/// The name board a chauffeur holds up at arrivals.
///
/// This is the one thing on this phone a customer ever sees. A limousine
/// company is judged at the moment someone walks out of baggage claim looking
/// for their name, and a scribbled sheet of A4 is the difference between a car
/// service and a chauffeur service. So it is treated as a piece of print: the
/// name large enough to read across a hall, the company mark present but
/// subordinate, nothing else competing with it.
///
/// Two details matter more than the styling:
///
///   * **The screen must not sleep.** A board that goes black after thirty
///     seconds is worse than no board, because the driver believes it is
///     working. The wakelock is released again on the way out — holding it for
///     the rest of the shift would flatten the handset.
///   * **It must work held either way.** A driver holds a sign landscape as
///     often as portrait, so both are allowed here. The app sets no preference
///     of its own, and this screen restores that on the way out rather than
///     leaving a lock behind it.
class NameBoardScreen extends StatefulWidget {
  const NameBoardScreen({super.key, required this.trip});

  final Trip trip;

  @override
  State<NameBoardScreen> createState() => _NameBoardScreenState();
}

class _NameBoardScreenState extends State<NameBoardScreen> {
  bool _chrome = true;

  @override
  void initState() {
    super.initState();
    _keepAwake(true);
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    // Full bleed: a status bar full of notification icons has no business on
    // something held up to a customer.
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
  }

  @override
  void dispose() {
    _keepAwake(false);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    // Empty means no preference, which is what the app had before this
    // screen opened. Locking portrait here would be a change nobody asked for.
    SystemChrome.setPreferredOrientations(const []);
    super.dispose();
  }

  /// Failures are swallowed deliberately. A board that will not open because
  /// a platform call failed is worse than one that dims — the driver is
  /// standing in arrivals either way, and the screen is the lesser problem.
  void _keepAwake(bool on) {
    unawaited(
      (on ? WakelockPlus.enable() : WakelockPlus.disable()).catchError((Object _) {}),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.trip;
    final landscape = MediaQuery.of(context).orientation == Orientation.landscape;
    final name = t.passengerName.trim().isEmpty ? 'Our guest' : t.passengerName.trim();

    // The flight is on the board because it is how a passenger confirms the
    // car is theirs when two people share a surname on the same arrival.
    final flight = [t.airlineName, t.flightNumber].where((s) => s.trim().isNotEmpty).join(' ');

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        // Tapping hides the exit control rather than leaving, so a brush
        // against the screen while holding it up cannot dismiss the board.
        onTap: () => setState(() => _chrome = !_chrome),
        child: SafeArea(
          child: Stack(
            children: [
              Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: landscape ? 48 : 24, vertical: 24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'DENVER BLACK LIMO',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: landscape ? 16 : 14,
                          letterSpacing: 6,
                          fontWeight: FontWeight.w600,
                          color: Brand.gold,
                        ),
                      ),
                      SizedBox(height: landscape ? 18 : 26),
                      Container(width: 64, height: 1, color: Brand.gold.withValues(alpha: 0.5)),
                      SizedBox(height: landscape ? 22 : 34),

                      // Shrinks to fit rather than wrapping mid-name or
                      // clipping: "Mr. Christopher Vandenberghe" has to fit on
                      // one board, at whatever size that takes.
                      //
                      // The SizedBox is load-bearing. A FittedBox inside a
                      // Column is handed loose constraints, measures the text
                      // at its natural width and scales against that — so a
                      // long name ran straight off the edge of the board. A
                      // definite width is what it actually fits into.
                      SizedBox(
                        width: double.infinity,
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.center,
                          child: Text(
                            name,
                            maxLines: 1,
                            softWrap: false,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: landscape ? 92 : 56,
                              height: 1.1,
                              fontWeight: FontWeight.w300,
                              letterSpacing: 1.5,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),

                      if (flight.isNotEmpty) ...[
                        SizedBox(height: landscape ? 22 : 32),
                        Text(
                          flight.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: landscape ? 15 : 13,
                            letterSpacing: 3,
                            color: Colors.white.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Fades rather than unmounts, so the way out is always really
              // there to be tapped even mid-transition.
              AnimatedOpacity(
                opacity: _chrome ? 1 : 0,
                duration: const Duration(milliseconds: 200),
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.close),
                      color: Colors.white38,
                      tooltip: 'Close the name board',
                    ),
                  ),
                ),
              ),
              AnimatedOpacity(
                opacity: _chrome ? 1 : 0,
                duration: const Duration(milliseconds: 200),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      'Tap to hide these controls · The screen will stay on',
                      style: TextStyle(fontSize: 10.5, color: Colors.white.withValues(alpha: 0.4)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
