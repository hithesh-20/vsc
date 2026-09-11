import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_screen.dart';
import '../../customer/providers/customer_provider.dart';
import '../../customer/screens/loyalty_modal.dart';
import '../../customer/screens/emergency_sos_modal.dart';
import '../../customer/screens/storefront_screen.dart';
import '../../customer/screens/customer_cart_screen.dart';
import '../../mobility/screens/village_cart_map_screen.dart';
import '../../orders/screens/vendor_orders_screen.dart';
import 'vendor_home_screen.dart';

class CustomerHomeScreen extends ConsumerWidget {
  const CustomerHomeScreen({Key? key}) : super(key: key);

  void _openLoyalty(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => const LoyaltyModal(),
    );
  }

  void _openSos(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => const EmergencySosModal(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final authState = ref.watch(authProvider);
    final custState = ref.watch(customerProvider);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.infoBlue,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.person, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr.tr('customer_home_title'),
                  style: const TextStyle(color: AppColors.textMain, fontWeight: FontWeight.extrabold, fontSize: 16),
                ),
                Text(
                  authState.userName,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Language Toggle
          TextButton(
            onPressed: () => tr.toggleLocale(),
            child: Text(
              lang == 'kn' ? 'English' : 'ಕನ್ನಡ',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryOrange),
            ),
          ),
          // Role switch to Vendor
          IconButton(
            icon: const Icon(Icons.swap_horiz, color: AppColors.textMain),
            tooltip: tr.tr('switch_role'),
            onPressed: () {
              ref.read(authProvider.notifier).switchAccount('RAMESH');
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const VendorHomeScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. LIVE MAP BANNER HERO CARD
            GestureDetector(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const VillageCartMapScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.infoBlue, Color(0xFF0284C7)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.infoBlue.withOpacity(0.35),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    )
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.map, color: Colors.white, size: 30),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr.tr('nearby_carts'),
                            style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.extrabold),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            "2 carts active within 400m",
                            style: TextStyle(color: Color(0xFFBAE6FD), fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // 2. LOYALTY & SOS ROW
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _openLoyalty(context),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade200),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6)],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.mandiGoldLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.stars, color: AppColors.mandiGold, size: 24),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  tr.tr('loyalty_points'),
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                                ),
                                Text(
                                  "${custState.loyaltyPoints} Pts",
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.extrabold, color: AppColors.mandiGold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _openSos(context),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.alertRed.withOpacity(0.3)),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6)],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.alertRedLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.emergency, color: AppColors.alertRed, size: 24),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  tr.tr('emergency_sos'),
                                  style: const TextStyle(fontSize: 11, color: AppColors.alertRed, fontWeight: FontWeight.w700),
                                ),
                                const Text(
                                  "1-Tap Panic",
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.extrabold, color: AppColors.alertRed),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 3. NEARBY STORES LIST
            Text(
              tr.tr('nearby_carts'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
            ),
            const SizedBox(height: 10),

            ...custState.vendors.map((v) {
              final name = lang == 'kn' ? (v['name_kn'] ?? v['name_en']) : v['name_en'];
              final category = lang == 'kn' ? (v['category_kn'] ?? v['category']) : v['category'];

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
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
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryOrange,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => StorefrontScreen(vendor: v)),
                      ),
                      child: Text(tr.tr('view_store'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
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
