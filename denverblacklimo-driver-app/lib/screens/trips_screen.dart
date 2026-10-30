import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../api/driver_api.dart';
import '../models/trip.dart';
import '../theme.dart';

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
  late Future<List<Trip>> _future;
  String _scope = 'upcoming';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Trip>> _load() async {
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
    await next.catchError((_) => <Trip>[]);
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
        onRefresh: _refresh,
        child: FutureBuilder<List<Trip>>(
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
            final trips = snap.data ?? const <Trip>[];
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
              itemCount: trips.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _TripCard(
                trip: trips[i],
                onCall: (phone) => _open(Uri.parse('tel:$phone')),
                onNavigate: (t) => _open(t.mapsUri),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip, required this.onCall, required this.onNavigate});

  final Trip trip;
  final void Function(String phone) onCall;
  final void Function(Trip trip) onNavigate;

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
              Text('Your pay: ${trip.pay}',
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
                  child: FilledButton.icon(
                    onPressed: () => onNavigate(trip),
                    icon: const Icon(Icons.navigation, size: 18),
                    label: const Text('Navigate'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                  ),
                ),
              ],
            ),
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
