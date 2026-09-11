import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/analytics_provider.dart';

class ProfitAnalyticsScreen extends ConsumerWidget {
  const ProfitAnalyticsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final aState = ref.watch(analyticsProvider);

    final marginPct = aState.todayRevenue > 0
        ? ((aState.todayNetProfit / aState.todayRevenue) * 100).toStringAsFixed(1)
        : "0";

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('analytics_title'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Profit & Revenue Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.vendorGreen, Color(0xFF15803D)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: AppColors.vendorGreen.withOpacity(0.35), blurRadius: 14, offset: const Offset(0, 6))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        tr.tr('today_profit'),
                        style: const TextStyle(color: Color(0xFFDCFCE7), fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          "+$marginPct% Margin",
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "₹${aState.todayNetProfit.toStringAsFixed(0)}",
                    style: const TextStyle(fontSize: 34, fontWeight: FontWeight.extrabold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: Colors.white24, height: 1),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "${tr.tr('today_sales')}: ₹${aState.todayRevenue.toStringAsFixed(0)}",
                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Payment Split (Cash vs UPI)
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.money, color: AppColors.primaryOrange, size: 20),
                            const SizedBox(width: 6),
                            Text(
                              tr.tr('cash_collected'),
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          "₹${aState.cashRevenue.toStringAsFixed(0)}",
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.extrabold, color: AppColors.textMain),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.qr_code_2, color: AppColors.infoBlue, size: 20),
                            const SizedBox(width: 6),
                            Text(
                              tr.tr('upi_collected'),
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          "₹${aState.upiRevenue.toStringAsFixed(0)}",
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.extrabold, color: AppColors.textMain),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Top Selling Items
            Text(
              tr.tr('top_selling_items'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
            ),
            const SizedBox(height: 10),

            ...aState.topItems.map((item) {
              final name = lang == 'kn' ? (item['name_kn'] ?? item['name_en']) : item['name_en'];
              final qty = item['qty'] ?? 0;
              final unitKey = 'unit_${item['unit'] ?? 'kg'}';
              final unitDisplay = tr.tr(unitKey);
              final rev = (item['rev'] as num?)?.toDouble() ?? 0.0;
              final profit = (item['profit'] as num?)?.toDouble() ?? 0.0;

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
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
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textMain),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "$qty $unitDisplay sold",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          "₹${rev.toStringAsFixed(0)}",
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.extrabold, color: AppColors.textMain),
                        ),
                        Text(
                          "+₹${profit.toStringAsFixed(0)} profit",
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.vendorGreen),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
}
