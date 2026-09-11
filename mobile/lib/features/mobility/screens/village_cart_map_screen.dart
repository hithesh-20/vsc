import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../../customer/providers/customer_provider.dart';
import '../../customer/screens/storefront_screen.dart';

class VillageCartMapScreen extends ConsumerStatefulWidget {
  const VillageCartMapScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<VillageCartMapScreen> createState() => _VillageCartMapScreenState();
}

class _VillageCartMapScreenState extends ConsumerState<VillageCartMapScreen> {
  final FlutterTts _tts = FlutterTts();

  void _playCartChime(String vendorName) async {
    final lang = ref.read(localeProvider);
    await _tts.setLanguage(lang == 'kn' ? "kn-IN" : "en-US");
    final announcement = lang == 'kn'
        ? "ಟಿಂಗ್ ಟಿಂಗ್! $vendorName ನಿಮ್ಮ ಬಡಾವಣೆಗೆ ತಲುಪಿದ್ದಾರೆ!"
        : "Ding Dong! $vendorName has arrived near your street!";
    await _tts.speak(announcement);
  }

  @override
  void dispose() {
    _tts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final custState = ref.watch(customerProvider);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('nearby_carts'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: Column(
        children: [
          // Live Map Visualizer Widget
          Container(
            height: 240,
            margin: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Stack(
              children: [
                // Stylized map roads & grid representation
                CustomPaint(
                  size: const Size(double.infinity, 240),
                  painter: _MapGridPainter(),
                ),

                // User Location Pin
                Positioned(
                  left: 140,
                  top: 110,
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade600,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: Colors.blue.withOpacity(0.4), blurRadius: 10, spreadRadius: 3)
                          ],
                        ),
                        child: const Icon(Icons.person_pin_circle, color: Colors.white, size: 24),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black87,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text("You", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),

                // Vendor 1 Marker (Ramesh)
                Positioned(
                  left: 60,
                  top: 50,
                  child: InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StorefrontScreen(vendor: custState.vendors[0]),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primaryOrange,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: AppColors.primaryOrange.withOpacity(0.5), blurRadius: 12, spreadRadius: 2)
                            ],
                          ),
                          child: const Icon(Icons.shopping_cart, color: Colors.white, size: 20),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primaryOrange,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text("Ramesh (3 min)", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),

                // Vendor 2 Marker (Manjunath)
                Positioned(
                  right: 60,
                  bottom: 40,
                  child: InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StorefrontScreen(vendor: custState.vendors[1]),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade800,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.amber.withOpacity(0.5), blurRadius: 12, spreadRadius: 2)
                            ],
                          ),
                          child: const Icon(Icons.fastfood, color: Colors.white, size: 20),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade800,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text("Manjunath (6 min)", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Vendors Cards List
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              itemCount: custState.vendors.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final v = custState.vendors[index];
                final name = lang == 'kn' ? (v['name_kn'] ?? v['name_en']) : v['name_en'];
                final category = lang == 'kn' ? (v['category_kn'] ?? v['category']) : v['category'];

                return Container(
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
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.primaryOrangeLight,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.storefront, color: AppColors.primaryOrange, size: 28),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Text(category, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            const SizedBox(height: 4),
                            Text(
                              "${v['distance_meters']}m away • ${v['eta_minutes']} ${tr.tr('eta_mins')}",
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.vendorGreen),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.volume_up, color: AppColors.voicePurple),
                            tooltip: tr.tr('play_chime'),
                            onPressed: () => _playCartChime(name),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryOrange,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => StorefrontScreen(vendor: v)),
                            ),
                            child: Text(tr.tr('view_store'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.6)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke;

    // Draw stylized streets
    canvas.drawLine(Offset(0, size.height * 0.45), Offset(size.width, size.height * 0.45), paint);
    canvas.drawLine(Offset(size.width * 0.4, 0), Offset(size.width * 0.4, size.height), paint);
    canvas.drawLine(Offset(0, size.height * 0.8), Offset(size.width, size.height * 0.2), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
