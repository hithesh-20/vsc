import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/colors.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sync/offline_sync_manager.dart';

class QuickPosScreen extends StatefulWidget {
  const QuickPosScreen({Key? key}) : super(key: key);

  @override
  State<QuickPosScreen> createState() => _QuickPosScreenState();
}

class _QuickPosScreenState extends State<QuickPosScreen> {
  List<dynamic> _products = [];
  Map<String, double> _cart = {}; // productId -> quantity
  String _paymentMode = "CASH";
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  void _loadProducts() async {
    final list = await ApiClient.getProducts();
    setState(() => _products = list);
  }

  void _addToCart(String productId) {
    setState(() {
      _cart[productId] = (_cart[productId] ?? 0.0) + 1.0;
    });
  }

  void _decrementCart(String productId) {
    setState(() {
      if ((_cart[productId] ?? 0.0) <= 1.0) {
        _cart.remove(productId);
      } else {
        _cart[productId] = (_cart[productId]! - 1.0);
      }
    });
  }

  double get _totalBill {
    double total = 0.0;
    _cart.forEach((pId, qty) {
      final p = _products.firstWhere((item) => item["id"] == pId, orElse: () => null);
      if (p != null) {
        total += (p["selling_price"] as num).toDouble() * qty;
      }
    });
    return total;
  }

  void _recordSale() async {
    if (_cart.isEmpty) return;
    setState(() => _submitting = true);

    final items = _cart.entries.map((e) {
      final p = _products.firstWhere((item) => item["id"] == e.key);
      return {
        "product_id": p["id"],
        "product_name": p["name_en"],
        "quantity": e.value,
        "unit": p["unit"],
        "unit_price": p["selling_price"],
      };
    }).toList();

    try {
      final response = await http.post(
        Uri.parse("${ApiClient.fallbackLocalUrl}/sales/record"),
        headers: ApiClient.headers,
        body: jsonEncode({
          "customer_name": "Walk-in Customer",
          "items": items,
          "payment_mode": _paymentMode,
          "cash_paid": _paymentMode == "CASH" ? _totalBill : 0.0,
          "upi_paid": _paymentMode == "UPI" ? _totalBill : 0.0,
          "udhaar_amount": _paymentMode == "UDHAAR" ? _totalBill : 0.0,
        }),
      );

      if (response.statusCode == 201) {
        _showSuccess("✓ ಮಾರಾಟ ದಾಖಲಾಗಿದೆ (₹${_totalBill.toStringAsFixed(0)})");
      } else {
        throw Exception("Server offline");
      }
    } catch (_) {
      // Offline fallback: Queue mutation in outbox
      await OfflineSyncManager.queueOfflineSale(
        customerName: "Walk-in Offline Customer",
        totalAmount: _totalBill,
        paymentMode: _paymentMode,
        items: items,
      );
      _showSuccess("✓ ಆಫ್‌ಲೈನ್ ಉಳಿಸಲಾಗಿದೆ (Saved to Offline Outbox)");
    } finally {
      setState(() {
        _cart.clear();
        _submitting = false;
      });
    }
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.vendorGreen, duration: const Duration(seconds: 2)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text("ತ್ವರಿತ ಮಾರಾಟ ಬಿಲ್ (POS Billing)"),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: Column(
        children: [
          // Products Grid (Large Touch Buttons for Street Vendors)
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const dynamicDelegate(),
              itemCount: _products.length,
              itemBuilder: (context, index) {
                final p = _products[index];
                final pId = p["id"];
                final inCartQty = _cart[pId] ?? 0.0;

                return GestureDetector(
                  onTap: () => _addToCart(pId),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: inCartQty > 0 ? AppColors.primaryOrangeLight : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: inCartQty > 0 ? AppColors.primaryOrange : Colors.grey.shade200,
                        width: inCartQty > 0 ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "₹${p["selling_price"]}/${p["unit"]}",
                              style: const TextStyle(fontWeight: FontWeight.extrabold, fontSize: 15, color: AppColors.primaryOrange),
                            ),
                            if (inCartQty > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryOrange,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  "${inCartQty.toStringAsFixed(0)} ${p["unit"]}",
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                                ),
                              ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p["name_kn"] ?? p["name_en"], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Text(p["name_en"], style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Bottom Billing & Payment Drawer
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, -4))],
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Payment Mode Buttons
                  Row(
                    children: [
                      _buildPayModeBtn("CASH", "💵 ನಗದು (Cash)"),
                      const SizedBox(width: 8),
                      _buildPayModeBtn("UPI", "📱 ಯುಪಿಐ (UPI)"),
                      const SizedBox(width: 8),
                      _buildPayModeBtn("UDHAAR", "📒 ಉದಾರ್ (Credit)"),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Total & Confirm Button
                  Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("ಒಟ್ಟು ಮೊತ್ತ (Total)", style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          Text("₹${_totalBill.toStringAsFixed(0)}", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.extrabold, color: AppColors.textMain)),
                        ],
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryOrange,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(18)),
                          ),
                          onPressed: _cart.isEmpty || _submitting ? null : _recordSale,
                          child: Text(
                            _submitting ? "ದಾಖಲಿಸಲಾಗುತ್ತಿದೆ..." : "ಬಿಲ್ ಪೂರ್ಣಗೊಳಿಸಿ (Collect ₹${_totalBill.toStringAsFixed(0)})",
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPayModeBtn(String mode, String label) {
    final isSelected = _paymentMode == mode;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _paymentMode = mode),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryOrange : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : AppColors.textMain,
            ),
          ),
        ),
      ),
    );
  }
}

class dynamicDelegate extends SliverGridDelegateWithFixedCrossAxisCount {
  const dynamicDelegate()
      : super(
          crossAxisCount: 2,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1.35,
        );
}
