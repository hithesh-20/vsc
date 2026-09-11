import 'package:flutter_riverpod/flutter_riverpod.dart';

class CompetitorVendor {
  final String id;
  final String name;
  final String category;
  final double distanceMeters;
  final double lat;
  final double lng;

  CompetitorVendor({
    required this.id,
    required this.name,
    required this.category,
    required this.distanceMeters,
    required this.lat,
    required this.lng,
  });
}

class MobilityState {
  final double currentLat;
  final double currentLng;
  final String currentAddress;
  final List<CompetitorVendor> nearbyCompetitors;
  final String recommendedGreenLaneKn;
  final String recommendedGreenLaneEn;
  final bool hasSaturationAlert;

  const MobilityState({
    this.currentLat = 12.9716,
    this.currentLng = 77.5946,
    this.currentAddress = 'Gandhi Circle, 2nd Main, Bengaluru',
    this.nearbyCompetitors = const [],
    this.recommendedGreenLaneKn = 'ಶಿಫಾರಸು ಮಾಡಿದ ಹೊಸ ರಸ್ತೆ: ೪ನೇ ಕ್ರಾಸ್, ವಿದ್ಯಾನಗರ (ಹೆಚ್ಚಿನ ಬೇಡಿಕೆ, ೦ ಸ್ಪರ್ಧಿಗಳು)',
    this.recommendedGreenLaneEn = 'Recommended Green Lane: 4th Cross, Vidyanagar (High demand, 0 competitors)',
    this.hasSaturationAlert = true,
  });
}

class MobilityNotifier extends StateNotifier<MobilityState> {
  MobilityNotifier()
      : super(MobilityState(
          nearbyCompetitors: [
            CompetitorVendor(
              id: 'c-1',
              name: 'Raghu Veggie Cart (ರಾಘು)',
              category: 'Vegetables',
              distanceMeters: 85,
              lat: 12.9719,
              lng: 77.5950,
            ),
            CompetitorVendor(
              id: 'c-2',
              name: 'Basavaraj Tomato Stall (ಬಸವರಾಜ್)',
              category: 'Vegetables',
              distanceMeters: 140,
              lat: 12.9712,
              lng: 77.5942,
            ),
          ],
        ));

  void navigateToGreenLane() {
    state = MobilityState(
      currentLat: 12.9760,
      currentLng: 77.5990,
      currentAddress: '4th Cross, Vidyanagar, Bengaluru',
      nearbyCompetitors: [],
      recommendedGreenLaneKn: 'ಪ್ರಸ್ತುತ ನೀವು ಕಡಿಮೆ ಸ್ಪರ್ಧೆಯಿರುವ ಹಸಿರು ವಲಯದಲ್ಲಿದ್ದೀರಿ (Optimal Zone).',
      recommendedGreenLaneEn: 'You are now operating in the optimal low-competition Green Zone.',
      hasSaturationAlert: false,
    );
  }
}

final mobilityProvider = StateNotifierProvider<MobilityNotifier, MobilityState>((ref) {
  return MobilityNotifier();
});
