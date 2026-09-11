import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/local_db_service.dart';
import '../../../core/storage/outbox_queue_service.dart';

class UdhaarState {
  final List<Map<String, dynamic>> customers;
  final bool isLoading;
  final String searchQuery;

  const UdhaarState({
    this.customers = const [],
    this.isLoading = false,
    this.searchQuery = '',
  });

  double get totalOutstanding {
    return customers.fold(0.0, (sum, item) {
      final due = (item['amount_due'] as num?)?.toDouble() ?? 0.0;
      final paid = (item['amount_paid'] as num?)?.toDouble() ?? 0.0;
      return sum + (due - paid).clamp(0.0, 999999.0);
    });
  }

  List<Map<String, dynamic>> get filteredCustomers {
    if (searchQuery.isEmpty) return customers;
    final q = searchQuery.toLowerCase();
    return customers.where((c) {
      final name = (c['customer_name'] ?? '').toString().toLowerCase();
      final phone = (c['phone'] ?? '').toString().toLowerCase();
      return name.contains(q) || phone.contains(q);
    }).toList();
  }

  UdhaarState copyWith({
    List<Map<String, dynamic>>? customers,
    bool? isLoading,
    String? searchQuery,
  }) {
    return UdhaarState(
      customers: customers ?? this.customers,
      isLoading: isLoading ?? this.isLoading,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class UdhaarNotifier extends StateNotifier<UdhaarState> {
  UdhaarNotifier() : super(const UdhaarState()) {
    loadUdhaar();
  }

  Future<void> loadUdhaar() async {
    state = state.copyWith(isLoading: true);
    final list = await ApiClient.getUdhaarList();
    state = state.copyWith(customers: list, isLoading: false);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<void> recordPayment(String udhaarId, double amount) async {
    final updated = List<Map<String, dynamic>>.from(state.customers);
    for (var c in updated) {
      if (c['id'] == udhaarId) {
        final paid = (c['amount_paid'] as num?)?.toDouble() ?? 0.0;
        final due = (c['amount_due'] as num?)?.toDouble() ?? 0.0;
        final newPaid = paid + amount;
        c['amount_paid'] = newPaid;
        c['last_payment_date'] = DateTime.now().toIso8601String().substring(0, 10);
        if (newPaid >= due) {
          c['status'] = 'SETTLED';
        }
      }
    }
    await LocalDbService.saveUdhaarList(updated);
    state = state.copyWith(customers: updated);

    await ApiClient.recordUdhaarPayment(udhaarId, amount);
  }

  Future<void> addUdhaarEntry({
    required String customerName,
    required String phone,
    required double amountDue,
    required String dueDate,
    required String itemsSummary,
  }) async {
    final newEntry = {
      'id': 'udh-${DateTime.now().millisecondsSinceEpoch}',
      'customer_name': customerName,
      'phone': phone,
      'amount_due': amountDue,
      'amount_paid': 0.0,
      'due_date': dueDate,
      'last_payment_date': DateTime.now().toIso8601String().substring(0, 10),
      'items_summary': itemsSummary,
      'status': 'PENDING',
    };

    final updated = List<Map<String, dynamic>>.from(state.customers)..insert(0, newEntry);
    await LocalDbService.saveUdhaarList(updated);
    state = state.copyWith(customers: updated);

    await OutboxQueueService.enqueue(
      mutationType: 'RECORD_UDHAAR',
      payload: newEntry,
    );
  }
}

final udhaarProvider = StateNotifierProvider<UdhaarNotifier, UdhaarState>((ref) {
  return UdhaarNotifier();
});
