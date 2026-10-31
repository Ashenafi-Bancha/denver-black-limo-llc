import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../api/driver_api.dart';
import '../api/pending_status.dart';
import '../api/trip_cache.dart';
import '../models/trip.dart';
import '../theme.dart';
import 'name_board_screen.dart';
import 'signature_screen.dart';
import '../widgets/day_summary.dart';
import '../widgets/trip_photos.dart';
import '../widgets/trip_status_bar.dart';

/// The driver's schedule — the screen the app exists for.
///
/// One trip per card, in large type, readable at a glance by someone sitting
/// at the wheel. The things a chauffeur reaches for while working — calling
/// the passenger, opening the route — are buttons on the card rather than
/// something found by opening the trip first.
class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key, required this.api, required this.onSignedOut});

  final DriverApi api;
  final VoidCallback onSignedOut;

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  late Future<TripsResult> _future;
  String _scope = 'upcoming';

  /// The trip whose status is being saved, so only its button spins.
  String? _savingTripId;

  /// One clock for the whole list, so every wait counter agrees.
  DateTime _now = DateTime.now();
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _future = _load();
    // Thirty seconds: the counter is read in minutes, and a driver standing
    // at a kerb should not be paying for a rebuild every second.
    _tick = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted) return;
      setState(() => _now = DateTime.now());
      // No connectivity plugin: the signal is back if a request succeeds, and
      // one request every thirty seconds while something is waiting costs less
      // than another native dependency to find that out.
      if (_anythingWaiting) _flush();
    });
    // Anything left from a previous run goes as soon as the screen is up.
    _flush();
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _setStatus(Trip trip, String status) async {
    setState(() => _savingTripId = trip.id);
    try {
      final delivery = await widget.api.setTripStatus(tripId: trip.id, status: status);

      if (delivery == StatusDelivery.sent) {
        // Re-read rather than patch locally: the server decides what was
        // recorded, including the timestamp it kept.
        await _refresh();
        // The signal is evidently back, so anything held from earlier goes now.
        if (_anythingWaiting) await _flush();
      }

      if (mounted) {
        final queued = delivery == StatusDelivery.queued;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            duration: Duration(seconds: queued ? 4 : 2),
            content: Text(
              '${TripStatusBar.labels[status]} · ${TripStatusBar.clock(DateTime.now())}'
              '${queued ? ' — saved on this phone, sends when you have signal' : ''}',
            ),
          ),
        );
        // A queued press changes nothing on the server, so nothing refetches;
        // the card still has to show it.
        if (queued) setState(() {});
      }
    } on ApiException catch (e) {
      if (e.needsSignIn && mounted) {
        widget.onSignedOut();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _savingTripId = null);
    }
  }

  Future<TripsResult> _load() async {
    try {
      return await widget.api.trips(scope: _scope);
    } on ApiException catch (e) {
      // An expired session is not an error to show in a list — it means the
      // app has to go back to sign-in.
      if (e.needsSignIn && mounted) widget.onSignedOut();
      rethrow;
    }
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next.catchError((_) => const TripsResult(trips: []));
  }

  /// Pull-to-refresh. A driver who has just come back into signal reaches for
  /// this first, so it is the fastest way to drain the queue.
  Future<void> _refreshAndFlush() async {
    await _refresh();
    if (_anythingWaiting) await _flush();
  }

  /// Statuses or photographs — either is a reason to try the network.
  bool get _anythingWaiting =>
      !widget.api.pending.isEmpty || !widget.api.photos.isEmpty;

  /// Captures a signature and files it against the trip.
  ///
  /// Stored as a photograph of kind 'signature' rather than through a
  /// mechanism of its own: it is an image attached to a trip, and that way it
  /// inherits the offline queue, the token guard, the admin's strip and the
  /// trip record without any of them learning a new concept.
  Future<void> _signature(Trip trip) async {
    final result = await Navigator.of(context).push<SignatureResult>(
      MaterialPageRoute(builder: (_) => SignatureScreen(passengerName: trip.passengerName)),
    );
    if (result == null || !mounted) return;

    setState(() => _savingTripId = trip.id);
    try {
      final delivery = await widget.api.addTripPhoto(
        tripId: trip.id,
        kind: 'signature',
        filePath: result.filePath,
        note: result.name.isEmpty ? 'Signed on delivery' : 'Signed by ${result.name}',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          duration: Duration(seconds: delivery == StatusDelivery.queued ? 4 : 2),
          content: Text(
            delivery == StatusDelivery.queued
                ? 'Signature saved on this phone — sends when you have signal'
                : 'Signature sent',
          ),
        ),
      );
      setState(() {});
    } on ApiException catch (e) {
      if (e.needsSignIn && mounted) {
        widget.onSignedOut();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _savingTripId = null);
    }
  }

  /// Sends whatever is waiting. Safe to call often — the API runs one drain
  /// at a time, so overlapping calls cannot post the same press twice.
  Future<void> _flush() async {
    if (!widget.api.store.isSignedIn) return;
    FlushOutcome statuses;
    FlushOutcome pictures;
    try {
      // Statuses first. They are small, they are what the office is waiting
      // on, and a photograph stuck behind them on a thin connection would
      // hold up the timestamp a charge is billed from.
      statuses = await widget.api.flushPending();
      pictures = await widget.api.flushPendingPhotos();
    } catch (_) {
      // Nothing here is worth interrupting a driver for; the next tick retries.
      return;
    }
    final out = FlushOutcome(
      sent: statuses.sent + pictures.sent,
      dropped: statuses.dropped + pictures.dropped,
      expired: statuses.expired + pictures.expired,
      remaining: statuses.remaining + pictures.remaining,
    );
    if (!mounted || !out.changedAnything) return;

    if (statuses.sent > 0) await _refresh();
    if (!mounted) return;
    setState(() {});

    // The two that must not pass quietly: the driver believed these were
    // recorded, and they were not.
    final lost = out.dropped + out.expired;
    if (lost > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Brand.bad,
          duration: const Duration(seconds: 8),
          content: Text(
            lost == 1
                ? 'One saved item could not be recorded. Please tell dispatch what happened.'
                : '$lost saved items could not be recorded. Please tell dispatch what happened.',
          ),
        ),
      );
    }
  }

  Future<void> _open(Uri uri) async {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open that on this device.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = (widget.api.store.driver?['name'] as String?) ?? 'Driver';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My trips', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            Text(name, style: const TextStyle(fontSize: 12, color: Colors.white54)),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'signout') {
                await widget.api.signOut();
                widget.onSignedOut();
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'signout', child: Text('Sign out')),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'upcoming', label: Text('Upcoming')),
                ButtonSegment(value: 'past', label: Text('Past')),
              ],
              selected: {_scope},
              onSelectionChanged: (sel) {
                setState(() => _scope = sel.first);
                _refresh();
              },
              style: SegmentedButton.styleFrom(
                selectedBackgroundColor: Brand.gold,
                selectedForegroundColor: Brand.black,
                side: const BorderSide(color: Brand.line),
              ),
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        color: Brand.gold,
        backgroundColor: Brand.surface,
        onRefresh: _refreshAndFlush,
        child: FutureBuilder<TripsResult>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: Brand.gold));
            }
            if (snap.hasError) {
              return _Message(
                icon: Icons.cloud_off,
                title: 'Could not load your trips',
                detail: snap.error is ApiException
                    ? (snap.error as ApiException).message
                    : 'Please try again.',
                onRetry: _refresh,
              );
            }
            final result = snap.data ?? const TripsResult(trips: []);
            final trips = result.trips;
            final today = DaySummary.forToday(trips, _now);
            final headers = <Widget>[
              if (result.isStale) _StaleBanner(fetchedAt: result.cachedAt!, now: _now),
              if (today != null && _scope == 'upcoming') today,
            ];
            if (trips.isEmpty) {
              return _Message(
                icon: Icons.event_available,
                title: _scope == 'past' ? 'No past trips' : 'Nothing scheduled',
                detail: _scope == 'past'
                    ? 'Trips you have completed will appear here.'
                    : 'When the office assigns you a trip it will appear here.',
                onRetry: _refresh,
              );
            }
            return ListView.separated(
              // Always scrollable, so pull-to-refresh works even with one card.
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 32),
              itemCount: trips.length + headers.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (_, index) {
                // Built as a list rather than counted, so adding another
                // header cannot quietly shift every card by one.
                if (index < headers.length) return headers[index];
                final i = index - headers.length;
                return _TripCard(
                  api: widget.api,
                  trip: trips[i],
                  now: _now,
                  pending: widget.api.pending.overlayFor(trips[i].id),
                  busy: _savingTripId == trips[i].id,
                  onCall: (phone) => _open(Uri.parse('tel:$phone')),
                  onNavigate: (t) => _open(t.mapsUri),
                  onSetStatus: _setStatus,
                  onSignature: _signature,
                  onPhotosChanged: () {
                    if (mounted) setState(() {});
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }
}

/// Says these trips came off the phone, not the server.
///
/// Deliberately not an error. The driver has what they need — addresses,
/// telephone numbers, flight numbers — and the only thing they must know is
/// how old it is, so they can judge whether dispatch has changed something
/// since. Rendered unconditionally rather than behind an animation, for the
/// same reason the admin's offline banner is: a warning that depends on a
/// transition finishing is a warning that sometimes does not appear.
class _StaleBanner extends StatelessWidget {
  const _StaleBanner({required this.fetchedAt, required this.now});

  final DateTime fetchedAt;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final age = now.difference(fetchedAt);
    final when = age.inMinutes < 1
        ? 'a moment ago'
        : age.inMinutes < 60
            ? '${age.inMinutes} min ago'
            : age.inHours < 24
                ? '${age.inHours} ${age.inHours == 1 ? 'hour' : 'hours'} ago'
                : '${age.inDays} ${age.inDays == 1 ? 'day' : 'days'} ago';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Brand.warn.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Brand.warn.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off, size: 18, color: Brand.warn),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'No connection',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Brand.warn),
                ),
                Text(
                  'Showing the trips saved on this phone, last updated $when. '
                  'Pull down to try again.',
                  style: const TextStyle(fontSize: 11.5, height: 1.35, color: Colors.white70),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({
    required this.api,
    required this.trip,
    required this.now,
    required this.busy,
    this.pending,
    required this.onCall,
    required this.onNavigate,
    required this.onSetStatus,
    required this.onSignature,
    required this.onPhotosChanged,
  });

  final DriverApi api;
  final Trip trip;
  final DateTime now;
  final bool busy;

  /// Presses for this trip that are still on the phone.
  final PendingOverlay? pending;

  final void Function(String phone) onCall;
  final void Function(Trip trip) onNavigate;
  final void Function(Trip trip, String status) onSetStatus;
  final void Function(Trip trip) onSignature;

  /// The card shows how many photographs are still waiting, so it has to be
  /// rebuilt when the sheet adds or sends one.
  final VoidCallback onPhotosChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    trip.pickupTime.isEmpty ? 'Time to confirm' : trip.pickupTime,
                    style: const TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                      color: Brand.gold,
                      height: 1.1,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    border: Border.all(color: Brand.line),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(trip.reference,
                      style: const TextStyle(fontSize: 11, color: Colors.white54, fontFamily: 'monospace')),
                ),
              ],
            ),
            Text(
              trip.pickupDate.isEmpty ? 'Date to confirm' : trip.pickupDate,
              style: const TextStyle(color: Colors.white60, fontSize: 14),
            ),
            if (trip.spotTime != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  'Be on location by '
                  '${trip.spotTime!.hour.toString().padLeft(2, '0')}:'
                  '${trip.spotTime!.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(color: Brand.warn, fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),

            const Divider(height: 24, color: Brand.line),

            _Row(icon: Icons.trip_origin, text: trip.pickupLocation),
            if (trip.additionalStops.isNotEmpty)
              _Row(icon: Icons.more_vert, text: trip.additionalStops, dim: true),
            _Row(icon: Icons.place, text: trip.dropoffLocation),

            if (trip.isAirport && trip.flightLabel.isNotEmpty) ...[
              const SizedBox(height: 10),
              _Row(
                icon: Icons.flight,
                text: [
                  trip.flightLabel,
                  if (trip.terminal.isNotEmpty) trip.terminal,
                  if (trip.airportDirection.isNotEmpty) trip.airportDirection,
                ].join(' · '),
              ),
            ],

            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(trip.passengerName,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      Text(
                        [
                          '${trip.passengers.isEmpty ? '1' : trip.passengers} pax',
                          if (trip.luggage.isNotEmpty) '${trip.luggage} bags',
                          if (trip.vehicle.isNotEmpty) trip.vehicle,
                        ].join(' · '),
                        style: const TextStyle(color: Colors.white54, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                // The name board, spelled out so it is not improvised at the
                // kerb — the same rule the dispatch email has always used.
                if (trip.signName.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      border: Border.all(color: Brand.gold.withValues(alpha: 0.5)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Column(
                      children: [
                        const Text('SIGN', style: TextStyle(fontSize: 9, color: Colors.white38, letterSpacing: 1)),
                        Text(trip.signName,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.bold, color: Brand.gold)),
                      ],
                    ),
                  ),
              ],
            ),

            if (trip.dispatchNotes.isNotEmpty || trip.specialRequests.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Brand.black,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Brand.line),
                ),
                child: Text(
                  [trip.dispatchNotes, trip.specialRequests].where((s) => s.isNotEmpty).join('\n\n'),
                  style: const TextStyle(fontSize: 13, height: 1.45, color: Colors.white70),
                ),
              ),
            ],

            if (trip.pay.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text('Your pay: ${trip.payLabel}',
                  style: const TextStyle(fontSize: 13, color: Brand.ok, fontWeight: FontWeight.w600)),
            ],

            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: trip.passengerPhone.isEmpty ? null : () => onCall(trip.passengerPhone),
                    icon: const Icon(Icons.call, size: 18),
                    label: const Text('Call'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Brand.line),
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => onNavigate(trip),
                    icon: const Icon(Icons.navigation, size: 18),
                    label: const Text('Navigate'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Brand.line),
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                ),
                // Gold, unlike its neighbours: calling and navigating are
                // ordinary, and this one is the company's first impression.
                // Offered on every live trip rather than airport arrivals
                // only — chauffeurs hold a sign in hotel lobbies and office
                // receptions too, and a button that is missing when it is
                // wanted is worse than one that is occasionally ignored.
                if (!trip.isClosed) ...[
                  const SizedBox(width: 10),
                  SizedBox(
                    height: 48,
                    width: 48,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => NameBoardScreen(trip: trip)),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        foregroundColor: Brand.gold,
                        side: const BorderSide(color: Brand.gold),
                      ),
                      child: const Icon(Icons.badge_outlined, size: 20),
                    ),
                  ),
                ],
              ],
            ),

            const Divider(height: 24, color: Brand.line),

            TripStatusBar(
              pending: pending,
              trip: trip,
              now: now,
              busy: busy,
              onSet: (status) => onSetStatus(trip, status),
            ),
            const SizedBox(height: 10),
            // Below the status control rather than beside it: a photograph is
            // taken while stopped, and must never be a mis-tap away from the
            // button that records an arrival.
            TripPhotoButton(
              api: api,
              tripId: trip.id,
              onChanged: onPhotosChanged,
            ),

            // Only from the moment the passenger is in the car. Before that
            // there is nobody to sign, and offering it would be one more
            // control to read past at a kerb. It stays after drop-off, because
            // a chauffeur who forgot can still go back for it.
            if (trip.driverStatus == 'on_board' || trip.driverStatus == 'dropped_off') ...[
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: busy ? null : () => onSignature(trip),
                icon: const Icon(Icons.draw_outlined, size: 18),
                label: const Text('Passenger signature'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white70,
                  side: const BorderSide(color: Brand.line),
                  minimumSize: const Size.fromHeight(44),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.text, this.dim = false});

  final IconData icon;
  final String text;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: dim ? Colors.white30 : Brand.gold.withValues(alpha: 0.7)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: TextStyle(fontSize: 14, height: 1.35, color: dim ? Colors.white54 : Colors.white)),
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.title, required this.detail, required this.onRetry});

  final IconData icon;
  final String title;
  final String detail;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    // A ListView so pull-to-refresh still works on an empty or failed screen.
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.18),
        Icon(icon, size: 48, color: Colors.white24),
        const SizedBox(height: 16),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 17)),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Text(detail,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white38, fontSize: 13, height: 1.5)),
        ),
        const SizedBox(height: 24),
        Center(
          child: TextButton(onPressed: onRetry, child: const Text('Try again')),
        ),
      ],
    );
  }
}
