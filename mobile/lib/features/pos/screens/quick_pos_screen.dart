import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/pos_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';

class QuickPosScreen extends ConsumerStatefulWidget {
  const QuickPosScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<QuickPosScreen> createState() => _QuickPosScreenState();
}

class _QuickPosScreenState extends ConsumerState<QuickPosScreen> {
  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final posState = ref.watch(posProvider);
    final posNotifier = ref.read(posProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        foregroundColor: AppColors.textMain,
        title: Text(
          tr.tr('pos_screen_title'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          if (posState.cart.isNotEmpty)
            TextButton(
              onPressed: () => posNotifier.clearCart(),
              child: Text(
                tr.tr('clear_cart'),
                style: const TextStyle(color: AppColors.alertRed, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Products Grid (Extra Large Tap Targets)
          Expanded(
            child: posState.products.isEmpty
                ? Center(child: Text(tr.tr('loading')))
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.15,
                    ),
                    itemCount: posState.products.length,
                    itemBuilder: (context, index) {
                      final p = posState.products[index];
                      final pId = p['id']?.toString() ?? '';
                      final inCartQty = posState.cart[pId] ?? 0.0;
                      final name = lang == 'kn' ? (p['name_kn'] ?? p['name_en']) : p['name_en'];
                      final price = (p['selling_price'] as num?)?.toDouble() ?? 0.0;
                      final unitKey = 'unit_${p['unit'] ?? 'kg'}';
                      final unitDisplay = tr.tr(unitKey);
                      final emoji = p['image_emoji'] ?? '🥬';
                      final stock = (p['current_stock'] as num?)?.toDouble() ?? 0.0;
                      final isLowStock = stock <= ((p['low_stock_threshold'] as num?)?.toDouble() ?? 5.0);

                      return GestureDetector(
                        onTap: () => posNotifier.addToCart(pId, 1.0),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: inCartQty > 0 ? AppColors.primaryOrangeLight : Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: inCartQty > 0 ? AppColors.primaryOrange : Colors.grey.shade200,
                              width: inCartQty > 0 ? 2.5 : 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: inCartQty > 0
                                    ? AppColors.primaryOrange.withOpacity(0.15)
                                    : Colors.black.withOpacity(0.02),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              )
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    emoji,
                                    style: const TextStyle(fontSize: 26),
                                  ),
                                  if (inCartQty > 0)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryOrange,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        "${inCartQty.toStringAsFixed(inCartQty % 1 == 0 ? 0 : 1)} $unitDisplay",
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    )
                                  else if (isLowStock)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.alertRedLight,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        tr.tr('low_stock'),
                                        style: const TextStyle(
                                          color: AppColors.alertRed,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: AppColors.textMain,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    "₹${price.toStringAsFixed(0)} / $unitDisplay",
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primaryOrangeDark,
                                    ),
                                  ),
                                ],
                              ),
                              // +/- Buttons if in cart
                              if (inCartQty > 0)
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    InkWell(
                                      onTap: () => posNotifier.decrementFromCart(pId, 1.0),
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          shape: BoxShape.circle,
                                          border: Border.all(color: AppColors.primaryOrange),
                                        ),
                                        child: const Icon(Icons.remove, size: 16, color: AppColors.primaryOrange),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    InkWell(
                                      onTap: () => posNotifier.addToCart(pId, 1.0),
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: const BoxDecoration(
                                          color: AppColors.primaryOrange,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.add, size: 16, color: Colors.white),
                                      ),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Bottom Billing & Payment Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 14,
                  offset: const Offset(0, -4),
                )
              ],
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Payment Modes
                  Row(
                    children: [
                      _buildPayBtn(
                        mode: 'CASH',
                        label: tr.tr('pay_cash'),
                        icon: Icons.money,
                        selected: posState.paymentMode == 'CASH',
                        onTap: () => posNotifier.setPaymentMode('CASH'),
                      ),
                      const SizedBox(width: 8),
                      _buildPayBtn(
                        mode: 'UPI',
                        label: tr.tr('pay_upi'),
                        icon: Icons.qr_code_2,
                        selected: posState.paymentMode == 'UPI',
                        onTap: () => posNotifier.setPaymentMode('UPI'),
                      ),
                      const SizedBox(width: 8),
                      _buildPayBtn(
                        mode: 'UDHAAR',
                        label: tr.tr('pay_udhaar'),
                        icon: Icons.menu_book,
                        selected: posState.paymentMode == 'UDHAAR',
                        onTap: () => posNotifier.setPaymentMode('UDHAAR'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Total & Checkout Button
                  Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr.tr('total_amount'),
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                          ),
                          Text(
                            "₹${posState.totalAmount.toStringAsFixed(0)}",
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.extrabold,
                              color: AppColors.textMain,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: posState.cart.isEmpty ? Colors.grey.shade300 : AppColors.primaryOrange,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: posState.cart.isEmpty ? 0 : 4,
                          ),
                          onPressed: posState.cart.isEmpty || posState.isSubmitting
                              ? null
                              : () async {
                                  final ok = await posNotifier.completeSale();
                                  if (ok && mounted) {
                                    ref.read(dashboardProvider.notifier).loadDashboard();
                                    final msg = posState.isOfflineSaved
                                        ? tr.tr('sale_offline_saved')
                                        : tr.tr('sale_recorded');
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.bold)),
                                        backgroundColor: AppColors.vendorGreen,
                                        duration: const Duration(seconds: 2),
                                      ),
                                    );
                                  }
                                },
                          child: posState.isSubmitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : Text(
                                  "${tr.tr('collect_amount')} (₹${posState.totalAmount.toStringAsFixed(0)})",
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPayBtn({
    required String mode,
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryOrange : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.primaryOrangeDark : Colors.grey.shade300,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: selected ? Colors.white : AppColors.textMain),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: selected ? Colors.white : AppColors.textMain,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
