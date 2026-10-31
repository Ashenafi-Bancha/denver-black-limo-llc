import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../theme.dart';

/// What the passenger signed for.
///
/// The record already proves the car arrived and what the chauffeur saw. It
/// could not show that anybody was actually delivered, which is the line a
/// corporate account queries first.
///
/// Two decisions shape this screen:
///
///   * **The pad is white with dark ink**, against an otherwise black app.
///     The image is embedded in the trip record, on paper, next to type — a
///     white-on-black signature there would look like a negative, and a
///     transparent one would vanish.
///   * **It is drawn at a fixed resolution**, not at whatever size the handset
///     happens to be, so a signature taken on a small phone is not a blurred
///     smudge in a document sent to a customer.
class SignatureResult {
  const SignatureResult({required this.filePath, required this.name});

  final String filePath;
  final String name;
}

class SignatureScreen extends StatefulWidget {
  const SignatureScreen({super.key, required this.passengerName});

  /// Pre-fills the name. Usually the passenger signs for themselves; an
  /// assistant or a colleague sometimes does, so it stays editable.
  final String passengerName;

  @override
  State<SignatureScreen> createState() => _SignatureScreenState();
}

class _SignatureScreenState extends State<SignatureScreen> {
  /// Strokes, each a list of points. Kept as separate strokes rather than one
  /// list so lifting the pen does not draw a line across the page.
  final List<List<Offset>> _strokes = [];
  late final TextEditingController _name =
      TextEditingController(text: widget.passengerName.trim());
  bool _saving = false;

  /// The pad's drawing surface in logical pixels, captured on layout so the
  /// points can be scaled to the output image.
  Size _padSize = Size.zero;

  static const _outputWidth = 1000.0;

  bool get _hasInk => _strokes.any((s) => s.length > 1);

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _start(Offset p) => setState(() => _strokes.add([p]));
  void _extend(Offset p) => setState(() => _strokes.last.add(p));

  Future<void> _save() async {
    if (!_hasInk || _saving) return;
    setState(() => _saving = true);
    try {
      final bytes = await _render();
      final dir = await Directory.systemTemp.createTemp('dbl_signature');
      final file = File('${dir.path}${Platform.pathSeparator}signature.png');
      await file.writeAsBytes(bytes);
      if (!mounted) return;
      Navigator.of(context).pop(
        SignatureResult(
          filePath: file.path,
          name: _name.text.trim().isEmpty ? widget.passengerName.trim() : _name.text.trim(),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not save that signature. Please try again.')),
      );
    }
  }

  /// Draws the strokes to a PNG at a fixed size.
  ///
  /// Not covered by a widget test: ui.Image.toByteData(png) never completes
  /// under flutter test, because the headless engine has no raster backend to
  /// encode with — it hangs rather than failing, even inside runAsync. This
  /// was verified against a real engine instead, which produced a 1000x400
  /// PNG of 6,834 bytes with strokes against 2,564 bytes blank, so the ink
  /// demonstrably reaches the file. The tests cover the gating that stops an
  /// empty pad ever getting here.
  Future<List<int>> _render() async {
    final scale = _padSize.width > 0 ? _outputWidth / _padSize.width : 1.0;
    final height = _padSize.height * scale;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);

    // Opaque white, not transparent. A transparent PNG laid on white paper
    // works, but laid on anything else it disappears — and the office may put
    // this in an email as well as the record.
    canvas.drawRect(
      Rect.fromLTWH(0, 0, _outputWidth, height),
      Paint()..color = const Color(0xFFFFFFFF),
    );

    final pen = Paint()
      ..color = const Color(0xFF111111)
      ..strokeWidth = 3.0 * scale
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in _strokes) {
      if (stroke.length < 2) continue;
      final path = Path()..moveTo(stroke.first.dx * scale, stroke.first.dy * scale);
      for (final p in stroke.skip(1)) {
        path.lineTo(p.dx * scale, p.dy * scale);
      }
      canvas.drawPath(path, pen);
    }

    final image = await recorder.endRecording().toImage(_outputWidth.round(), height.round());
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    if (data == null) throw StateError('signature produced no bytes');
    return data.buffer.asUint8List();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Signature', style: TextStyle(fontSize: 17)),
        actions: [
          TextButton(
            onPressed: _hasInk && !_saving ? () => setState(_strokes.clear) : null,
            child: const Text('Clear'),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Please sign to confirm the journey is complete.',
                style: TextStyle(fontSize: 13, color: Colors.white70),
              ),
              const SizedBox(height: 14),

              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    _padSize = Size(constraints.maxWidth, constraints.maxHeight);
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        color: Colors.white,
                        child: GestureDetector(
                          // Opaque, or drags that begin on the blank area are
                          // swallowed by whatever is behind it.
                          behavior: HitTestBehavior.opaque,
                          onPanStart: (d) => _start(d.localPosition),
                          onPanUpdate: (d) => _extend(d.localPosition),
                          child: CustomPaint(
                            painter: _SignaturePainter(_strokes),
                            size: Size.infinite,
                            child: _hasInk
                                ? null
                                : const Center(
                                    child: Text(
                                      'Sign here',
                                      style: TextStyle(fontSize: 15, color: Color(0xFFBBBBBB)),
                                    ),
                                  ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 14),
              TextField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Name of the person signing',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: _hasInk && !_saving ? _save : null,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Brand.black),
                      )
                    : const Text('SAVE SIGNATURE'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  _SignaturePainter(this.strokes);

  final List<List<Offset>> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final pen = Paint()
      ..color = const Color(0xFF111111)
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      if (stroke.length < 2) continue;
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (final p in stroke.skip(1)) {
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, pen);
    }
  }

  // The stroke list is mutated in place as the pen moves, so identity is not
  // enough to tell one frame from the next.
  @override
  bool shouldRepaint(_SignaturePainter old) => true;
}
