import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/constants/colors.dart';
import 'core/localization/locale_provider.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/vendor_home_screen.dart';
import 'features/dashboard/screens/customer_home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: VendorSaathiApp(),
    ),
  );
}

class VendorSaathiApp extends ConsumerWidget {
  const VendorSaathiApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final langCode = ref.watch(localeProvider);
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'VendorSaathi',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryOrange,
          primary: AppColors.primaryOrange,
          surface: AppColors.bgCanvas,
        ),
        fontFamily: 'sans-serif',
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: AppColors.textMain,
          elevation: 0.5,
          centerTitle: false,
        ),
      ),
      locale: Locale(langCode),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('kn', 'IN'), // Kannada
        Locale('en', 'US'), // English
      ],
      home: !authState.isAuthenticated
          ? const LoginScreen()
          : authState.role == UserRole.vendor
              ? const VendorHomeScreen()
              : const CustomerHomeScreen(),
    );
  }
}
