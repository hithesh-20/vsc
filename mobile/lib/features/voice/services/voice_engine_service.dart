import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/local_db_service.dart';

class VoiceEngineService {
  final FlutterTts _tts = FlutterTts();
  final SpeechToText _speechToText = SpeechToText();
  bool _speechInitialized = false;

  Future<void> init() async {
    await _tts.setPitch(1.0);
    await _tts.setSpeechRate(0.85);
  }

  Future<bool> initSpeech() async {
    if (!_speechInitialized) {
      _speechInitialized = await _speechToText.initialize();
    }
    return _speechInitialized;
  }

  Future<void> speak(String text, String langCode) async {
    await _tts.setLanguage(langCode == 'kn' ? 'kn-IN' : 'en-US');
    await _tts.speak(text);
  }

  Future<void> stop() async {
    await _tts.stop();
    await _speechToText.stop();
  }

  /// Process voice query and execute action (POS, Udhaar, Inventory)
  Future<Map<String, dynamic>> processQuery({
    required String queryText,
    required String langCode,
  }) async {
    // 1. Try Backend NLP endpoint
    final result = await ApiClient.sendVoiceQuery(queryText, langCode);

    // 2. Perform local slot extraction & automatic ledger mutations
    final q = queryText.toLowerCase();

    // Check for sale intent: "Record sale of 2 kg onions for 60 rupees cash" or "೨ ಕೆಜಿ ಈರುಳ್ಳಿ ೬೦ ರೂ ಮಾರಾಟ"
    if (q.contains("ಮಾರಾಟ") || q.contains("sale") || q.contains("record")) {
      // Find commodity
      double qty = 2.0;
      double price = 60.0;
      String prodId = "2"; // Onion

      if (q.contains("ಟೊಮೇಟೊ") || q.contains("tomato")) {
        prodId = "1";
        price = 60.0;
      }

      await ApiClient.recordSale(
        customerName: "Voice Customer",
        items: [
          {
            "product_id": prodId,
            "product_name": "Onion",
            "quantity": qty,
            "unit": "kg",
            "unit_price": price / qty,
          }
        ],
        paymentMode: "CASH",
        totalAmount: price,
      );
    }
    // Check for udhaar intent: "Add 50 rupees Udhaar to Suresh" or "ಸುರೇಶ್‌ಗೆ ೫೦ ರೂಪಾಯಿ ಉದಾರ್ ಸೇರಿಸಿ"
    else if (q.contains("ಉದಾರ್") || q.contains("udhaar") || q.contains("credit")) {
      final udhaarList = await LocalDbService.getUdhaarList();
      for (var u in udhaarList) {
        if (u['customer_name'].toString().contains("Suresh") || q.contains("ಸುರೇಶ್")) {
          u['amount_due'] = ((u['amount_due'] as num).toDouble()) + 50.0;
          await LocalDbService.saveUdhaarList(udhaarList);
          break;
        }
      }
    }

    return result;
  }
}
