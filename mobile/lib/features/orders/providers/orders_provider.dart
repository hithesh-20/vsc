import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/local_db_service.dart';

class OrdersState {
  final List<Map<String, dynamic>> orders;
  final bool isLoading;

  const OrdersState({
    this.orders = const [],
    this.isLoading = false,
  });

  int get pendingCount =>
      orders.where((o) => o['status'] == 'PENDING' || o['status'] == 'CONFIRMED').length;

  OrdersState copyWith({
    List<Map<String, dynamic>>? orders,
    bool? isLoading,
  }) {
    return OrdersState(
      orders: orders ?? this.orders,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class OrdersNotifier extends StateNotifier<OrdersState> {
  OrdersNotifier() : super(const OrdersState()) {
    loadOrders();
  }

  Future<void> loadOrders() async {
    state = state.copyWith(isLoading: true);
    final list = await LocalDbService.getOrders();
    state = state.copyWith(orders: list, isLoading: false);
  }

  Future<void> advanceOrderStatus(String orderId) async {
    final updated = List<Map<String, dynamic>>.from(state.orders);
    for (var o in updated) {
      if (o['id'] == orderId) {
        final current = o['status'] ?? 'PENDING';
        if (current == 'PENDING') {
          o['status'] = 'CONFIRMED';
        } else if (current == 'CONFIRMED') {
          o['status'] = 'PREPARING';
        } else if (current == 'PREPARING') {
          o['status'] = 'OUT_FOR_DELIVERY';
        } else if (current == 'OUT_FOR_DELIVERY') {
          o['status'] = 'DELIVERED';
        }
      }
    }
    await LocalDbService.saveOrders(updated);
    state = state.copyWith(orders: updated);
  }

  Future<void> addCustomerOrder({
    required String customerName,
    required String phone,
    required String address,
    required List<Map<String, dynamic>> items,
    required double totalAmount,
    required String paymentMode,
  }) async {
    final newOrder = {
      'id': 'ORD-${DateTime.now().millisecondsSinceEpoch % 10000}',
      'customer_name': customerName,
      'phone': phone,
      'delivery_address': address,
      'items': items,
      'total_amount': totalAmount,
      'payment_mode': paymentMode,
      'status': 'PENDING',
      'order_time': 'Just now',
    };

    final updated = List<Map<String, dynamic>>.from(state.orders)..insert(0, newOrder);
    await LocalDbService.saveOrders(updated);
    state = state.copyWith(orders: updated);
  }
}

final ordersProvider = StateNotifierProvider<OrdersNotifier, OrdersState>((ref) {
  return OrdersNotifier();
});
