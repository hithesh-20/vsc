import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/customer_provider.dart';

class EmergencySosModal extends ConsumerWidget {
  const EmergencySosModal({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tr = ref.read(localeProvider.notifier);
    final custNotifier = ref.read(customerProvider.notifier);

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

          // SOS Siren Badge
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.alertRedLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.emergency, color: AppColors.alertRed, size: 54),
          ),
          const SizedBox(height: 16),

          Text(
            tr.tr('emergency_sos'),
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.extrabold, color: AppColors.alertRed),
          ),
          const SizedBox(height: 8),
          Text(
            tr.tr('sos_sent_msg'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppColors.textMain, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 24),

          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.alertRed,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 50),
              shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(16)),
            ),
            icon: const Icon(Icons.warning, color: Colors.white),
            label: Text(
              tr.tr('confirm'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            onPressed: () {
              custNotifier.triggerEmergencySos();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(tr.tr('sos_sent_msg')),
                  backgroundColor: AppColors.alertRed,
                ),
              );
            },
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(tr.tr('cancel'), style: const TextStyle(color: AppColors.textMuted)),
          ),
        ],
      ),
    );
  }
}
