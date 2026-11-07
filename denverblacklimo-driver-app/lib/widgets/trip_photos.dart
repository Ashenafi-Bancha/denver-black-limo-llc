import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../api/api_client.dart';
import '../api/driver_api.dart';
import '../api/pending_photo.dart';
import '../theme.dart';

/// Photographs on a trip.
///
/// The agreement makes the client liable for "smoking in the vehicles,
/// vomiting in vehicle, excessive spills/messes, burns, tears, broken
/// glassware", and bills a no-show. Every one of those is argued after the
/// fact against someone who remembers it differently, and a photograph taken
/// at the time is what settles it.
///
/// The button is small and the sheet does the work, because a driver adding a
/// picture has stopped to do it — unlike a status press, which happens with
/// one hand on a door handle.
const tripPhotoKinds = <String, String>{
  'vehicle_before': 'Vehicle before',
  'vehicle_after': 'Vehicle after',
  'damage': 'Damage',
  'no_show': 'No-show',
  'other': 'Other',
};

/// Labels for display, which is a wider set than the chips above.
///
/// A signature is filed as a photograph of kind 'signature', but it is taken
/// on the signature pad and never from the camera — so it has to be nameable
/// in the strip without being offerable as something to point a lens at.
String tripPhotoLabel(String kind) =>
    tripPhotoKinds[kind] ?? (kind == 'signature' ? 'Signed for' : kind);

class TripPhotoButton extends StatelessWidget {
  const TripPhotoButton({
    super.key,
    required this.api,
    required this.tripId,
    required this.onChanged,
  });

  final DriverApi api;
  final String tripId;

  /// The card owns the queue count it displays, so it has to be told.
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final waiting = api.photos.forTrip(tripId).length;

    return OutlinedButton.icon(
      onPressed: () async {
        await showModalBottomSheet<void>(
          context: context,
          backgroundColor: Brand.surfaceHigh,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          builder: (_) => TripPhotoSheet(api: api, tripId: tripId),
        );
        onChanged();
      },
      icon: const Icon(Icons.photo_camera_outlined, size: 18),
      label: Text(waiting > 0 ? 'Photos ($waiting waiting)' : 'Photos'),
      style: OutlinedButton.styleFrom(
        foregroundColor: waiting > 0 ? Brand.warn : Colors.white70,
        side: BorderSide(color: waiting > 0 ? Brand.warn : Brand.line),
        minimumSize: const Size.fromHeight(44),
      ),
    );
  }
}

class TripPhotoSheet extends StatefulWidget {
  const TripPhotoSheet({super.key, required this.api, required this.tripId});

  final DriverApi api;
  final String tripId;

  @override
  State<TripPhotoSheet> createState() => _TripPhotoSheetState();
}

class _TripPhotoSheetState extends State<TripPhotoSheet> {
  final _picker = ImagePicker();
  bool _busy = false;
  String _kind = 'damage';

  /// What the server already holds. Fetched once, on opening, rather than for
  /// every card in the list: a driver who wants to see them has asked.
  Future<List<Map<String, dynamic>>>? _filed;

  @override
  void initState() {
    super.initState();
    _filed = _loadFiled();
  }

  Future<List<Map<String, dynamic>>> _loadFiled() async {
    try {
      return await widget.api.tripPhotos(widget.tripId);
    } catch (_) {
      // Offline is the normal case for this app. An empty strip plus the
      // pending ones is still a true picture of what has been taken.
      return const [];
    }
  }

