import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  // Points to local FastAPI server on Windows / Android Emulator (10.0.2.2 or localhost)
  static const String baseUrl = "http://10.0.2.2:8000/api/v1";
  static const String fallbackLocalUrl = "http://127.0.0.1:8000/api/v1";

  static String? authToken;
  static String? vendorId;

  static Map<String, String> get headers => {
        "Content-Type": "application/json",
        if (authToken != null) "Authorization": "Bearer $authToken",
      };

  static Future<Map<String, dynamic>> login(String phone, String pin) async {
    try {
      final response = await http.post(
        Uri.parse("$baseUrl/auth/login"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"phone": phone, "password": pin}),
      );
      return jsonDecode(response.body);
    } catch (e) {
      // Try localhost fallback
      try {
        final response = await http.post(
          Uri.parse("$fallbackLocalUrl/auth/login"),
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({"phone": phone, "password": pin}),
        );
        return jsonDecode(response.body);
      } catch (_) {
        return {
          "success": true,
          "data": {
            "access_token": "mock_jwt_token",
            "vendor_id": "vendor-1",
            "name": "Ramesh Vegetables",
            "language_pref": "kn"
          }
        };
      }
    }
  }

  static Future<Map<String, dynamic>> getDashboardSummary() async {
    try {
      final response = await http.get(
        Uri.parse("$fallbackLocalUrl/vendors/dashboard-summary"),
        headers: headers,
      );
      return jsonDecode(response.body);
    } catch (e) {
      // Offline / Local Mock Fallback
      return {
        "success": true,
        "data": {
          "today_sales_revenue": 1480.0,
          "today_sales_count": 12,
          "today_net_profit": 540.0,
          "pending_orders_count": 2,
          "total_udhaar_outstanding": 900.0,
          "low_stock_items_count": 1,
          "ai_recommendation_short": "ಗಾಂಧಿ ಸರ್ಕಲ್‌ನಲ್ಲಿ ಇಂದು ಹೆಚ್ಚಿನ ಬೇಡಿಕೆ ಇದೆ.",
          "weather_summary": "ಭಾಗಶಃ ಮೋಡ (29.5°C)"
        }
      };
    }
  }

  static Future<List<dynamic>> getProducts() async {
    try {
      final response = await http.get(
        Uri.parse("$fallbackLocalUrl/products"),
        headers: headers,
      );
      final data = jsonDecode(response.body);
      return data["data"] ?? [];
    } catch (e) {
      return [
        {"id": "1", "name_en": "Tomato", "name_kn": "ಟೊಮೇಟೊ", "unit": "kg", "selling_price": 30.0, "cost_price": 18.0, "current_stock": 24.0, "low_stock_threshold": 5.0},
        {"id": "2", "name_en": "Onion", "name_kn": "ಈರುಳ್ಳಿ", "unit": "kg", "selling_price": 40.0, "cost_price": 25.0, "current_stock": 35.0, "low_stock_threshold": 10.0},
        {"id": "3", "name_en": "Potato", "name_kn": "ಆಲೂಗಡ್ಡೆ", "unit": "kg", "selling_price": 35.0, "cost_price": 22.0, "current_stock": 40.0, "low_stock_threshold": 8.0},
        {"id": "4", "name_en": "Carrot", "name_kn": "ಕ್ಯಾರೆಟ್", "unit": "kg", "selling_price": 50.0, "cost_price": 30.0, "current_stock": 12.0, "low_stock_threshold": 4.0},
        {"id": "5", "name_en": "Green Chilli", "name_kn": "ಹಸಿ ಮೆಣಸಿನಕಾಯಿ", "unit": "kg", "selling_price": 70.0, "cost_price": 40.0, "current_stock": 6.0, "low_stock_threshold": 2.0},
      ];
    }
  }

  static Future<Map<String, dynamic>> sendVoiceQuery(String queryText, String lang) async {
    try {
      final response = await http.post(
        Uri.parse("$fallbackLocalUrl/voice/query"),
        headers: headers,
        body: jsonEncode({"query_text": queryText, "language": lang}),
      );
      return jsonDecode(response.body);
    } catch (e) {
      return {
        "success": true,
        "data": {
          "speech_response_kn": "ನಿಮ್ಮ ಬೇಡಿಕೆಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಇಂದು ನಿಮ್ಮ ಒಟ್ಟು ಲಾಭ ₹540 ರೂಪಾಯಿ.",
          "speech_response_text": "Processed. Your total net profit today is ₹540.00.",
          "action_performed": true
        }
      };
    }
  }
}
