import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/customer_provider.dart';

class LoyaltyModal extends ConsumerWidget {
  const LoyaltyModal({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tr = ref.read(localeProvider.notifier);
    final custState = ref.watch(customerProvider);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 5,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
          ),
          const SizedBox(height: 16),

          // Badge
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.mandiGoldLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.stars, color: AppColors.mandiGold, size: 48),
          ),
          const SizedBox(height: 14),

          Text(
            tr.tr('loyalty_points'),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textMain),
          ),
          const SizedBox(height: 6),
          Text(
            tr.tr('points_balance', params: {'points': custState.loyaltyPoints.toString()}),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.extrabold, color: AppColors.mandiGold),
          ),
          const SizedBox(height: 10),
          Text(
            tr.tr('points_desc'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
          const SizedBox(height: 20),

          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.mandiGold,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: () => Navigator.pop(context),
            child: Text(tr.tr('close'), style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