  Future<void> _add(ImageSource source) async {
    setState(() => _busy = true);
    try {
      final shot = await _picker.pickImage(
        source: source,
        // Resized and re-encoded on the device. A modern phone photo is
        // several megabytes; the office needs to see the tear in the seat,
        // not count the pixels in it, and every one of these is stored in
        // Postgres forever.
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 80,
        requestFullMetadata: false,
      );
      if (shot == null) return;

      final delivery = await widget.api.addTripPhoto(
        tripId: widget.tripId,
        kind: _kind,
        filePath: shot.path,
      );

      if (!mounted) return;
      // Block body, not an arrow — see the note in trip_expenses.dart.
      setState(() {
        _filed = _loadFiled();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          duration: Duration(seconds: delivery == StatusDelivery.queued ? 4 : 2),
          content: Text(
            delivery == StatusDelivery.queued
                ? 'Photo saved on this phone — sends when you have signal'
                : 'Photo sent',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not use the camera on this device.')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final waiting = widget.api.photos.forTrip(widget.tripId);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Trip photos',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
            ),
            const SizedBox(height: 4),
            const Text(
              'Evidence for damage, a mess, or nobody at the pick-up.',
              style: TextStyle(fontSize: 12, color: Colors.white54),
            ),
            const SizedBox(height: 16),

            // Chosen before the camera opens, so the driver is not asked to
            // classify a photograph after taking it with gloves on.
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in tripPhotoKinds.entries)
                  ChoiceChip(
                    label: Text(e.value),
                    selected: _kind == e.key,
                    onSelected: _busy ? null : (_) => setState(() => _kind = e.key),
                    showCheckmark: false,
                    backgroundColor: Brand.black,
                    selectedColor: Brand.gold,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _kind == e.key ? Brand.black : Colors.white70,
                    ),
                    side: BorderSide(color: _kind == e.key ? Brand.gold : Brand.line),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _busy ? null : () => _add(ImageSource.camera),
                    icon: const Icon(Icons.photo_camera, size: 20),
                    label: const Text('TAKE PHOTO'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  height: 52,
                  width: 52,
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => _add(ImageSource.gallery),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      side: const BorderSide(color: Brand.line),
                    ),
                    child: const Icon(Icons.photo_library_outlined, color: Colors.white70),
                  ),
                ),
              ],
            ),

            if (_busy)
              const Padding(
                padding: EdgeInsets.only(top: 16),
                child: LinearProgressIndicator(color: Brand.gold, backgroundColor: Brand.line),
              ),

            const SizedBox(height: 20),
            _Strip(api: widget.api, waiting: waiting, filed: _filed),
          ],
        ),
      ),
    );
  }
}

/// Everything taken for this trip: what is still on the phone, then what the
/// office already has.
class _Strip extends StatelessWidget {
  const _Strip({required this.api, required this.waiting, required this.filed});

  final DriverApi api;
  final List<PendingPhoto> waiting;
  final Future<List<Map<String, dynamic>>>? filed;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: filed,
      builder: (context, snap) {
        final sent = snap.data ?? const <Map<String, dynamic>>[];
        if (waiting.isEmpty && sent.isEmpty) {
          return const Text(
            'No photos on this trip yet.',
            style: TextStyle(fontSize: 12, color: Colors.white38),
          );
        }
        return SizedBox(
          height: 104,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              for (final p in waiting)
                _Thumb(
                  label: tripPhotoLabel(p.kind),
                  waiting: true,
                  image: FileImage(File(p.filePath)),
                ),
              for (final p in sent)
                _Thumb(
                  label: tripPhotoLabel('${p['kind']}'),
                  waiting: false,
                  // Behind a token, so the header goes with the request. An
                  // <img> cannot do this, which is why the admin fetches these
                  // as blobs rather than pointing at the URL.
                  image: NetworkImage(
                    '${api.client.baseUrl}/trip-photos/${p['id']}',
                    headers: {'Authorization': 'Bearer ${api.store.accessToken}'},
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.label, required this.waiting, required this.image});

  final String label;
  final bool waiting;
  final ImageProvider image;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Stack(
              children: [
                Image(
                  image: image,
                  width: 78,
                  height: 78,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    width: 78,
                    height: 78,
                    color: Brand.black,
                    child: const Icon(Icons.broken_image_outlined, color: Colors.white24),
                  ),
                ),
                if (waiting)
                  Positioned(
                    right: 4,
                    top: 4,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: Brand.warn,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Icon(Icons.cloud_upload_outlined, size: 12, color: Brand.black),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          SizedBox(
            width: 78,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10, color: waiting ? Brand.warn : Colors.white54),
            ),
          ),
        ],
      ),
    );
  }
}
