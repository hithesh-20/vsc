import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/local_db_service.dart';

class PosState {
  final List<Map<String, dynamic>> products;
  final Map<String, double> cart; // productId -> qty
  final String paymentMode; // 'CASH', 'UPI', 'UDHAAR'
  final String customerName;
  final bool isSubmitting;
  final bool isOfflineSaved;
  final String? message;

  const PosState({
    this.products = const [],
    this.cart = const {},
    this.paymentMode = 'CASH',
    this.customerName = 'Walk-in Customer',
    this.isSubmitting = false,
    this.isOfflineSaved = false,
    this.message,
  });

  double get totalAmount {
    double total = 0.0;
    cart.forEach((pId, qty) {
      final p = products.firstWhere((item) => item['id'] == pId, orElse: () => {});
      if (p.isNotEmpty) {
        final price = (p['selling_price'] as num?)?.toDouble() ?? 0.0;
        total += price * qty;
      }
    });
    return total;
  }

  int get totalItemCount => cart.values.fold(0, (sum, val) => sum + val.toInt());

  PosState copyWith({
    List<Map<String, dynamic>>? products,
    Map<String, double>? cart,
    String? paymentMode,
    String? customerName,
    bool? isSubmitting,
    bool? isOfflineSaved,
    String? message,
  }) {
    return PosState(
      products: products ?? this.products,
      cart: cart ?? this.cart,
      paymentMode: paymentMode ?? this.paymentMode,
      customerName: customerName ?? this.customerName,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      isOfflineSaved: isOfflineSaved ?? this.isOfflineSaved,
      message: message,
    );
  }
}

class PosNotifier extends StateNotifier<PosState> {
  PosNotifier() : super(const PosState()) {
    loadProducts();
  }

  Future<void> loadProducts() async {
    final prods = await ApiClient.getProducts();
    state = state.copyWith(products: prods);
  }

  void addToCart(String productId, [double step = 1.0]) {
    final currentQty = state.cart[productId] ?? 0.0;
    final updatedCart = Map<String, double>.from(state.cart);
    updatedCart[productId] = currentQty + step;
    state = state.copyWith(cart: updatedCart);
  }

  void decrementFromCart(String productId, [double step = 1.0]) {
    if (!state.cart.containsKey(productId)) return;
    final currentQty = state.cart[productId]!;
    final updatedCart = Map<String, double>.from(state.cart);

    if (currentQty <= step) {
      updatedCart.remove(productId);
    } else {
      updatedCart[productId] = currentQty - step;
    }
    state = state.copyWith(cart: updatedCart);
  }

  void setPaymentMode(String mode) {
    state = state.copyWith(paymentMode: mode);
  }

  void setCustomerName(String name) {
    state = state.copyWith(customerName: name);
  }

  void clearCart() {
    state = state.copyWith(cart: {});
  }

  Future<bool> completeSale() async {
    if (state.cart.isEmpty) return false;
    state = state.copyWith(isSubmitting: true);

    final items = state.cart.entries.map((e) {
      final p = state.products.firstWhere((prod) => prod['id'] == e.key, orElse: () => {});
      return {
        'product_id': e.key,
        'product_name': p['name_en'] ?? 'Product',
        'quantity': e.value,
        'unit': p['unit'] ?? 'kg',
        'unit_price': (p['selling_price'] as num?)?.toDouble() ?? 0.0,
      };
    }).toList();

    final total = state.totalAmount;
    final result = await ApiClient.recordSale(
      customerName: state.customerName,
      items: items,
      paymentMode: state.paymentMode,
      totalAmount: total,
    );

    // Refresh products stock in state
    final updatedProducts = await LocalDbService.getProducts();

    state = state.copyWith(
      isSubmitting: false,
      cart: {},
      products: updatedProducts,
      isOfflineSaved: result['offline'] == true,
      message: result['offline'] == true ? 'OFFLINE_SAVED' : 'SUCCESS',
    );

    return true;
  }
}

final posProvider = StateNotifierProvider<PosNotifier, PosState>((ref) {
  return PosNotifier();
});
