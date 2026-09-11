import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/customer_provider.dart';
import '../../inventory/providers/inventory_provider.dart';
import 'customer_cart_screen.dart';

class StorefrontScreen extends ConsumerWidget {
  final Map<String, dynamic> vendor;

  const StorefrontScreen({Key? key, required this.vendor}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final invState = ref.watch(inventoryProvider);
    final custState = ref.watch(customerProvider);
    final custNotifier = ref.read(customerProvider.notifier);

    final vendorName = lang == 'kn' ? (vendor['name_kn'] ?? vendor['name_en']) : vendor['name_en'];
    final category = lang == 'kn' ? (vendor['category_kn'] ?? vendor['category']) : vendor['category'];

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(vendorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_bag_outlined, color: AppColors.primaryOrange, size: 28),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CustomerCartScreen()),
                ),
              ),
              if (custState.itemCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.alertRed,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      "${custState.itemCount}",
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Vendor Info Header
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryOrangeLight,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.storefront, color: AppColors.primaryOrange, size: 30),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vendorName,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textMain),
                      ),
                      const SizedBox(height: 2),
                      Text(category, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          Text(" ${vendor['rating']} • ${vendor['eta_minutes']} ${tr.tr('eta_mins')}",
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Product Catalog Grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.15,
              ),
              itemCount: invState.products.length,
              itemBuilder: (context, index) {
                final p = invState.products[index];
                final pId = p['id']?.toString() ?? '';
                final name = lang == 'kn' ? (p['name_kn'] ?? p['name_en']) : p['name_en'];
                final price = (p['selling_price'] as num?)?.toDouble() ?? 0.0;
                final unitKey = 'unit_${p['unit'] ?? 'kg'}';
                final unitDisplay = tr.tr(unitKey);
                final emoji = p['image_emoji'] ?? '🥬';
                final inCart = custState.cart[pId];

                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6)],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(emoji, style: const TextStyle(fontSize: 24)),
                          Text(
                            "₹${price.toStringAsFixed(0)}/$unitDisplay",
                            style: const TextStyle(fontWeight: FontWeight.extrabold, fontSize: 13, color: AppColors.primaryOrange),
                          ),
                        ],
                      ),
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      if (inCart != null)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            InkWell(
                              onTap: () => custNotifier.decrementCart(pId),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryOrangeLight,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.remove, size: 16, color: AppColors.primaryOrange),
                              ),
                            ),
                            Text("${inCart.quantity.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold)),
                            InkWell(
                              onTap: () => custNotifier.addToCart(p, 1.0),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryOrange,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.add, size: 16, color: Colors.white),
                              ),
                            ),
                          ],
                        )
                      else
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryOrange,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 32),
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => custNotifier.addToCart(p, 1.0),
                          child: const Text("+ Add", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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
