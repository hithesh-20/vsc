import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/colors.dart';
import '../../../core/network/api_client.dart';

class SmartMobilityScreen extends StatefulWidget {
  const SmartMobilityScreen({Key? key}) : super(key: key);

  @override
  State<SmartMobilityScreen> createState() => _SmartMobilityScreenState();
}

class _SmartMobilityScreenState extends State<SmartMobilityScreen> {
  List<dynamic> _recommendations = [];
  String? _clusterWarning;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRecommendations();
  }

  void _loadRecommendations() async {
    setState(() => _loading = true);
    try {
      final response = await http.get(
        Uri.parse("${ApiClient.fallbackLocalUrl}/mobility/recommendations"),
        headers: ApiClient.headers,
      );
      final data = jsonDecode(response.body)["data"];
      setState(() {
        _recommendations = data["recommendations"] ?? [];
        _clusterWarning = data["cluster_warning"];
        _loading = false;
      });
    } catch (_) {
      // Mock Fallback
      setState(() {
        _recommendations = [
          {
            "location_name": "Gandhi Circle Market",
            "location_name_kn": "ಗಾಂಧಿ ಸರ್ಕಲ್ ಮಾರುಕಟ್ಟೆ",
            "distance_km": 1.2,
            "score": 92.5,
            "demand_level": "High",
            "active_competitors_count": 0,
            "recommendation_reason_kn": "ಇಲ್ಲಿ ತರಕಾರಿಗಳಿಗೆ ಹೆಚ್ಚಿನ ಬೇಡಿಕೆ ಇದ್ದು ಯಾವುದೇ ಸ್ಪರ್ಧಾತ್ಮಕ ವ್ಯಾಪಾರಿಗಳಿಲ್ಲ."
          },
          {
            "location_name": "Central Bus Stand",
            "location_name_kn": "ಕೇಂದ್ರ ಬಸ್ ನಿಲ್ದಾಣ ರಸ್ತೆ",
            "distance_km": 2.8,
            "score": 84.0,
            "demand_level": "High",
            "active_competitors_count": 1,
            "recommendation_reason_kn": "ಗ್ರಾಹಕರ ಓಡಾಟ ಚೆನ್ನಾಗಿದೆ, ಆದರೆ 1 ಸ್ಪರ್ಧಿ ವ್ಯಾಪಾರಿ ಇದ್ದಾರೆ."
          },
        ];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text("ಸ್ಮಾರ್ಟ್ ಸ್ಥಳ ಮತ್ತು ಮಾರ್ಗ (Mobility)"),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Anti-Clustering Warning Banner
                  if (_clusterWarning != null)
                    Container(
                      margin: const EdgeInsets.bottom(16),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.alertRedLight,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.alertRed.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded, color: AppColors.alertRed, size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _clusterWarning!,
                              style: const TextStyle(color: AppColors.alertRed, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const Text(
                    "ಶಿಫಾರಸು ಮಾಡಿದ ವ್ಯಾಪಾರ ಸ್ಥಳಗಳು (Recommended Spots):",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textMain),
                  ),
                  const SizedBox(height: 12),

                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _recommendations.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final spot = _recommendations[index];
                      final score = (spot["score"] as num).toDouble();
                      final isTop = index == 0;

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isTop ? AppColors.vendorGreen : Colors.grey.shade200, width: isTop ? 2 : 1),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isTop ? AppColors.vendorGreenLight : Colors.grey.shade100,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        "ಸ್ಕೋರ್: ${score.toStringAsFixed(1)}/100",
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: isTop ? AppColors.vendorGreen : AppColors.textMain,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      "📍 ${spot['distance_km']} km",
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                                if (isTop)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.vendorGreen,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Text("ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆ", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              spot["location_name_kn"] ?? spot["location_name"],
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
                            ),
                            Text(
                              spot["location_name"],
                              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "💡 ${spot['recommendation_reason_kn']}",
                              style: const TextStyle(fontSize: 13, color: Color(0xFF15803D), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
    );
  }
}
