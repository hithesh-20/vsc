import 'package:flutter_riverpod/flutter_riverpod.dart';

class WeatherState {
  final double temperature;
  final int humidity;
  final String condition;
  final String alertType; // 'HEATWAVE', 'MONSOON', 'OPTIMAL'
  final List<String> preservationTipsKn;
  final List<String> preservationTipsEn;

  const WeatherState({
    this.temperature = 31.5,
    this.humidity = 78,
    this.condition = 'Partly Cloudy & Humid',
    this.alertType = 'HEATWAVE',
    this.preservationTipsKn = const [
      'ಹಸಿ ಗೋಣಿಚೀಲದಿಂದ ಸೊಪ್ಪು ಮತ್ತು ತರಕಾರಿಗಳನ್ನು ಮುಚ್ಚಿ ತೇವಾಂಶ ಕಾಪಾಡಿ.',
      'ಮಧ್ಯಾಹ್ನದ ನೇರ ಸೂರ್ಯನ ಶಾಖದಿಂದ ರಕ್ಷಿಸಲು ನೆರಳಿನ ಛತ್ರಿ ಬಳಸಿ.',
      'ಟೊಮೇಟೊ ಮತ್ತು ಕೊತ್ತಂಬರಿಗೆ ಪ್ರತಿ ಗಂಟೆಗೆ ನೀರು ಚಿಮುಕಿಸಿ.',
      'ಬೇಗ ಹಾಳಾಗುವ ಹಣ್ಣುಗಳನ್ನು ಗಾಳಿ ಬೆಳಕು ಆಡುವಂತೆ ಇರಿಸಿ.',
    ],
    this.preservationTipsEn = const [
      'Drape moist gunny bags over greens and perishables to prevent dehydration.',
      'Deploy shaded umbrella canopy to shield delicate produce from midday UV.',
      'Sprinkle light water mist on tomatoes and leafy greens every 45 minutes.',
      'Ensure well-ventilated arrangement for quick-ripening bananas and fruits.',
    ],
  });
}

class WeatherNotifier extends StateNotifier<WeatherState> {
  WeatherNotifier() : super(const WeatherState());
}

final weatherProvider = StateNotifierProvider<WeatherNotifier, WeatherState>((ref) {
  return WeatherNotifier();
});
