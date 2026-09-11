import '../storage/outbox_queue_service.dart';
import '../network/api_client.dart';

class OfflineSyncManager {
  static Future<int> getPendingSyncCount() async {
    return await OutboxQueueService.getPendingCount();
  }

  static Future<void> queueOfflineSale({
    required String customerName,
    required double totalAmount,
    required String paymentMode,
    required List<Map<String, dynamic>> items,
  }) async {
    await OutboxQueueService.enqueue(
      mutationType: 'CREATE_SALE',
      payload: {
        'customer_name': customerName,
        'total_amount': totalAmount,
        'payment_mode': paymentMode,
        'items': items,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  static Future<bool> syncPendingMutations() async {
    return await ApiClient.syncPendingMutations();
  }
}
