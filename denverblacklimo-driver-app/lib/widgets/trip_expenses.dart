import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/api_client.dart';
import '../api/driver_api.dart';
import '../theme.dart';

/// What the chauffeur paid out on a trip.
///
/// The agreement already allows tolls and parking to be charged on, but
/// nothing recorded them, so a driver paid the E-470 toll and the DIA
/// structure themselves and the company billed neither the client nor them.
/// It is a small sum on most airport runs, which is exactly why it went
/// unnoticed.
const tripExpenseKinds = <String, String>{
  'toll': 'Toll',
  'parking': 'Parking',
  'fuel': 'Fuel',
  'cleaning': 'Cleaning',
  'other': 'Other',
};

class TripExpenseButton extends StatelessWidget {
  const TripExpenseButton({
    super.key,
    required this.api,
    required this.tripId,
    required this.onChanged,
  });

  final DriverApi api;
  final String tripId;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () async {
        await showModalBottomSheet<void>(
          context: context,
          backgroundColor: Brand.surfaceHigh,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          builder: (_) => TripExpenseSheet(api: api, tripId: tripId),
        );
        onChanged();
      },
      icon: const Icon(Icons.receipt_long_outlined, size: 18),
      label: const Text('Tolls & parking'),
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white70,
        side: const BorderSide(color: Brand.line),
        minimumSize: const Size.fromHeight(44),
      ),
    );
  }
}

class TripExpenseSheet extends StatefulWidget {
  const TripExpenseSheet({super.key, required this.api, required this.tripId});

  final DriverApi api;
  final String tripId;

  @override
  State<TripExpenseSheet> createState() => _TripExpenseSheetState();
}

class _TripExpenseSheetState extends State<TripExpenseSheet> {
  final _amount = TextEditingController();
  final _note = TextEditingController();
  String _kind = 'toll';
  bool _busy = false;
  Future<List<Map<String, dynamic>>>? _already;

  @override
  void initState() {
    super.initState();
    _already = _load();
  }

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<List<Map<String, dynamic>>> _load() async {
    try {
      return await widget.api.tripExpenses(widget.tripId);
    } catch (_) {
      return const [];
    }
  }

  /// Null when the field does not hold a usable sum.
  ///
  /// The server refuses anything it cannot read as a number, so catching it
  /// here is about telling the driver before they wait for a round trip, not
  /// about trusting the client.
  double? get _parsed {
    final v = double.tryParse(_amount.text.trim().replaceAll(RegExp(r'[^0-9.]'), ''));
    return v == null || v <= 0 ? null : v;
  }

  Future<void> _save() async {
    final amount = _parsed;
    if (amount == null || _busy) return;
    setState(() => _busy = true);
    try {
      await widget.api.addExpense(
        tripId: widget.tripId,
        kind: _kind,
        amount: amount,
        note: _note.text.trim().isEmpty ? null : _note.text.trim(),
      );
      if (!mounted) return;
      _amount.clear();
      _note.clear();
      // Block body, not an arrow: an arrow returns the assignment's value,
      // which here is a Future, and setState asserts on that.
      setState(() {
        _already = _load();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${tripExpenseKinds[_kind]} of \$${amount.toStringAsFixed(2)} recorded')),
      );
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Tolls & parking',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
            ),
            const SizedBox(height: 4),
            const Text(
              'What you paid out on this trip, so it reaches the invoice and you are paid back.',
              style: TextStyle(fontSize: 12, color: Colors.white54),
            ),
            const SizedBox(height: 16),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in tripExpenseKinds.entries)
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

            TextField(
              controller: _amount,
              autofocus: true,
              // decimal: true, because a toll is $13.50 — a plain number pad
              // on iOS has no point key and the amount cannot be typed.
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _save(),
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixText: '\$ ',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _note,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'What it was for (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),

            FilledButton(
              onPressed: _parsed == null || _busy ? null : _save,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Brand.black),
                    )
                  : const Text('RECORD IT'),
            ),

            const SizedBox(height: 18),
            _Already(future: _already),
          ],
        ),
      ),
    );
  }
}

/// What has already been recorded for this trip, and what it comes to.
class _Already extends StatelessWidget {
  const _Already({required this.future});

  final Future<List<Map<String, dynamic>>>? future;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: future,
      builder: (context, snap) {
        final rows = snap.data ?? const <Map<String, dynamic>>[];
        if (rows.isEmpty) {
          return const Text(
            'Nothing recorded on this trip yet.',
            style: TextStyle(fontSize: 12, color: Colors.white38),
          );
        }
        // NUMERIC comes back from the API as the string "13.50"; adding these
        // without parsing would concatenate them.
        final total = rows.fold<double>(
          0,
          (sum, r) => sum + (double.tryParse('${r['amount']}') ?? 0),
        );
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final r in rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        [
                          tripExpenseKinds['${r['kind']}'] ?? '${r['kind']}',
                          if ('${r['note'] ?? ''}'.isNotEmpty) '${r['note']}',
                        ].join(' · '),
                        style: const TextStyle(fontSize: 12.5, color: Colors.white70),
                      ),
                    ),
                    Text(
                      '\$${(double.tryParse('${r['amount']}') ?? 0).toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            const Divider(height: 14, color: Brand.line),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Total paid out',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Brand.ok,
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}
