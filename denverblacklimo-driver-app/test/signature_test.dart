import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:dbl_driver/screens/signature_screen.dart';

/// Proof of delivery.
///
/// The signature ends up embedded in a PDF sent to a customer, so the cases
/// that matter are the ones that would produce a document with a blank box in
/// it: an empty pad accepted, or an image written with no ink on it.
Future<void> pumpPad(WidgetTester tester, {String name = 'Tatiana Jimenez'}) async {
  tester.view.physicalSize = const Size(400, 800);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(home: SignatureScreen(passengerName: name)));
  await tester.pumpAndSettle();
}

/// Drags a short squiggle across the pad.
Future<void> sign(WidgetTester tester) async {
  final pad = find.byType(CustomPaint).first;
  final centre = tester.getCenter(pad);
  final gesture = await tester.startGesture(centre - const Offset(60, 0));
  for (var dx = -40.0; dx <= 60.0; dx += 20) {
    await gesture.moveTo(centre + Offset(dx, dx.isNegative ? 12 : -12));
    await tester.pump();
  }
  await gesture.up();
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('an empty pad cannot be saved', (tester) async {
    await pumpPad(tester);

    final save = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(save.onPressed, isNull,
        reason: 'a blank signature would reach a customer as an empty box');
    expect(find.text('Sign here'), findsOneWidget);
  });

  testWidgets('signing enables saving and hides the prompt', (tester) async {
    await pumpPad(tester);
    await sign(tester);

    final save = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(save.onPressed, isNotNull);
    expect(find.text('Sign here'), findsNothing);
  });

  testWidgets('clearing takes it back to empty', (tester) async {
    await pumpPad(tester);
    await sign(tester);

    await tester.tap(find.text('Clear'));
    await tester.pumpAndSettle();

    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);
    expect(find.text('Sign here'), findsOneWidget);
  });

  // The PNG encode is NOT asserted here. ui.Image.toByteData(png) never
  // completes under flutter test — the headless engine has no raster backend
  // to encode with, and it hangs rather than failing, even inside runAsync.
  // It is verified against a real engine instead; see the note in
  // lib/screens/signature_screen.dart. What is covered here is the gating
  // that stops a blank signature ever reaching that encode.

  testWidgets('the signer can be someone other than the passenger', (tester) async {
    await pumpPad(tester, name: 'Tatiana Jimenez');

    await tester.enterText(find.byType(TextField), 'Assistant, R. Okafor');
    await tester.pumpAndSettle();

    expect(find.text('Assistant, R. Okafor'), findsOneWidget);
  });

  testWidgets('the pad is white, because it is printed on paper', (tester) async {
    await pumpPad(tester);

    // Hunting the Container that wraps the drawing surface rather than
    // asserting on a screenshot, which Flutter web cannot be trusted for.
    final whites = tester
        .widgetList<Container>(find.byType(Container))
        .where((c) => c.color == Colors.white);
    expect(whites, isNotEmpty,
        reason: 'dark ink on a dark pad embeds into the record as a negative');
  });
}
