import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/mandi_provider.dart';

class PmSvanidhiScoreCard extends ConsumerWidget {
  const PmSvanidhiScoreCard({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tr = ref.read(localeProvider.notifier);
    final mandiState = ref.watch(mandiProvider);
    final card = mandiState.creditScorecard;
    final score = card['credit_score'] ?? 780;
    final scoreRatio = (score / 1000.0).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                tr.tr('pmsvanidhi_title'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.vendorGreenLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text("7% Subsidy", style: TextStyle(color: AppColors.vendorGreen, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            tr.tr('pmsvanidhi_desc'),
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          const SizedBox(height: 18),

          // Circular Score Gauge
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 140,
                  height: 140,
                  child: CircularProgressIndicator(
                    value: scoreRatio,
                    strokeWidth: 12,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.vendorGreen),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      "$score",
                      style: const TextStyle(fontSize: 34, fontWeight: FontWeight.extrabold, color: AppColors.textMain),
                    ),
                    const Text(
                      "/ 1000",
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Loan Tier & Benefits Badge
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.vendorGreenLight.withOpacity(0.5),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.vendorGreen.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Text(
                  tr.tr('score_rating_excellent'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.vendorGreen),
                ),
                const SizedBox(height: 4),
                Text(
                  card['eligible_svanidhi_loan_tier'] ?? 'Tier 3 — ₹50,000',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.extrabold, color: Color(0xFF166534)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
