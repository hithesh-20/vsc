import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/weather_provider.dart';

class WeatherAdvisoryScreen extends ConsumerWidget {
  const WeatherAdvisoryScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final weatherState = ref.watch(weatherProvider);
    final tips = lang == 'kn' ? weatherState.preservationTipsKn : weatherState.preservationTipsEn;

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('weather_title'),
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
            // Weather Overview Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primaryOrange, Color(0xFFFB923C)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: AppColors.primaryOrange.withOpacity(0.35), blurRadius: 12, offset: const Offset(0, 4))
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${weatherState.temperature.toStringAsFixed(1)}°C",
                        style: const TextStyle(fontSize: 36, fontWeight: FontWeight.extrabold, color: Colors.white),
                      ),
                      Text(
                        weatherState.condition,
                        style: const TextStyle(fontSize: 14, color: Color(0xFFFFEDD5), fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        "${tr.tr('humidity')}: ${weatherState.humidity}%",
                        style: const TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                  const Icon(Icons.wb_sunny, color: Colors.white, size: 54),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Severe Heat / Spoilage Warning Alert
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.alertRedLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.alertRed.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning, color: AppColors.alertRed, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr.tr('weather_alert'),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.alertRed),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          "High midday heat can cause up to 15% vegetable weight loss.",
                          style: TextStyle(fontSize: 11, color: Color(0xFF7F1D1D)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Preservation Tips List
            Text(
              tr.tr('preservation_tips'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
            ),
            const SizedBox(height: 10),

            ...tips.map((tip) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.vendorGreenLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.eco, color: AppColors.vendorGreen, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        tip,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMain),
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
