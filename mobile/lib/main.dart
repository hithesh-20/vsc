import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/constants/colors.dart';
import 'features/dashboard/screens/vendor_home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VendorSaathiApp());
}

class VendorSaathiApp extends StatelessWidget {
  const VendorSaathiApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
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
      ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('kn', 'IN'), // Kannada
        Locale('en', 'US'), // English
      ],
      home: const VendorHomeScreen(),
    );
  }
}
