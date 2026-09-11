import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/local_db_service.dart';

class CustomerCartItem {
  final String productId;
  final String nameEn;
  final String nameKn;
  final String unit;
  final double price;
  final double quantity;

  CustomerCartItem({
    required this.productId,
    required this.nameEn,
    required this.nameKn,
    required this.unit,
    required this.price,
    required this.quantity,
  });

  double get total => price * quantity;
}

class CustomerState {
  final Map<String, CustomerCartItem> cart; // productId -> item
  final int loyaltyPoints;
  final bool isSosSent;
  final List<Map<String, dynamic>> vendors;

  const CustomerState({
    this.cart = const {},
    this.loyaltyPoints = 150,
    this.isSosSent = false,
    this.vendors = const [
      {
        "id": "vendor-1",
        "name_en": "Ramesh Push-Cart",
        "name_kn": "ರಮೇಶ್ ತಳ್ಳುಗಾಡಿ",
        "category": "Fresh Vegetables",
        "category_kn": "ತಾಜಾ ತರಕಾರಿಗಳು",
        "distance_meters": 180,
        "eta_minutes": 3,
        "rating": 4.8,
        "lat": 12.9716,
        "lng": 77.5946,
      },
      {
        "id": "vendor-2",
        "name_en": "Manjunath Chaat Van",
        "name_kn": "ಮಂಜುನಾಥ್ ತಿಂಡಿ ಗಾಡಿ",
        "category": "Hot Snacks & Chaat",
        "category_kn": "ಬಿಸಿ ತಿಂಡಿ & ಚಾಟ್",
        "distance_meters": 420,
        "eta_minutes": 6,
        "rating": 4.9,
        "lat": 12.9730,
        "lng": 77.5980,
      }
    ],
  });

  double get cartTotal => cart.values.fold(0.0, (sum, i) => sum + i.total);
  int get itemCount => cart.values.fold(0, (sum, i) => sum + i.quantity.toInt());

  CustomerState copyWith({
    Map<String, CustomerCartItem>? cart,
    int? loyaltyPoints,
    bool? isSosSent,
    List<Map<String, dynamic>>? vendors,
  }) {
    return CustomerState(
      cart: cart ?? this.cart,
      loyaltyPoints: loyaltyPoints ?? this.loyaltyPoints,
      isSosSent: isSosSent ?? this.isSosSent,
      vendors: vendors ?? this.vendors,
    );
  }
}

class CustomerNotifier extends StateNotifier<CustomerState> {
  CustomerNotifier() : super(const CustomerState()) {
    _init();
  }

  void _init() async {
    final pts = await LocalDbService.getLoyaltyPoints();
    state = state.copyWith(loyaltyPoints: pts);
  }

  void addToCart(Map<String, dynamic> product, [double qty = 1.0]) {
    final pId = product['id']?.toString() ?? '';
    final existing = state.cart[pId];
    final updated = Map<String, CustomerCartItem>.from(state.cart);

    if (existing != null) {
      updated[pId] = CustomerCartItem(
        productId: pId,
        nameEn: existing.nameEn,
        nameKn: existing.nameKn,
        unit: existing.unit,
        price: existing.price,
        quantity: existing.quantity + qty,
      );
    } else {
      updated[pId] = CustomerCartItem(
        productId: pId,
        nameEn: product['name_en'] ?? 'Product',
        nameKn: product['name_kn'] ?? 'ಸರಕು',
        unit: product['unit'] ?? 'kg',
        price: (product['selling_price'] as num?)?.toDouble() ?? 30.0,
        quantity: qty,
      );
    }
    state = state.copyWith(cart: updated);
  }

  void decrementCart(String productId) {
    if (!state.cart.containsKey(productId)) return;
    final item = state.cart[productId]!;
    final updated = Map<String, CustomerCartItem>.from(state.cart);

    if (item.quantity <= 1.0) {
      updated.remove(productId);
    } else {
      updated[productId] = CustomerCartItem(
        productId: productId,
        nameEn: item.nameEn,
        nameKn: item.nameKn,
        unit: item.unit,
        price: item.price,
        quantity: item.quantity - 1.0,
      );
    }
    state = state.copyWith(cart: updated);
  }

  void clearCart() {
    state = state.copyWith(cart: {});
  }

  Future<void> triggerEmergencySos() async {
    state = state.copyWith(isSosSent: true);
  }
}

final customerProvider = StateNotifierProvider<CustomerNotifier, CustomerState>((ref) {
  return CustomerNotifier();
});
