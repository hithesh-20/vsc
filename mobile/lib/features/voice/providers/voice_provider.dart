import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/voice_engine_service.dart';

class VoiceState {
  final bool isListening;
  final bool isProcessing;
  final String recognizedText;
  final String responseText;
  final bool hasSpoken;

  const VoiceState({
    this.isListening = false,
    this.isProcessing = false,
    this.recognizedText = '',
    this.responseText = '',
    this.hasSpoken = false,
  });

  VoiceState copyWith({
    bool? isListening,
    bool? isProcessing,
    String? recognizedText,
    String? responseText,
    bool? hasSpoken,
  }) {
    return VoiceState(
      isListening: isListening ?? this.isListening,
      isProcessing: isProcessing ?? this.isProcessing,
      recognizedText: recognizedText ?? this.recognizedText,
      responseText: responseText ?? this.responseText,
      hasSpoken: hasSpoken ?? this.hasSpoken,
    );
  }
}

class VoiceNotifier extends StateNotifier<VoiceState> {
  VoiceNotifier() : super(const VoiceState()) {
    _engine.init();
  }

  final VoiceEngineService _engine = VoiceEngineService();

  Future<void> submitQuery(String queryText, String langCode) async {
    state = state.copyWith(
      isListening: false,
      isProcessing: true,
      recognizedText: queryText,
      responseText: '',
    );

    final res = await _engine.processQuery(queryText: queryText, langCode: langCode);
    final data = res['data'] ?? {};
    final reply = langCode == 'kn'
        ? (data['speech_response_kn'] ?? 'ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.')
        : (data['speech_response_text'] ?? 'Your voice request has been processed.');

    state = state.copyWith(
      isProcessing: false,
      responseText: reply,
      hasSpoken: true,
    );

    await _engine.speak(reply, langCode);
  }

  void stop() {
    _engine.stop();
    state = state.copyWith(isListening: false, isProcessing: false);
  }
}

final voiceProvider = StateNotifierProvider<VoiceNotifier, VoiceState>((ref) {
  return VoiceNotifier();
});
