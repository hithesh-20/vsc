import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/mandi_provider.dart';
import 'pmsvanidhi_score_card.dart';

class MandiRatesScreen extends ConsumerWidget {
  const MandiRatesScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final mandiState = ref.watch(mandiProvider);
    final mandiNotifier = ref.read(mandiProvider.notifier);

    final markets = [
      {'key': 'Yeshwanthpur', 'label': tr.tr('market_yeshwanthpur')},
      {'key': 'KR Market', 'label': tr.tr('market_krmarket')},
      {'key': 'Mysore', 'label': tr.tr('market_mysore')},
      {'key': 'Hubballi', 'label': tr.tr('market_hubballi')},
    ];

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('mandi_title'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
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
            // Market Dropdown Selector
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: mandiState.selectedMarket,
                  isExpanded: true,
                  icon: const Icon(Icons.arrow_drop_down, color: AppColors.primaryOrange),
                  items: markets.map((m) {
                    return DropdownMenuItem<String>(
                      value: m['key'],
                      child: Text(
                        m['label']!,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) mandiNotifier.selectMarket(val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),

            // AI Buyer Advisory Alert
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primaryOrangeLight.withOpacity(0.5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primaryOrange.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.tips_and_updates, color: AppColors.primaryOrange, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      lang == 'kn' ? mandiState.buyerAdvisoryKn : mandiState.buyerAdvisoryEn,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF9A3412)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Commodity Rates & Arbitrage Calculator Cards
            Text(
              tr.tr('mandi_subtitle'),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textMain),
            ),
            const SizedBox(height: 10),

            ...mandiState.commodities.map((item) {
              final name = lang == 'kn' ? (item['commodity_name_kn'] ?? item['commodity_name_en']) : item['commodity_name_en'];
              final modalPrice = (item['modal_price_per_kg'] as num?)?.toDouble() ?? 20.0;
              final retailPrice = (item['recommended_retail_price'] as num?)?.toDouble() ?? 35.0;
              final arbitrage = (retailPrice - modalPrice).clamp(0.0, 999.0);
              final trend = item['trend'] ?? 'STABLE';
              final isUp = trend == 'UP';
              final isDown = trend == 'DOWN';

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDown ? AppColors.vendorGreenLight : (isUp ? AppColors.alertRedLight : Colors.grey.shade100),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        isDown ? Icons.arrow_downward : (isUp ? Icons.arrow_upward : Icons.trending_flat),
                        color: isDown ? AppColors.vendorGreen : (isUp ? AppColors.alertRed : Colors.grey),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text(
                            "${tr.tr('wholesale_price')}: ₹${modalPrice.toStringAsFixed(0)}/kg",
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                          Text(
                            "${tr.tr('retail_price')}: ₹${retailPrice.toStringAsFixed(0)}/kg",
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primaryOrangeDark),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.vendorGreenLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            "+₹${arbitrage.toStringAsFixed(0)}",
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.extrabold, color: AppColors.vendorGreen),
                          ),
                          Text(
                            tr.tr('arbitrage_gain'),
                            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.vendorGreen),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),

            const SizedBox(height: 20),

            // PM SVANidhi Micro-Credit Scorecard
            const PmSvanidhiScoreCard(),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
