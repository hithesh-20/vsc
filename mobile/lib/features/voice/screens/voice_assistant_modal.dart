import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/voice_provider.dart';

class VoiceAssistantModal extends ConsumerStatefulWidget {
  final VoidCallback onDataChanged;

  const VoiceAssistantModal({Key? key, required this.onDataChanged}) : super(key: key);

  @override
  ConsumerState<VoiceAssistantModal> createState() => _VoiceAssistantModalState();
}

class _VoiceAssistantModalState extends ConsumerState<VoiceAssistantModal> {
  final List<String> _knPrompts = [
    "೨ ಕೆಜಿ ಈರುಳ್ಳಿ ೬೦ ರೂ ನಗದು ಮಾರಾಟ ದಾಖಲಿಸಿ",
    "ಸುರೇಶ್‌ಗೆ ೫೦ ರೂಪಾಯಿ ಉದಾರ್ ಸೇರಿಸಿ",
    "ನನ್ನ ಬಳಿ ಎಷ್ಟು ಟೊಮೇಟೊ ದಾಸ್ತಾನು ಇದೆ?",
    "ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ?",
    "ಇಂದು ನನ್ನ ಲಾಭ ಎಷ್ಟು?",
  ];

  final List<String> _enPrompts = [
    "Record sale of 2 kg onions for 60 rupees cash",
    "Add 50 rupees Udhaar to Suresh",
    "What is my tomato stock?",
    "What is my total sales today?",
    "What is my net profit today?",
  ];

  void _triggerVoiceQuery(String query) async {
    final lang = ref.read(localeProvider);
    await ref.read(voiceProvider.notifier).submitQuery(query, lang);
    widget.onDataChanged();
  }

  @override
  void dispose() {
    ref.read(voiceProvider.notifier).stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final voiceState = ref.watch(voiceProvider);
    final prompts = lang == 'kn' ? _knPrompts : _enPrompts;

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
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
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
                  Text(
                    tr.tr('voice_assistant_title'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textMain),
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

          // Voice Status / Response Box
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
                  voiceState.recognizedText.isNotEmpty
                      ? voiceState.recognizedText
                      : tr.tr('tap_to_speak'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.voicePurple),
                ),
                if (voiceState.isProcessing) ...[
                  const SizedBox(height: 12),
                  const CircularProgressIndicator(color: AppColors.voicePurple, strokeWidth: 3),
                ],
                if (voiceState.responseText.isNotEmpty) ...[
                  const Divider(height: 24),
                  Row(
                    children: [
                      const Icon(Icons.volume_up, color: AppColors.vendorGreen, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          voiceState.responseText,
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
            onTap: () => _triggerVoiceQuery(prompts[0]),
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
              child: const Icon(Icons.mic, color: Colors.white, size: 42),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            tr.tr('tap_to_speak'),
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 20),

          // Quick Suggestion Chips
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              tr.tr('quick_commands'),
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: prompts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final prompt = prompts[index];
                return ActionChip(
                  label: Text(prompt, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  backgroundColor: Colors.white,
                  side: BorderSide(color: Colors.grey.shade300),
                  onPressed: () => _triggerVoiceQuery(prompt),
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
