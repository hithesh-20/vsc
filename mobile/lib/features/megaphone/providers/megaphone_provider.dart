import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

class MegaphoneState {
  final bool isBroadcasting;
  final String activePhrase;
  final int broadcastCount;

  const MegaphoneState({
    this.isBroadcasting = false,
    this.activePhrase = 'ತಾಜಾ ತರಕಾರಿಗಳು ಬಂತು! ತಾಜಾ ಟೊಮೇಟೊ, ಈರುಳ್ಳಿ, ಕ್ಯಾರೆಟ್ ಕಡಿಮೆ ಬೆಲೆಯಲ್ಲಿ!',
    this.broadcastCount = 0,
  });

  MegaphoneState copyWith({
    bool? isBroadcasting,
    String? activePhrase,
    int? broadcastCount,
  }) {
    return MegaphoneState(
      isBroadcasting: isBroadcasting ?? this.isBroadcasting,
      activePhrase: activePhrase ?? this.activePhrase,
      broadcastCount: broadcastCount ?? this.broadcastCount,
    );
  }
}

class MegaphoneNotifier extends StateNotifier<MegaphoneState> {
  MegaphoneNotifier() : super(const MegaphoneState()) {
    _initTts();
  }

  final FlutterTts _tts = FlutterTts();
  Timer? _loopTimer;

  void _initTts() async {
    await _tts.setPitch(1.0);
    await _tts.setSpeechRate(0.85);
  }

  void setPhrase(String phrase) {
    state = state.copyWith(activePhrase: phrase);
  }

  Future<void> startBroadcast(String phrase, String langCode) async {
    state = state.copyWith(isBroadcasting: true, activePhrase: phrase);
    await _tts.setLanguage(langCode == 'kn' ? 'kn-IN' : 'en-US');

    // First broadcast
    await _tts.speak(phrase);

    // Loop every 12 seconds
    _loopTimer?.cancel();
    _loopTimer = Timer.periodic(const Duration(seconds: 12), (timer) async {
      if (state.isBroadcasting) {
        state = state.copyWith(broadcastCount: state.broadcastCount + 1);
        await _tts.speak(state.activePhrase);
      } else {
        timer.cancel();
      }
    });
  }

  void stopBroadcast() {
    _loopTimer?.cancel();
    _tts.stop();
    state = state.copyWith(isBroadcasting: false);
  }
}

final megaphoneProvider = StateNotifierProvider<MegaphoneNotifier, MegaphoneState>((ref) {
  return MegaphoneNotifier();
});
