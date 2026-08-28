import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:http/http.dart' as http;
import '../network/api_client.dart';

class OfflineSyncManager {
  static const String _outboxKey = "vendor_outbox_mutations";
  static final _uuid = Uuid();

  /// Queue a POS sale offline when network is unavailable
  static Future<String> queueOfflineSale({
    required String customerName,
    required double totalAmount,
    required String paymentMode,
    required List<Map<String, dynamic>> items,
  }) async {
    final mutationId = _uuid.v4();
    final mutation = {
      "client_mutation_id": mutationId,
      "entity_type": "SALE",
      "payload": {
        "customer_name": customerName,
        "total_amount": totalAmount,
        "discount_amount": 0.0,
        "payment_mode": paymentMode,
        "cash_paid": paymentMode == "CASH" ? totalAmount : 0.0,
        "upi_paid": paymentMode == "UPI" ? totalAmount : 0.0,
        "items": items,
      },
      "client_timestamp": DateTime.now().toUtc().toIso8601String(),
    };

    final prefs = await SharedPreferences.getInstance();
    final List<String> currentQueue = prefs.getStringList(_outboxKey) ?? [];
    currentQueue.add(jsonEncode(mutation));
    await prefs.setStringList(_outboxKey, currentQueue);

    return mutationId;
  }

  /// Get count of pending offline transactions
  static Future<int> getPendingSyncCount() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String> currentQueue = prefs.getStringList(_outboxKey) ?? [];
      return currentQueue.length;
    } catch (_) {
      return 0;
    }
  }

  /// Flush outbox queue to backend server
  static Future<bool> syncPendingMutations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String> currentQueue = prefs.getStringList(_outboxKey) ?? [];

      if (currentQueue.isEmpty) return true;

      final List<Map<String, dynamic>> mutations = currentQueue
          .map((itemStr) => jsonDecode(itemStr) as Map<String, dynamic>)
          .toList();

      final response = await http.post(
        Uri.parse("${ApiClient.fallbackLocalUrl}/sync/batch-upload"),
        headers: ApiClient.headers,
        body: jsonEncode({"mutations": mutations}),
      );

      if (response.statusCode == 200) {
        // Successfully synchronized - clear local outbox
        await prefs.setStringList(_outboxKey, []);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
