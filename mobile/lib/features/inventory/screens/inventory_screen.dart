import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/colors.dart';
import '../../../core/network/api_client.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({Key? key}) : super(key: key);

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  List<dynamic> _products = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    setState(() => _loading = true);
    final list = await ApiClient.getProducts();
    setState(() {
      _products = list;
      _loading = false;
    });
  }

  void _showRestockDialog(Map<String, dynamic> product) {
    final qtyController = TextEditingController(text: "10");
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text("${product['name_kn']} ಸರಕು ಸೇರಿಸಿ (Restock)"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("ಪ್ರಸ್ತುತ ದಾಸ್ತಾನು: ${product['current_stock']} ${product['unit']}", style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
            const SizedBox(height: 16),
            TextField(
              controller: qtyController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: "ಸೇರಿಸಬೇಕಾದ ಪ್ರಮಾಣ (${product['unit']})",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("ರದ್ದು (Cancel)")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.vendorGreen, foregroundColor: Colors.white),
            onPressed: () async {
              final addQty = double.tryParse(qtyController.text) ?? 10.0;
              try {
                await http.post(
                  Uri.parse("${ApiClient.fallbackLocalUrl}/inventory/adjust"),
                  headers: ApiClient.headers,
                  body: jsonEncode({
                    "product_id": product["id"],
                    "change_qty": addQty,
                    "transaction_type": "PURCHASE_IN"
                  }),
                );
              } catch (_) {}
              Navigator.pop(ctx);
              _loadData();
            },
            child: const Text("ಸೇರಿಸಿ (Add Stock)"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text("ದಾಸ್ತಾನು ನಿರ್ವಹಣೆ (Inventory)"),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _products.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final p = _products[index];
                final currentStock = (p["current_stock"] as num).toDouble();
                final lowTh = (p["low_stock_threshold"] as num).toDouble();
                final isLow = currentStock <= lowTh;

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isLow ? AppColors.alertRed.withOpacity(0.4) : Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isLow ? AppColors.alertRedLight : AppColors.vendorGreenLight,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          isLow ? Icons.warning_amber_rounded : Icons.check_circle_outline,
                          color: isLow ? AppColors.alertRed : AppColors.vendorGreen,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p["name_kn"] ?? p["name_en"], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            Text("${p['name_en']} • ₹${p['selling_price']}/${p['unit']}", style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            const SizedBox(height: 4),
                            Text(
                              "ಉಳಿದಿರುವ ದಾಸ್ತಾನು: $currentStock ${p['unit']}",
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isLow ? AppColors.alertRed : AppColors.textMain),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.vendorGreenLight,
                          foregroundColor: AppColors.vendorGreen,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => _showRestockDialog(p),
                        child: const Text("+ ಸರಕು ಸೇರಿಸಿ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
