import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/inventory_provider.dart';
import 'add_product_modal.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  final _searchController = TextEditingController();

  void _openAddModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddProductModal(),
    );
  }

  void _showRestockDialog(Map<String, dynamic> product) {
    final lang = ref.read(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final name = lang == 'kn' ? (product['name_kn'] ?? product['name_en']) : product['name_en'];
    final unitKey = 'unit_${product['unit'] ?? 'kg'}';
    final unitDisplay = tr.tr(unitKey);
    final qtyController = TextEditingController(text: "10");

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(20)),
        title: Text("${tr.tr('restock')}: $name"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: qtyController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: "${tr.tr('current_stock')} ($unitDisplay)",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(tr.tr('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.vendorGreen,
              foregroundColor: Colors.white,
              shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              final addQty = double.tryParse(qtyController.text.trim()) ?? 0.0;
              if (addQty > 0) {
                ref.read(inventoryProvider.notifier).restockProduct(product['id'], addQty);
              }
              Navigator.pop(ctx);
            },
            child: Text(tr.tr('confirm')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final invState = ref.watch(inventoryProvider);
    final invNotifier = ref.read(inventoryProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('inventory_title'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: AppColors.primaryOrange, size: 28),
            onPressed: _openAddModal,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Bar
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              onChanged: (q) => invNotifier.setSearchQuery(q),
              decoration: InputDecoration(
                hintText: tr.tr('search_items'),
                prefixIcon: const Icon(Icons.search, color: AppColors.primaryOrange),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          invNotifier.setSearchQuery('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
              ),
            ),
          ),

          // Inventory Products List
          Expanded(
            child: invState.isLoading
                ? Center(child: Text(tr.tr('loading')))
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    itemCount: invState.filteredProducts.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final p = invState.filteredProducts[index];
                      final name = lang == 'kn' ? (p['name_kn'] ?? p['name_en']) : p['name_en'];
                      final cost = (p['cost_price'] as num?)?.toDouble() ?? 0.0;
                      final sell = (p['selling_price'] as num?)?.toDouble() ?? 0.0;
                      final stock = (p['current_stock'] as num?)?.toDouble() ?? 0.0;
                      final threshold = (p['low_stock_threshold'] as num?)?.toDouble() ?? 5.0;
                      final isLow = stock <= threshold;
                      final unitKey = 'unit_${p['unit'] ?? 'kg'}';
                      final unitDisplay = tr.tr(unitKey);
                      final shelfLife = p['perishable_shelf_life_days'] ?? 3;
                      final emoji = p['image_emoji'] ?? '🧺';
                      final profit = sell - cost;
                      final marginPct = cost > 0 ? ((profit / cost) * 100).toStringAsFixed(0) : "0";

                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isLow ? AppColors.alertRed.withOpacity(0.4) : Colors.grey.shade200,
                            width: isLow ? 1.5 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2))
                          ],
                        ),
                        child: Row(
                          children: [
                            // Emoji Avatar
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: isLow ? AppColors.alertRedLight : AppColors.primaryOrangeLight.withOpacity(0.6),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              alignment: Alignment.center,
                              child: Text(emoji, style: const TextStyle(fontSize: 24)),
                            ),
                            const SizedBox(width: 12),

                            // Details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          name,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textMain,
                                          ),
                                        ),
                                      ),
                                      if (isLow)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.alertRed,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            tr.tr('low_stock'),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text(
                                        "${tr.tr('selling_price')}: ₹${sell.toStringAsFixed(0)}/$unitDisplay",
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primaryOrangeDark),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        "• ${tr.tr('profit_margin')}: +$marginPct%",
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.vendorGreen),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text(
                                        "${tr.tr('current_stock')}: ${stock.toStringAsFixed(0)} $unitDisplay",
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: isLow ? AppColors.alertRed : AppColors.textMuted,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        "• ${shelfLife}d ${tr.tr('perishable_shelf_life')}",
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            // Restock Action Button
                            IconButton(
                              icon: const Icon(Icons.add_shopping_cart, color: AppColors.vendorGreen),
                              onPressed: () => _showRestockDialog(p),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
