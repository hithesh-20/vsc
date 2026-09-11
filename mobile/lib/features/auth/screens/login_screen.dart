import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/auth_provider.dart';
import '../../dashboard/screens/vendor_home_screen.dart';
import '../../dashboard/screens/customer_home_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController(text: "9876543210");
  final _pinController = TextEditingController(text: "1234");
  bool _loading = false;

  void _doLogin() async {
    setState(() => _loading = true);
    final phone = _phoneController.text.trim();
    final pin = _pinController.text.trim();

    final success = await ref.read(authProvider.notifier).login(phone, pin);
    setState(() => _loading = false);

    if (success && mounted) {
      final auth = ref.read(authProvider);
      if (auth.role == UserRole.vendor) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const VendorHomeScreen()),
        );
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const CustomerHomeScreen()),
        );
      }
    }
  }

  void _loginQuickAccount(String accountType) {
    ref.read(authProvider.notifier).switchAccount(accountType);
    final auth = ref.read(authProvider);
    if (auth.role == UserRole.vendor) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const VendorHomeScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const CustomerHomeScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
    final tr = ref.read(localeProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: () => tr.toggleLocale(),
            icon: const Icon(Icons.language, color: AppColors.primaryOrange, size: 20),
            label: Text(
              lang == 'kn' ? 'English' : 'ಕನ್ನಡ',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryOrange),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Branding Logo & Title
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primaryOrange,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryOrange.withOpacity(0.35),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      )
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    lang == 'kn' ? "ವ" : "VS",
                    style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  tr.tr('app_name'),
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.extrabold, color: AppColors.textMain),
                ),
              ),
              const SizedBox(height: 4),
              Center(
                child: Text(
                  tr.tr('app_subtitle'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
              ),
              const SizedBox(height: 32),

              // Login Input Box
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4))
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr.tr('phone_number'),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textMain),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.phone_android, color: AppColors.primaryOrange),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                        filled: true,
                        fillColor: AppColors.bgCanvas,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      tr.tr('pin'),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textMain),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _pinController,
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.lock, color: AppColors.primaryOrange),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                        filled: true,
                        fillColor: AppColors.bgCanvas,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryOrange,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: _loading ? null : _doLogin,
                      child: Text(
                        _loading ? tr.tr('loading') : tr.tr('login_btn'),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Quick Demo Seed Accounts (for Ideathon / instant reviewer demo)
              Text(
                tr.tr('demo_accounts_title'),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),

              _buildDemoTile(
                icon: Icons.storefront,
                color: AppColors.primaryOrange,
                title: tr.tr('role_vendor_ramesh'),
                onTap: () => _loginQuickAccount('RAMESH'),
              ),
              const SizedBox(height: 8),

              _buildDemoTile(
                icon: Icons.fastfood,
                color: Colors.amber.shade800,
                title: tr.tr('role_vendor_manjunath'),
                onTap: () => _loginQuickAccount('MANJUNATH'),
              ),
              const SizedBox(height: 8),

              _buildDemoTile(
                icon: Icons.person_pin,
                color: AppColors.infoBlue,
                title: tr.tr('role_customer_priya'),
                onTap: () => _loginQuickAccount('PRIYA'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDemoTile({
    required IconData icon,
    required Color color,
    required String title,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textMain),
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
