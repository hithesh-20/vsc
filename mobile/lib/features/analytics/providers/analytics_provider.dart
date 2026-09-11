import 'package:flutter_riverpod/flutter_riverpod.dart';

class AnalyticsState {
  final double todayRevenue;
  final double todayNetProfit;
  final double cashRevenue;
  final double upiRevenue;
  final double udhaarIssued;
  final List<Map<String, dynamic>> topItems;

  const AnalyticsState({
    this.todayRevenue = 1480.0,
    this.todayNetProfit = 540.0,
    this.cashRevenue = 920.0,
    this.upiRevenue = 560.0,
    this.udhaarIssued = 200.0,
    this.topItems = const [
      {'name_en': 'Tomato (Hybrid)', 'name_kn': 'ಟೊಮೇಟೊ', 'qty': 18, 'unit': 'kg', 'rev': 540.0, 'profit': 216.0},
      {'name_en': 'Onion (Medium)', 'name_kn': 'ಈರುಳ್ಳಿ', 'qty': 12, 'unit': 'kg', 'rev': 480.0, 'profit': 180.0},
      {'name_en': 'Potato (Jyoti)', 'name_kn': 'ಆಲೂಗಡ್ಡೆ', 'qty': 8, 'unit': 'kg', 'rev': 280.0, 'profit': 120.0},
      {'name_en': 'Fresh Coriander', 'name_kn': 'ಕೊತ್ತಂಬರಿ', 'qty': 12, 'unit': 'bunch', 'rev': 180.0, 'profit': 84.0},
    ],
  });
}

class AnalyticsNotifier extends StateNotifier<AnalyticsState> {
  AnalyticsNotifier() : super(const AnalyticsState());
}

final analyticsProvider = StateNotifierProvider<AnalyticsNotifier, AnalyticsState>((ref) {
  return AnalyticsNotifier();
});
