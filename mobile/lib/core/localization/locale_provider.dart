import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_translations.dart';

class LocaleNotifier extends StateNotifier<String> {
  LocaleNotifier() : super('kn') {
    _loadSavedLocale();
  }

  static const String _prefKey = 'vendorsathi_language_pref';

  Future<void> _loadSavedLocale() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && (saved == 'kn' || saved == 'en')) {
        state = saved;
      }
    } catch (_) {}
  }

  Future<void> setLocale(String langCode) async {
    if (langCode != 'kn' && langCode != 'en') return;
    state = langCode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, langCode);
    } catch (_) {}
  }

  void toggleLocale() {
    final next = state == 'kn' ? 'en' : 'kn';
    setLocale(next);
  }

  String tr(String key, {Map<String, String>? params}) {
    return AppTranslations.get(key, state, params: params);
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, String>((ref) {
  return LocaleNotifier();
});
