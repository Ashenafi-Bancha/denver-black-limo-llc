import 'package:flutter/material.dart';

/// The Denver Black Limo palette, matching the website and the admin.
///
/// Dark by default and not as a preference: a chauffeur uses this at 5am in a
/// dark car, and a white screen at that hour is genuinely unpleasant to look
/// at and slow to read from.
abstract final class Brand {
  static const black = Color(0xFF0A0A0A);
  static const surface = Color(0xFF1A1A1A);
  static const surfaceHigh = Color(0xFF242424);
  static const gold = Color(0xFFC9A227);
  static const goldLight = Color(0xFFD4AF37);
  static const line = Color(0x1AFFFFFF);

  static const ok = Color(0xFF34D399);
  static const warn = Color(0xFFFBBF24);
  static const bad = Color(0xFFF87171);
}

ThemeData buildTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: Brand.black,
    colorScheme: base.colorScheme.copyWith(
      primary: Brand.gold,
      secondary: Brand.goldLight,
      surface: Brand.surface,
      error: Brand.bad,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Brand.black,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Brand.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Brand.line),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Brand.black,
      // 16px, because anything smaller makes iOS Safari and some Android
      // keyboards zoom the page on focus.
      hintStyle: const TextStyle(color: Colors.white38, fontSize: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Brand.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Brand.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Brand.gold),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Brand.gold,
        foregroundColor: Brand.black,
        // 52 rather than the default 40: this is pressed with a thumb, often
        // in a hurry, sometimes in gloves.
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.8),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: Brand.surfaceHigh,
      contentTextStyle: TextStyle(color: Colors.white),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
