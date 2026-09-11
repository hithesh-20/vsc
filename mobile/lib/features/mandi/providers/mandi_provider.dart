import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

class MandiState {
  final String selectedMarket;
  final List<Map<String, dynamic>> commodities;
  final String buyerAdvisoryKn;
  final String buyerAdvisoryEn;
  final Map<String, dynamic> creditScorecard;
  final bool isLoading;

  const MandiState({
    this.selectedMarket = 'Yeshwanthpur',
    this.commodities = const [],
    this.buyerAdvisoryKn = '',
    this.buyerAdvisoryEn = '',
    this.creditScorecard = const {},
    this.isLoading = false,
  });

  MandiState copyWith({
    String? selectedMarket,
    List<Map<String, dynamic>>? commodities,
    String? buyerAdvisoryKn,
    String? buyerAdvisoryEn,
    Map<String, dynamic>? creditScorecard,
    bool? isLoading,
  }) {
    return MandiState(
      selectedMarket: selectedMarket ?? this.selectedMarket,
      commodities: commodities ?? this.commodities,
      buyerAdvisoryKn: buyerAdvisoryKn ?? this.buyerAdvisoryKn,
      buyerAdvisoryEn: buyerAdvisoryEn ?? this.buyerAdvisoryEn,
      creditScorecard: creditScorecard ?? this.creditScorecard,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class MandiNotifier extends StateNotifier<MandiState> {
  MandiNotifier() : super(const MandiState()) {
    loadMandiData('Yeshwanthpur');
  }

  Future<void> loadMandiData(String market) async {
    state = state.copyWith(isLoading: true, selectedMarket: market);
    final ratesRes = await ApiClient.getMandiRates(market);
    final scoreRes = await ApiClient.getCreditScorecard();

    final commList = (ratesRes['commodities'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e))
            .toList() ??
        [];

    state = state.copyWith(
      isLoading: false,
      selectedMarket: market,
      commodities: commList,
      buyerAdvisoryKn: ratesRes['buyer_advisory_kn'] ?? '',
      buyerAdvisoryEn: ratesRes['buyer_advisory_en'] ?? '',
      creditScorecard: scoreRes,
    );
  }

  void selectMarket(String market) {
    loadMandiData(market);
  }
}

final mandiProvider = StateNotifierProvider<MandiNotifier, MandiState>((ref) {
  return MandiNotifier();
});
