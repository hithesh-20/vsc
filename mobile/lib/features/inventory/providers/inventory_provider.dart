import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/local_db_service.dart';
import '../../../core/storage/outbox_queue_service.dart';

class InventoryState {
  final List<Map<String, dynamic>> products;
  final bool isLoading;
  final String searchQuery;
  final String selectedCategory;

  const InventoryState({
    this.products = const [],
    this.isLoading = false,
    this.searchQuery = '',
    this.selectedCategory = 'ALL',
  });

  List<Map<String, dynamic>> get filteredProducts {
    return products.where((p) {
      final nameKn = (p['name_kn'] ?? '').toString().toLowerCase();
      final nameEn = (p['name_en'] ?? '').toString().toLowerCase();
      final q = searchQuery.toLowerCase();
      final matchesQuery = q.isEmpty || nameKn.contains(q) || nameEn.contains(q);

      final matchesCategory = selectedCategory == 'ALL' ||
          (p['category'] ?? '').toString().toUpperCase() == selectedCategory.toUpperCase();

      return matchesQuery && matchesCategory;
    }).toList();
  }

  InventoryState copyWith({
    List<Map<String, dynamic>>? products,
    bool? isLoading,
    String? searchQuery,
    String? selectedCategory,
  }) {
    return InventoryState(
      products: products ?? this.products,
      isLoading: isLoading ?? this.isLoading,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedCategory: selectedCategory ?? this.selectedCategory,
    );
  }
}

class InventoryNotifier extends StateNotifier<InventoryState> {
  InventoryNotifier() : super(const InventoryState()) {
    loadInventory();
  }

  Future<void> loadInventory() async {
    state = state.copyWith(isLoading: true);
    final prods = await ApiClient.getProducts();
    state = state.copyWith(products: prods, isLoading: false);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setCategory(String category) {
    state = state.copyWith(selectedCategory: category);
  }

  Future<void> restockProduct(String productId, double additionalQty) async {
    final updated = List<Map<String, dynamic>>.from(state.products);
    for (var p in updated) {
      if (p['id'] == productId) {
        final current = (p['current_stock'] as num?)?.toDouble() ?? 0.0;
        p['current_stock'] = current + additionalQty;
      }
    }
    await LocalDbService.saveProducts(updated);
    state = state.copyWith(products: updated);

    await OutboxQueueService.enqueue(
      mutationType: 'STOCK_UPDATE',
      payload: {'product_id': productId, 'additional_qty': additionalQty},
    );
  }

  Future<void> addProduct({
    required String nameEn,
    required String nameKn,
    required String category,
    required String unit,
    required double costPrice,
    required double sellingPrice,
    required double initialStock,
    required int shelfLifeDays,
  }) async {
    final newProduct = {
      'id': 'prod-${DateTime.now().millisecondsSinceEpoch}',
      'name_en': nameEn,
      'name_kn': nameKn,
      'category': category,
      'unit': unit,
      'cost_price': costPrice,
      'selling_price': sellingPrice,
      'current_stock': initialStock,
      'low_stock_threshold': 5.0,
      'perishable_shelf_life_days': shelfLifeDays,
      'image_emoji': '🧺',
    };

    final updated = List<Map<String, dynamic>>.from(state.products)..add(newProduct);
    await LocalDbService.saveProducts(updated);
    state = state.copyWith(products: updated);

    await OutboxQueueService.enqueue(
      mutationType: 'ADD_PRODUCT',
      payload: newProduct,
    );
  }
}

final inventoryProvider = StateNotifierProvider<InventoryNotifier, InventoryState>((ref) {
  return InventoryNotifier();
});
