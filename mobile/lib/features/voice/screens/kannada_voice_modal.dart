import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../../../core/constants/colors.dart';
import '../../../core/network/api_client.dart';

class KannadaVoiceModal extends StatefulWidget {
  final VoidCallback onDataChanged;

  const KannadaVoiceModal({Key? key, required this.onDataChanged}) : super(key: key);

  @override
  State<KannadaVoiceModal> createState() => _KannadaVoiceModalState();
}

class _KannadaVoiceModalState extends State<KannadaVoiceModal> {
  final FlutterTts _tts = FlutterTts();
  bool _isListening = false;
  String _recognizedText = "ಮಾತನಾಡಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ...";
  String _aiResponseKn = "";
  String _aiResponseEn = "";
  bool _isProcessing = false;

  final List<String> _quickVoicePrompts = [
    "ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ?",
    "ಇಂದು ನನ್ನ ಲಾಭ ಎಷ್ಟು?",
    "ನನ್ನ ಬಳಿ ಎಷ್ಟು ಟೊಮೇಟೊ ಇದೆ?",
    "ಐದು ಕಿಲೋ ಆಲೂಗಡ್ಡೆ ಸೇರಿಸಿ",
    "ಹತ್ತು ಸಮೋಸ ಮಾರಾಟ ಮಾಡಿದೆ",
    "ನನ್ನ ಹತ್ತಿರ ಎಷ್ಟು ಉದಾರ್ ಇದೆ?",
    "ನಾನು ಯಾವ ಕಡೆ ಹೋಗಬೇಕು?",
    "ಇಂದಿನ ಹವಾಮಾನ ಹೇಗಿದೆ?"
  ];

  @override
  void initState() {
    super.initState();
    _initTts();
  }

  void _initTts() async {
    await _tts.setLanguage("kn-IN");
    await _tts.setPitch(1.0);
    await _tts.setSpeechRate(0.85);
  }

  void _processVoiceQuery(String queryText) async {
    setState(() {
      _isListening = false;
      _isProcessing = true;
      _recognizedText = queryText;
    });

    final res = await ApiClient.sendVoiceQuery(queryText, "kn");

    if (res["success"] == true && res["data"] != null) {
      final data = res["data"];
      final knResponse = data["speech_response_kn"] ?? "";
      final enResponse = data["speech_response_text"] ?? "";

      setState(() {
        _isProcessing = false;
        _aiResponseKn = knResponse;
        _aiResponseEn = enResponse;
      });

      // Speak in Kannada
      await _tts.speak(knResponse);
      widget.onDataChanged();
    } else {
      setState(() {
        _isProcessing = false;
        _aiResponseKn = "ಕ್ಷಮಿಸಿ, ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.";
      });
    }
  }

  @override
  void dispose() {
    _tts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          Container(
            width: 48,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.voicePurpleLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.mic, color: AppColors.voicePurple, size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "ಕನ್ನಡ ಧ್ವನಿ ಸಹಾಯಕ",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textMain),
                      ),
                      Text("Kannada AI Voice Assistant", style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Voice Status Box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.voicePurpleLight.withOpacity(0.4),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.voicePurple.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Text(
                  _recognizedText,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.voicePurple),
                ),
                if (_isProcessing) ...[
                  const SizedBox(height: 12),
                  const CircularProgressIndicator(color: AppColors.voicePurple, strokeWidth: 3),
                ],
                if (_aiResponseKn.isNotEmpty) ...[
                  const Divider(height: 24),
                  Row(
                    children: [
                      const Icon(Icons.volume_up, color: AppColors.vendorGreen, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _aiResponseKn,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.vendorGreen),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Central Large Microphone Action Button
          GestureDetector(
            onTap: () {
              // Simulated voice trigger using primary test phrase
              _processVoiceQuery("ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ?");
            },
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [AppColors.voicePurple, Color(0xFF9333EA)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.voicePurple.withOpacity(0.35),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  )
                ],
              ),
              child: const Icon(Icons.mic, color: Colors.white, size: 40),
            ),
          ),
          const SizedBox(height: 8),
          const Text("ಸ್ಪರ್ಶಿಸಿ ಮಾತನಾಡಿ (Tap to Speak)", style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
          const SizedBox(height: 20),

          // Quick Suggestion Chips in Kannada
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              "ಉದಾಹರಣೆ ಪ್ರಶ್ನೆಗಳು (Quick Voice Commands):",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _quickVoicePrompts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final prompt = _quickVoicePrompts[index];
                return ActionChip(
                  label: Text(prompt, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  backgroundColor: Colors.white,
                  side: BorderSide(color: Colors.grey.shade300),
                  onPressed: () => _processVoiceQuery(prompt),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
