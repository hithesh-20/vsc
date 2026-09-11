import 'package:flutter/material.dart';
import 'voice_assistant_modal.dart';

// Alias for backward compatibility
class KannadaVoiceModal extends StatelessWidget {
  final VoidCallback onDataChanged;

  const KannadaVoiceModal({Key? key, required this.onDataChanged}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return VoiceAssistantModal(onDataChanged: onDataChanged);
  }
}
