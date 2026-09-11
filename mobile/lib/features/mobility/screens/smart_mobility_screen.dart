import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/mobility_provider.dart';

class SmartMobilityScreen extends ConsumerWidget {
  const SmartMobilityScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final mobState = ref.watch(mobilityProvider);
    final mobNotifier = ref.read(mobilityProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('mobility_title'),
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
            // Current Location Pin Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6)],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.teal.shade50,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(Icons.my_location, color: Colors.teal.shade700, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr.tr('current_location'),
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          mobState.currentAddress,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Saturation Warning Alert (if nearby competitors)
            if (mobState.hasSaturationAlert) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.alertRedLight,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.alertRed.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning, color: AppColors.alertRed, size: 26),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        tr.tr('anti_clustering_alert'),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.alertRed),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Green Lane Recommendation Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.vendorGreenLight.withOpacity(0.6),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.vendorGreen.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.alt_route, color: AppColors.vendorGreen, size: 22),
                      const SizedBox(width: 8),
                      Text(
                        "Green Lane Recommendation",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.green.shade900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    lang == 'kn' ? mobState.recommendedGreenLaneKn : mobState.recommendedGreenLaneEn,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
                  ),
                  const SizedBox(height: 12),
                  if (mobState.hasSaturationAlert)
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.vendorGreen,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 44),
                        shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.navigation, size: 18),
                      label: Text(
                        tr.tr('navigate_lane'),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      onPressed: () {
                        mobNotifier.navigateToGreenLane();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text("✓ Navigating to 4th Cross, Vidyanagar"),
                            backgroundColor: AppColors.vendorGreen,
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Nearby Competitor Push-Carts
            Text(
              tr.tr('nearby_vendors_count'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
            ),
            const SizedBox(height: 10),

            if (mobState.nearbyCompetitors.isEmpty)
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: AppColors.vendorGreen),
                    SizedBox(width: 12),
                    Text(
                      "No direct competitors within 200m. Maximum profit zone!",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.vendorGreen),
                    ),
                  ],
                ),
              )
            else
              ...mobState.nearbyCompetitors.map((c) {
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
                          color: AppColors.alertRedLight,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.shopping_bag, color: AppColors.alertRed, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            Text(c.category, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.alertRedLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          "${c.distanceMeters.toStringAsFixed(0)}m away",
                          style: const TextStyle(color: AppColors.alertRed, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
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
