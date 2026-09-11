import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/customer_provider.dart';
import '../../orders/providers/orders_provider.dart';

class CustomerCartScreen extends ConsumerStatefulWidget {
  const CustomerCartScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<CustomerCartScreen> createState() => _CustomerCartScreenState();
}

class _CustomerCartScreenState extends ConsumerState<CustomerCartScreen> {
  final _addressController = TextEditingController(text: "House #42, 2nd Main, Vidyanagar");
  String _paymentMode = "UPI";

  void _placeOrder() async {
    final tr = ref.read(localeProvider.notifier);
    final custState = ref.read(customerProvider);
    final custNotifier = ref.read(customerProvider.notifier);
    final ordNotifier = ref.read(ordersProvider.notifier);

    if (custState.cart.isEmpty) return;

    final items = custState.cart.values
        .map((item) => {
              'name': item.nameEn,
              'qty': item.quantity,
              'unit': item.unit,
              'price': item.price,
            })
        .toList();

    await ordNotifier.addCustomerOrder(
      customerName: "Priya Sharma",
      phone: "+919845011223",
      address: _addressController.text.trim(),
      items: items,
      totalAmount: custState.cartTotal,
      paymentMode: _paymentMode,
    );

    custNotifier.clearCart();

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tr.tr('sale_recorded')),
          backgroundColor: AppColors.vendorGreen,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final custState = ref.watch(customerProvider);
    final custNotifier = ref.read(customerProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('customer_cart'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: custState.cart.isEmpty
          ? Center(
              child: Text(
                tr.tr('empty_cart'),
                style: const TextStyle(fontSize: 16, color: AppColors.textMuted),
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      // Items List
                      ...custState.cart.values.map((item) {
                        final name = lang == 'kn' ? item.nameKn : item.nameEn;
                        final unitKey = 'unit_${item.unit}';
                        final unitDisplay = tr.tr(unitKey);

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  Text(
                                    "₹${item.price.toStringAsFixed(0)} / $unitDisplay",
                                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline, color: AppColors.primaryOrange),
                                    onPressed: () => custNotifier.decrementCart(item.productId),
                                  ),
                                  Text(
                                    "${item.quantity.toStringAsFixed(0)} $unitDisplay",
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline, color: AppColors.primaryOrange),
                                    onPressed: () => custNotifier.addToCart({
                                      'id': item.productId,
                                      'name_en': item.nameEn,
                                      'name_kn': item.nameKn,
                                      'unit': item.unit,
                                      'selling_price': item.price,
                                    }, 1.0),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    "₹${item.total.toStringAsFixed(0)}",
                                    style: const TextStyle(fontWeight: FontWeight.extrabold, fontSize: 16),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }).toList(),

                      const SizedBox(height: 12),
                      // Delivery Address
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Delivery Address",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _addressController,
                              decoration: InputDecoration(
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                filled: true,
                                fillColor: AppColors.bgCanvas,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Bottom Checkout Bar
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, -4))
                    ],
                  ),
                  child: SafeArea(
                    child: Row(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              tr.tr('total_amount'),
                              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                            ),
                            Text(
                              "₹${custState.cartTotal.toStringAsFixed(0)}",
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.extrabold, color: AppColors.textMain),
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryOrange,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            onPressed: _placeOrder,
                            child: Text(
                              "${tr.tr('checkout')} (₹${custState.cartTotal.toStringAsFixed(0)})",
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
