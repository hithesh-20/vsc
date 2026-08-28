import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sync/offline_sync_manager.dart';
import '../../voice/screens/kannada_voice_modal.dart';
import '../../pos/screens/quick_pos_screen.dart';
import '../../inventory/screens/inventory_screen.dart';
import '../../udhaar/screens/udhaar_screen.dart';
import '../../mobility/screens/smart_mobility_screen.dart';
import '../../analytics/screens/profit_analytics_screen.dart';
import '../../orders/screens/vendor_orders_screen.dart';

class VendorHomeScreen extends StatefulWidget {
  const VendorHomeScreen({Key? key}) : super(key: key);

  @override
  State<VendorHomeScreen> createState() => _VendorHomeScreenState();
}

class _VendorHomeScreenState extends State<VendorHomeScreen> {
  Map<String, dynamic> _summary = {};
  bool _loading = true;
  int _pendingSyncCount = 0;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  void _loadDashboardData() async {
    setState(() => _loading = true);
    final res = await ApiClient.getDashboardSummary();
    final pendingCount = await OfflineSyncManager.getPendingSyncCount();

    setState(() {
      _loading = false;
      _summary = res["data"] ?? {};
      _pendingSyncCount = pendingCount;
    });
  }

  void _openVoiceModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => KannadaVoiceModal(onDataChanged: _loadDashboardData),
    );
  }

  void _triggerSync() async {
    final success = await OfflineSyncManager.syncPendingMutations();
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("✓ ಎಲ್ಲಾ ಆಫ್‌ಲೈನ್ ಬಿಲ್‌ಗಳು ಸರ್ವರ್‌ಗೆ ಸಿಂಕ್ ಆಗಿವೆ (Synced Successfully)"),
          backgroundColor: AppColors.vendorGreen,
        ),
      );
      _loadDashboardData();
    }
  }

  @override
  Widget build(BuildContext context) {
    final todaySales = _summary["today_sales_revenue"] ?? 0.0;
    final todayProfit = _summary["today_net_profit"] ?? 0.0;
    final pendingOrders = _summary["pending_orders_count"] ?? 0;
    final totalUdhaar = _summary["total_udhaar_outstanding"] ?? 0.0;
    final weatherSummary = _summary["weather_summary"] ?? "Clear (29°C)";

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
              child: const Text("ವ", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("VendorSaathi", style: TextStyle(color: AppColors.textMain, fontWeight: FontWeight.extrabold, fontSize: 16)),
                Text("ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು (Ramesh Veg)", style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ],
        ),
        actions: [
          // Offline Sync Badge
          if (_pendingSyncCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                backgroundColor: AppColors.alertRedLight,
                label: Text("$_pendingSyncCount Sync", style: const TextStyle(color: AppColors.alertRed, fontSize: 11, fontWeight: FontWeight.bold)),
                avatar: const Icon(Icons.sync, size: 14, color: AppColors.alertRed),
                onPressed: _triggerSync,
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _loadDashboardData(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              
              // 1. HERO KANNADA VOICE PROMPT BUTTON (High Prominence)
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
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "🎙️ ಮಾತನಾಡಿ (Talk to Assistant)",
                              style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.extrabold),
                            ),
                            SizedBox(height: 2),
                            Text(
                              "\"ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಯಿತು?\"",
                              style: TextStyle(color: Color(0xFFDDD6FE), fontSize: 13, fontStyle: FontStyle.italic),
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

              // 2. TODAY'S SALES & PROFIT SCORECARD
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
                          const Text("ಇಂದಿನ ಮಾರಾಟ (Sales)", style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text("₹${todaySales.toStringAsFixed(0)}", style: const TextStyle(fontSize: 22, fontWeight: FontWeight.extrabold, color: AppColors.primaryOrange)),
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
                          const Text("ನಿವ್ವಳ ಲಾಭ (Net Profit)", style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text("₹${todayProfit.toStringAsFixed(0)}", style: const TextStyle(fontSize: 22, fontWeight: FontWeight.extrabold, color: AppColors.vendorGreen)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 3. WEATHER & SMART AI BANNER
              Container(
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
                        "ಹವಾಮಾನ: $weatherSummary • ಮಾರುಕಟ್ಟೆ ಬೇಡಿಕೆ ಉತ್ತಮವಾಗಿದೆ.",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF9A3412)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 4. LARGE-TOUCH VENDOR ACTION MODULES GRID (6 Key Buttons)
              const Text(
                "ವ್ಯಾಪಾರ ಸೇವೆಗಳು (Quick Services)",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textMain),
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
                    titleKn: "ತ್ವರಿತ ಮಾರಾಟ",
                    titleEn: "POS Billing",
                    icon: Icons.point_of_sale,
                    color: AppColors.primaryOrange,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const QuickPosScreen())),
                  ),
                  _buildModuleCard(
                    titleKn: "ಆರ್ಡರ್‌ಗಳು ($pendingOrders)",
                    titleEn: "Customer Orders",
                    icon: Icons.shopping_cart,
                    color: Colors.blue.shade700,
                    badge: pendingOrders > 0 ? "$pendingOrders" : null,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VendorOrdersScreen())),
                  ),
                  _buildModuleCard(
                    titleKn: "ದಾಸ್ತಾನು ಸರಕು",
                    titleEn: "Inventory Stock",
                    icon: Icons.inventory_2,
                    color: AppColors.vendorGreen,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InventoryScreen())),
                  ),
                  _buildModuleCard(
                    titleKn: "ಉದಾರ್ ಖಾತೆ",
                    titleEn: "Udhaar (₹${totalUdhaar.toStringAsFixed(0)})",
                    icon: Icons.menu_book,
                    color: Colors.indigo.shade600,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const UdhaarScreen())),
                  ),
                  _buildModuleCard(
                    titleKn: "ಸ್ಮಾರ್ಟ್ ಸ್ಥಳ",
                    titleEn: "Smart Mobility Map",
                    icon: Icons.location_on,
                    color: Colors.teal.shade700,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SmartMobilityScreen())),
                  ),
                  _buildModuleCard(
                    titleKn: "ಲಾಭ ವಿಶ್ಲೇಷಣೆ",
                    titleEn: "Profit Analytics",
                    icon: Icons.insights,
                    color: Colors.amber.shade800,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfitAnalyticsScreen())),
                  ),
                ],
              ),
              const SizedBox(height: 20),

            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModuleCard({
    required String titleKn,
    required String titleEn,
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
                    child: Text(badge, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titleKn, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain)),
                Text(titleEn, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
