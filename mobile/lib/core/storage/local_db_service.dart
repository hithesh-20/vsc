import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalDbService {
  static const String _productsKey = 'vendorsathi_cached_products';
  static const String _udhaarKey = 'vendorsathi_cached_udhaar';
  static const String _ordersKey = 'vendorsathi_cached_orders';
  static const String _loyaltyPointsKey = 'vendorsathi_loyalty_points';

  // Authentic Bangalore / Karnataka Market Produce matching SQLite backend
  static final List<Map<String, dynamic>> defaultProducts = [
    {
      "id": "ae7447ad-2e77-4dd0-b4cd-88294aa00fcf",
      "name_en": "Carrot (Ooty)",
      "name_kn": "ಕ್ಯಾರೆಟ್ (ಊಟಿ)",
      "category": "Vegetables",
      "unit": "kg",
      "selling_price": 50.0,
      "cost_price": 30.0,
      "current_stock": 138.0,
      "low_stock_threshold": 4.0,
      "perishable_shelf_life_days": 4,
      "image_emoji": "🥕"
    },
    {
      "id": "4050eab4-b1c3-49ad-8bee-fc2938211090",
      "name_en": "Coriander Bunch",
      "name_kn": "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು",
      "category": "Greens",
      "unit": "bunch",
      "selling_price": 15.0,
      "cost_price": 8.0,
      "current_stock": 18.0,
      "low_stock_threshold": 5.0,
      "perishable_shelf_life_days": 1,
      "image_emoji": "🌿"
    },
    {
      "id": "cb066c37-5499-4dee-b83e-51ff3fa3e2da",
      "name_en": "Cucumber",
      "name_kn": "ಸೌತೆಕಾಯಿ",
      "category": "Vegetables",
      "unit": "kg",
      "selling_price": 35.0,
      "cost_price": 20.0,
      "current_stock": 15.0,
      "low_stock_threshold": 3.0,
      "perishable_shelf_life_days": 3,
      "image_emoji": "🥒"
    },
    {
      "id": "487fa18d-8508-417a-8962-ebefa026583f",
      "name_en": "Fresh Green Chilli",
      "name_kn": "ಹಸಿ ಮೆಣಸಿನಕಾಯಿ",
      "category": "Vegetables",
      "unit": "kg",
      "selling_price": 70.0,
      "cost_price": 40.0,
      "current_stock": 11.0,
      "low_stock_threshold": 2.0,
      "perishable_shelf_life_days": 3,
      "image_emoji": "🌶️"
    },
    {
      "id": "a12ebeb9-bd96-425e-9c2b-46e0b0af4df4",
      "name_en": "Ladies Finger (Bhindi)",
      "name_kn": "ಬೆಂಡೆಕಾಯಿ",
      "category": "Vegetables",
      "unit": "kg",
      "selling_price": 45.0,
      "cost_price": 28.0,
      "current_stock": 3.5,
      "low_stock_threshold": 5.0,
      "perishable_shelf_life_days": 2,
      "image_emoji": "🥬"
    },
    {
      "id": "b402263a-2ed9-4185-9a3e-aee9821dfef2",
      "name_en": "Potato (Jyoti)",
      "name_kn": "ಆಲೂಗಡ್ಡೆ",
      "category": "Vegetables",
      "unit": "kg",
      "selling_price": 35.0,
      "cost_price": 22.0,
      "current_stock": 40.0,
      "low_stock_threshold": 8.0,
      "perishable_shelf_life_days": 10,
      "image_emoji": "🥔"
    },
    {
      "id": "83fce99f-f19b-4646-93f5-3554ca81edd0",
      "name_en": "Red Onion",
      "name_kn": "ಈರುಳ್ಳಿ",
      "category": "Vegetables",
      "unit": "kg",
      "selling_price": 40.0,
      "cost_price": 25.0,
      "current_stock": 35.0,
      "low_stock_threshold": 10.0,
      "perishable_shelf_life_days": 7,
      "image_emoji": "🧅"
    },
    {
      "id": "faa0e0c9-af59-499e-a957-6ae7187827e1",
      "name_en": "Tomato (Local Farm)",
      "name_kn": "ಟೊಮೇಟೊ",
      "category": "Vegetables",
      "unit": "kg",
      "selling_price": 30.0,
      "cost_price": 18.0,
      "current_stock": 19.0,
      "low_stock_threshold": 5.0,
      "perishable_shelf_life_days": 2,
      "image_emoji": "🍅"
    }
  ];

  // Authentic Udhaar records matching SQLite database
  static final List<Map<String, dynamic>> defaultUdhaar = [
    {
      "id": "udh-1",
      "customer_name": "Kumar (Tea Shop)",
      "phone": "+919845011223",
      "amount_due": 450.0,
      "amount_paid": 150.0,
      "due_date": "2026-09-18",
      "last_payment_date": "2026-09-08",
      "items_summary": "Weekly supply: 5kg Onion, 2kg Ginger, 1kg Chilli",
      "status": "PARTIAL"
    },
    {
      "id": "udh-2",
      "customer_name": "Govindraj (Tailor)",
      "phone": "+919845077889",
      "amount_due": 680.0,
      "amount_paid": 300.0,
      "due_date": "2026-09-15",
      "last_payment_date": "2026-09-02",
      "items_summary": "Monthly credit: 4kg Tomato, 3kg Potato, Coriander",
      "status": "PARTIAL"
    },
    {
      "id": "udh-3",
      "customer_name": "Sunil Auto Driver",
      "phone": "+919845044556",
      "amount_due": 220.0,
      "amount_paid": 0.0,
      "due_date": "2026-09-14",
      "last_payment_date": "2026-08-31",
      "items_summary": "2kg Tomato, 1kg Cucumber, 250g Chilli",
      "status": "UNPAID"
    },
    {
      "id": "udh-4",
      "customer_name": "Lakshmamma",
      "phone": "+919845099001",
      "amount_due": 140.0,
      "amount_paid": 140.0,
      "due_date": "2026-09-10",
      "last_payment_date": "2026-09-10",
      "items_summary": "1kg Carrot, 1 bunch Coriander",
      "status": "SETTLED"
    }
  ];

  // Authentic Customer Order from Priya Sharma
  static final List<Map<String, dynamic>> defaultOrders = [
    {
      "id": "ORD-0822-A101",
      "customer_name": "Priya Sharma",
      "phone": "+919876543220",
      "delivery_address": "#42, 3rd Cross, Gandhi Nagar, Bengaluru",
      "items": [
        {"name": "Tomato (Local Farm)", "qty": 3, "unit": "kg", "price": 30.0},
        {"name": "Red Onion", "qty": 2, "unit": "kg", "price": 40.0},
      ],
      "total_amount": 170.0,
      "payment_mode": "UPI",
      "status": "PENDING",
      "order_time": "10:30 AM"
    }
  ];

  static Future<List<Map<String, dynamic>>> getProducts() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_productsKey);
      if (str != null) {
        final list = jsonDecode(str) as List;
        if (list.isNotEmpty) {
          return list.map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (_) {}
    return defaultProducts;
  }

  static Future<void> saveProducts(List<Map<String, dynamic>> products) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_productsKey, jsonEncode(products));
    } catch (_) {}
  }

  static Future<void> updateStock(String productId, double decrementBy) async {
    final products = await getProducts();
    for (var p in products) {
      if (p['id'] == productId) {
        final current = (p['current_stock'] as num).toDouble();
        p['current_stock'] = (current - decrementBy).clamp(0.0, 9999.0);
      }
    }
    await saveProducts(products);
  }

  static Future<List<Map<String, dynamic>>> getUdhaarList() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_udhaarKey);
      if (str != null) {
        final list = jsonDecode(str) as List;
        if (list.isNotEmpty) {
          return list.map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (_) {}
    return defaultUdhaar;
  }

  static Future<void> saveUdhaarList(List<Map<String, dynamic>> list) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_udhaarKey, jsonEncode(list));
    } catch (_) {}
  }

  static Future<List<Map<String, dynamic>>> getOrders() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_ordersKey);
      if (str != null) {
        final list = jsonDecode(str) as List;
        if (list.isNotEmpty) {
          return list.map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (_) {}
    return defaultOrders;
  }

  static Future<void> saveOrders(List<Map<String, dynamic>> list) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_ordersKey, jsonEncode(list));
    } catch (_) {}
  }

  static Future<int> getLoyaltyPoints() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getInt(_loyaltyPointsKey) ?? 340;
    } catch (_) {
      return 340;
    }
  }

  static Future<void> addLoyaltyPoints(int points) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final current = await getLoyaltyPoints();
      await prefs.setInt(_loyaltyPointsKey, current + points);
    } catch (_) {}
  }
}
