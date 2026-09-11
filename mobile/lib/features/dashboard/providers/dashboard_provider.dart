import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/outbox_queue_service.dart';

class DashboardState {
  final double todaySalesRevenue;
  final double todayNetProfit;
  final int pendingOrdersCount;
  final double totalUdhaarOutstanding;
  final int lowStockItemsCount;
  final String weatherSummary;
  final int pendingSyncCount;
  final bool isLoading;

  const DashboardState({
    this.todaySalesRevenue = 1480.0,
    this.todayNetProfit = 540.0,
    this.pendingOrdersCount = 2,
    this.totalUdhaarOutstanding = 950.0,
    this.lowStockItemsCount = 1,
    this.weatherSummary = 'Sunny 31.5°C',
    this.pendingSyncCount = 0,
    this.isLoading = false,
  });

  DashboardState copyWith({
    double? todaySalesRevenue,
    double? todayNetProfit,
    int? pendingOrdersCount,
    double? totalUdhaarOutstanding,
    int? lowStockItemsCount,
    String? weatherSummary,
    int? pendingSyncCount,
    bool? isLoading,
  }) {
    return DashboardState(
      todaySalesRevenue: todaySalesRevenue ?? this.todaySalesRevenue,
      todayNetProfit: todayNetProfit ?? this.todayNetProfit,
      pendingOrdersCount: pendingOrdersCount ?? this.pendingOrdersCount,
      totalUdhaarOutstanding: totalUdhaarOutstanding ?? this.totalUdhaarOutstanding,
      lowStockItemsCount: lowStockItemsCount ?? this.lowStockItemsCount,
      weatherSummary: weatherSummary ?? this.weatherSummary,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  DashboardNotifier() : super(const DashboardState()) {
    loadDashboard();
  }

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true);
    final res = await ApiClient.getDashboardSummary();
    final pendingCount = await OutboxQueueService.getPendingCount();

    if (res['data'] != null) {
      final d = res['data'];
      state = state.copyWith(
        isLoading: false,
        todaySalesRevenue: (d['today_sales_revenue'] as num?)?.toDouble() ?? 1480.0,
        todayNetProfit: (d['today_net_profit'] as num?)?.toDouble() ?? 540.0,
        pendingOrdersCount: (d['pending_orders_count'] as num?)?.toInt() ?? 2,
        totalUdhaarOutstanding: (d['total_udhaar_outstanding'] as num?)?.toDouble() ?? 950.0,
        lowStockItemsCount: (d['low_stock_items_count'] as num?)?.toInt() ?? 1,
        weatherSummary: d['weather_summary'] ?? 'Sunny 31.5°C',
        pendingSyncCount: pendingCount,
      );
    } else {
      state = state.copyWith(isLoading: false, pendingSyncCount: pendingCount);
    }
  }

  Future<bool> syncPending() async {
    final ok = await ApiClient.syncPendingMutations();
    await loadDashboard();
    return ok;
  }
}

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier();
});
