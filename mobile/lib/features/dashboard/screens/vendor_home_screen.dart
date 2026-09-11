import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_screen.dart';
import '../providers/dashboard_provider.dart';
import '../../pos/screens/quick_pos_screen.dart';
import '../../inventory/screens/inventory_screen.dart';
import '../../udhaar/screens/udhaar_screen.dart';
import '../../orders/screens/vendor_orders_screen.dart';
import '../../mobility/screens/smart_mobility_screen.dart';
import '../../mandi/screens/mandi_rates_screen.dart';
import '../../weather/screens/weather_advisory_screen.dart';
import '../../megaphone/screens/street_megaphone_modal.dart';
import '../../analytics/screens/profit_analytics_screen.dart';
import '../../voice/screens/voice_assistant_modal.dart';
import 'customer_home_screen.dart';

class VendorHomeScreen extends ConsumerStatefulWidget {
  const VendorHomeScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<VendorHomeScreen> createState() => _VendorHomeScreenState();
}

class _VendorHomeScreenState extends ConsumerState<VendorHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dashboardProvider.notifier).loadDashboard();
    });
  }

  void _openVoiceModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => VoiceAssistantModal(
        onDataChanged: () => ref.read(dashboardProvider.notifier).loadDashboard(),
      ),
    );
  }

  void _openMegaphone() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const StreetMegaphoneModal(),
    );
  }

  void _triggerSync() async {
    final tr = ref.read(localeProvider.notifier);
    final ok = await ref.read(dashboardProvider.notifier).syncPending();
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tr.tr('sync_success_msg')),
          backgroundColor: AppColors.vendorGreen,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);
    final authState = ref.watch(authProvider);
    final dashState = ref.watch(dashboardProvider);

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
                color: AppColors.primaryOrange,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                lang == 'kn' ? "ವ" : "VS",
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tr.tr('app_name'),
                    style: const TextStyle(color: AppColors.textMain, fontWeight: FontWeight.extrabold, fontSize: 16),
                  ),
                  Text(
                    authState.businessName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Offline Sync Badge
          if (dashState.pendingSyncCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ActionChip(
                backgroundColor: AppColors.alertRedLight,
                label: Text(
                  "${dashState.pendingSyncCount} ${tr.tr('sync_pending')}",
                  style: const TextStyle(color: AppColors.alertRed, fontSize: 11, fontWeight: FontWeight.bold),
                ),
                avatar: const Icon(Icons.sync, size: 14, color: AppColors.alertRed),
                onPressed: _triggerSync,
              ),
            ),

          // Single-Language Toggle Button (Strict Clean i18n)
          TextButton.icon(
            onPressed: () => tr.toggleLocale(),
            icon: const Icon(Icons.language, color: AppColors.primaryOrange, size: 18),
            label: Text(
              lang == 'kn' ? 'English' : 'ಕನ್ನಡ',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryOrange),
            ),
          ),

          // Role Switcher to Customer Mode (Priya)
          IconButton(
            icon: const Icon(Icons.swap_horiz, color: AppColors.textMain),
            tooltip: tr.tr('switch_role'),
            onPressed: () {
              ref.read(authProvider.notifier).switchAccount('PRIYA');
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const CustomerHomeScreen()),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(dashboardProvider.notifier).loadDashboard(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. HERO VOICE PROMPT PROMINENT BUTTON
              GestureDetector(
                onTap: _openVoiceModal,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.voicePurple, Color(0xFF9333EA)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.voicePurple.withOpacity(0.35),
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
                        child: const Icon(Icons.mic, color: Colors.white, size: 30),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tr.tr('voice_banner_title'),
                              style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.extrabold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              tr.tr('voice_banner_sub'),
                              style: const TextStyle(color: Color(0xFFDDD6FE), fontSize: 13, fontStyle: FontStyle.italic),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 2. TODAY'S SALES & NET PROFIT SCORECARD
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade200),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8)],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr.tr('today_sales'),
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "₹${dashState.todaySalesRevenue.toStringAsFixed(0)}",
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.extrabold, color: AppColors.primaryOrange),
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
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8)],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr.tr('today_profit'),
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "₹${dashState.todayNetProfit.toStringAsFixed(0)}",
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.extrabold, color: AppColors.vendorGreen),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 3. WEATHER & DEMAND BANNER (Clickable)
              GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const WeatherAdvisoryScreen()),
                ),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.primaryOrangeLight.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primaryOrange.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.wb_sunny, color: AppColors.primaryOrange, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          "${tr.tr('weather_banner_prefix')} ${dashState.weatherSummary}",
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF9A3412)),
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.primaryOrange),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 4. LARGE-TOUCH VENDOR SERVICES GRID (8 Core Modules)
              Text(
                tr.tr('quick_services'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
              ),
              const SizedBox(height: 12),

              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.25,
                children: [
                  _buildModuleCard(
                    title: tr.tr('mod_pos_title'),
                    subtitle: tr.tr('mod_pos_sub'),
                    icon: Icons.point_of_sale,
                    color: AppColors.primaryOrange,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const QuickPosScreen())),
                  ),
                  _buildModuleCard(
                    title: tr.tr('mod_orders_title'),
                    subtitle: tr.tr('mod_orders_sub'),
                    icon: Icons.shopping_cart,
                    color: AppColors.infoBlue,
                    badge: dashState.pendingOrdersCount > 0 ? "${dashState.pendingOrdersCount}" : null,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VendorOrdersScreen())),
                  ),
                  _buildModuleCard(
                    title: tr.tr('mod_inventory_title'),
                    subtitle: tr.tr('mod_inventory_sub'),
                    icon: Icons.inventory_2,
                    color: AppColors.vendorGreen,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InventoryScreen())),
                  ),
                  _buildModuleCard(
                    title: tr.tr('mod_udhaar_title'),
                    subtitle: "₹${dashState.totalUdhaarOutstanding.toStringAsFixed(0)}",
                    icon: Icons.menu_book,
                    color: AppColors.udhaarIndigo,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const UdhaarScreen())),
                  ),
                  _buildModuleCard(
                    title: tr.tr('mod_mandi_title'),
                    subtitle: tr.tr('mod_mandi_sub'),
                    icon: Icons.account_balance,
                    color: AppColors.mandiGold,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MandiRatesScreen())),
                  ),
                  _buildModuleCard(
                    title: tr.tr('mod_mobility_title'),
                    subtitle: tr.tr('mod_mobility_sub'),
                    icon: Icons.location_on,
                    color: Colors.teal.shade700,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SmartMobilityScreen())),
                  ),
                  _buildModuleCard(
                    title: tr.tr('mod_megaphone_title'),
                    subtitle: tr.tr('mod_megaphone_sub'),
                    icon: Icons.campaign,
                    color: Colors.deepPurple,
                    onTap: _openMegaphone,
                  ),
                  _buildModuleCard(
                    title: tr.tr('mod_analytics_title'),
                    subtitle: tr.tr('mod_analytics_sub'),
                    icon: Icons.insights,
                    color: Colors.brown.shade700,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfitAnalyticsScreen())),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModuleCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    String? badge,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 6,
              offset: const Offset(0, 3),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.alertRed,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
