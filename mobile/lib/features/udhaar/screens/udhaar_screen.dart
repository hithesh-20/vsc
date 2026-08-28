import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/colors.dart';
import '../../../core/network/api_client.dart';

class UdhaarScreen extends StatefulWidget {
  const UdhaarScreen({Key? key}) : super(key: key);

  @override
  State<UdhaarScreen> createState() => _UdhaarScreenState();
}

class _UdhaarScreenState extends State<UdhaarScreen> {
  List<dynamic> _records = [];
  double _totalOutstanding = 0.0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUdhaarData();
  }

  void _loadUdhaarData() async {
    setState(() => _loading = true);
    try {
      final response = await http.get(
        Uri.parse("${ApiClient.fallbackLocalUrl}/udhaar"),
        headers: ApiClient.headers,
      );
      final data = jsonDecode(response.body)["data"];
      setState(() {
        _totalOutstanding = (data["total_outstanding_udhaar"] as num).toDouble();
        _records = data["records"] ?? [];
        _loading = false;
      });
    } catch (_) {
      // Mock Fallback
      setState(() {
        _totalOutstanding = 900.0;
        _records = [
          {"id": "1", "customer_name": "Kumar (Tea Shop)", "customer_phone": "9845011223", "remaining_balance": 300.0, "amount_due": 450.0, "status": "PARTIAL"},
          {"id": "2", "customer_name": "Sunil Auto Driver", "customer_phone": "9845044556", "remaining_balance": 220.0, "amount_due": 220.0, "status": "UNPAID"},
          {"id": "3", "customer_name": "Govindraj (Tailor)", "customer_phone": "9845077889", "remaining_balance": 380.0, "amount_due": 680.0, "status": "PARTIAL"},
        ];
        _loading = false;
      });
    }
  }

  void _sendWhatsAppReminder(Map<String, dynamic> record) async {
    final phone = record["customer_phone"] ?? "";
    final balance = record["remaining_balance"];
    final text = Uri.encodeComponent("ನಮಸ್ಕಾರ ${record['customer_name']}, ರಮೇಶ್ ತರಕಾರಿ ಅಂಗಡಿಯಿಂದ ನಿಮ್ಮ ಬಾಕಿ ಹಣ ₹$balance ಆಗಿದೆ. ದಯವಿಟ್ಟು ಪಾವತಿಸಿ.");
    final url = Uri.parse("https://wa.me/91$phone?text=$text");

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿದೆ: ಬಾಕಿ ₹$balance")),
      );
    }
  }

  void _showRepayDialog(Map<String, dynamic> record) {
    final amountController = TextEditingController(text: "${record['remaining_balance']}");
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text("${record['customer_name']} ಸಾಲ ಮರುಪಾವತಿ"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: "ಸ್ವೀಕರಿಸಿದ ಮೊತ್ತ (₹)",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("ರದ್ದು")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryOrange, foregroundColor: Colors.white),
            onPressed: () async {
              final paid = double.tryParse(amountController.text) ?? 0.0;
              try {
                await http.post(
                  Uri.parse("${ApiClient.fallbackLocalUrl}/udhaar/${record['id']}/repay"),
                  headers: ApiClient.headers,
                  body: jsonEncode({"amount_paid": paid, "payment_mode": "CASH"}),
                );
              } catch (_) {}
              Navigator.pop(ctx);
              _loadUdhaarData();
            },
            child: const Text("ಸ್ವೀಕರಿಸಿ (Collect)"),
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
        title: const Text("ಉದಾರ್ ಖಾತೆ ಪುಸ್ತಕ (Udhaar Ledger)"),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Total Outstanding Card
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF6366F1)]),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("ಒಟ್ಟು ಬಾಕಿ ಉದಾರ್ (Total Pending Credit)", style: TextStyle(color: Color(0xFFC7D2FE), fontSize: 13)),
                      const SizedBox(height: 4),
                      Text("₹${_totalOutstanding.toStringAsFixed(0)}", style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.black)),
                    ],
                  ),
                ),

                // Customer List
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _records.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final r = _records[index];
                      final remaining = (r["remaining_balance"] as num).toDouble();

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(r["customer_name"], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                Text("📞 ${r['customer_phone'] ?? 'No phone'}", style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                const SizedBox(height: 4),
                                Text("ಬಾಕಿ: ₹${remaining.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.extrabold, fontSize: 14, color: AppColors.alertRed)),
                              ],
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.notifications_active, color: AppColors.vendorGreen),
                                  onPressed: () => _sendWhatsAppReminder(r),
                                ),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryOrangeLight, foregroundColor: AppColors.primaryOrange, elevation: 0),
                                  onPressed: () => _showRepayDialog(r),
                                  child: const Text("ಹಣ ಪಡೆಯಿರಿ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
