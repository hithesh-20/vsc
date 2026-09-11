import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/orders_provider.dart';

class VendorOrdersScreen extends ConsumerWidget {
  const VendorOrdersScreen({Key? key}) : super(key: key);

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDING':
        return AppColors.alertRed;
      case 'CONFIRMED':
        return Colors.blue.shade700;
      case 'PREPARING':
        return Colors.amber.shade800;
      case 'OUT_FOR_DELIVERY':
        return AppColors.voicePurple;
      case 'DELIVERED':
        return AppColors.vendorGreen;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tr = ref.read(localeProvider.notifier);
    final ordState = ref.watch(ordersProvider);
    final ordNotifier = ref.read(ordersProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('orders_title'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: ordState.isLoading
          ? Center(child: Text(tr.tr('loading')))
          : ordState.orders.isEmpty
              ? Center(
                  child: Text(
                    tr.tr('no_orders'),
                    style: const TextStyle(fontSize: 16, color: AppColors.textMuted),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: ordState.orders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final order = ordState.orders[index];
                    final orderId = order['id'] ?? '';
                    final customerName = order['customer_name'] ?? 'Customer';
                    final phone = order['phone'] ?? '';
                    final address = order['delivery_address'] ?? '';
                    final total = (order['total_amount'] as num?)?.toDouble() ?? 0.0;
                    final status = order['status'] ?? 'PENDING';
                    final statusKey = 'status_${status.toLowerCase()}';
                    final statusLabel = tr.tr(statusKey);
                    final statusColor = _getStatusColor(status);
                    final isDelivered = status == 'DELIVERED';
                    final items = order['items'] as List? ?? [];

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade200),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2))
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                orderId,
                                style: const TextStyle(fontWeight: FontWeight.extrabold, fontSize: 15, color: AppColors.primaryOrange),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  statusLabel,
                                  style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            customerName,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
                          ),
                          Text(
                            "$phone • $address",
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 10),
                          const Divider(height: 1),
                          const SizedBox(height: 8),

                          // Items List
                          ...items.map((item) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "• ${item['name']} x ${item['qty']} ${item['unit'] ?? ''}",
                                    style: const TextStyle(fontSize: 13, color: AppColors.textMain),
                                  ),
                                  Text(
                                    "₹${((item['price'] as num?)?.toDouble() ?? 0.0) * (item['qty'] ?? 1)}",
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            );
                          }),

                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "${tr.tr('total_amount')}: ₹${total.toStringAsFixed(0)}",
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.extrabold, color: AppColors.textMain),
                              ),
                              if (!isDelivered)
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: statusColor,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(12)),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  ),
                                  onPressed: () => ordNotifier.advanceOrderStatus(orderId),
                                  child: Text(
                                    tr.tr('advance_status'),
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
