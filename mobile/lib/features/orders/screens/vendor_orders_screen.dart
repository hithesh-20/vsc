import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/colors.dart';
import '../../../core/network/api_client.dart';

class VendorOrdersScreen extends StatefulWidget {
  const VendorOrdersScreen({Key? key}) : super(key: key);

  @override
  State<VendorOrdersScreen> createState() => _VendorOrdersScreenState();
}

class _VendorOrdersScreenState extends State<VendorOrdersScreen> {
  List<dynamic> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  void _loadOrders() async {
    setState(() => _loading = true);
    try {
      final response = await http.get(
        Uri.parse("${ApiClient.fallbackLocalUrl}/orders/vendor"),
        headers: ApiClient.headers,
      );
      final data = jsonDecode(response.body)["data"];
      setState(() {
        _orders = data ?? [];
        _loading = false;
      });
    } catch (_) {
      // Mock Fallback
      setState(() {
        _orders = [
          {
            "id": "1",
            "order_number": "ORD-0822-A101",
            "total_amount": 170.0,
            "status": "PENDING",
            "delivery_address": "#42, 3rd Cross, Gandhi Nagar",
            "items": [
              {"product_name_snapshot": "Tomato", "quantity": 3.0, "unit": "kg", "unit_price": 30.0},
              {"product_name_snapshot": "Onion", "quantity": 2.0, "unit": "kg", "unit_price": 40.0},
            ]
          }
        ];
        _loading = false;
      });
    }
  }

  void _updateStatus(String orderId, String nextStatus) async {
    try {
      await http.put(
        Uri.parse("${ApiClient.fallbackLocalUrl}/orders/$orderId/status"),
        headers: ApiClient.headers,
        body: jsonEncode({"status": nextStatus}),
      );
      _loadOrders();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text("ಗ್ರಾಹಕರ ಆರ್ಡರ್‌ಗಳು (Customer Orders)"),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? const Center(child: Text("ಯಾವುದೇ ಹೊಸ ಆರ್ಡರ್‌ಗಳಿಲ್ಲ (No pending orders)"))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _orders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final ord = _orders[index];
                    final status = ord["status"];
                    final items = (ord["items"] as List?) ?? [];

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(ord["order_number"], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: status == "PENDING" ? AppColors.alertRedLight : AppColors.vendorGreenLight,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                    color: status == "PENDING" ? AppColors.alertRed : AppColors.vendorGreen,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text("📍 ವಿಳಾಸ: ${ord['delivery_address'] ?? 'Direct Pickup'}", style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          const Divider(height: 20),
                          ...items.map((i) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 2),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text("${i['product_name_snapshot']} × ${i['quantity']} ${i['unit']}", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                    Text("₹${(i['quantity'] * i['unit_price']).toStringAsFixed(0)}", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              )),
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text("ಒಟ್ಟು: ₹${ord['total_amount']}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.extrabold, color: AppColors.primaryOrange)),
                              if (status == "PENDING")
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.vendorGreen, foregroundColor: Colors.white),
                                  onPressed: () => _updateStatus(ord["id"], "ACCEPTED"),
                                  child: const Text("ಸ್ವೀಕರಿಸಿ (Accept)"),
                                )
                              else if (status == "ACCEPTED")
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade700, foregroundColor: Colors.white),
                                  onPressed: () => _updateStatus(ord["id"], "COMPLETED"),
                                  child: const Text("ಪೂರ್ಣಗೊಳಿಸಿ (Complete)"),
                                ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
