import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/udhaar_provider.dart';
import 'add_udhaar_modal.dart';

class UdhaarScreen extends ConsumerStatefulWidget {
  const UdhaarScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<UdhaarScreen> createState() => _UdhaarScreenState();
}

class _UdhaarScreenState extends ConsumerState<UdhaarScreen> {
  final _searchController = TextEditingController();

  void _openAddModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddUdhaarModal(),
    );
  }

  void _sendWhatsAppReminder(Map<String, dynamic> customer, double balance) async {
    final tr = ref.read(localeProvider.notifier);
    final phone = (customer['phone'] ?? '').toString().replaceAll(RegExp(r'[^0-9]'), '');
    final msg = tr.tr('reminder_msg_template', params: {'amount': balance.toStringAsFixed(0)});
    final encodedMsg = Uri.encodeComponent(msg);
    final url = Uri.parse("https://wa.me/$phone?text=$encodedMsg");

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.udhaarIndigo),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.udhaarIndigo),
      );
    }
  }

  void _showRecordPaymentDialog(Map<String, dynamic> customer, double balance) {
    final tr = ref.read(localeProvider.notifier);
    final amountController = TextEditingController(text: balance.toStringAsFixed(0));

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(20)),
        title: Text("${tr.tr('record_payment')}: ${customer['customer_name']}"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: "${tr.tr('total_amount')} (₹)",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(tr.tr('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.vendorGreen,
              foregroundColor: Colors.white,
              shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              final paid = double.tryParse(amountController.text.trim()) ?? 0.0;
              if (paid > 0) {
                ref.read(udhaarProvider.notifier).recordPayment(customer['id'], paid);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(tr.tr('payment_recorded_success')),
                    backgroundColor: AppColors.vendorGreen,
                  ),
                );
              }
              Navigator.pop(ctx);
            },
            child: Text(tr.tr('confirm')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tr = ref.read(localeProvider.notifier);
    final udhState = ref.watch(udhaarProvider);
    final udhNotifier = ref.read(udhaarProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(
          tr.tr('udhaar_title'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textMain,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add, color: AppColors.udhaarIndigo, size: 26),
            onPressed: _openAddModal,
          ),
        ],
      ),
      body: Column(
        children: [
          // Total Pending Banner Card
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.udhaarIndigo, Color(0xFF6366F1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.udhaarIndigo.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr.tr('total_pending'),
                      style: const TextStyle(color: Color(0xFFE0E7FF), fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "₹${udhState.totalOutstanding.toStringAsFixed(0)}",
                      style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.extrabold),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.account_balance_wallet, color: Colors.white, size: 28),
                ),
              ],
            ),
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: TextField(
              controller: _searchController,
              onChanged: (q) => udhNotifier.setSearchQuery(q),
              decoration: InputDecoration(
                hintText: tr.tr('search_customer'),
                prefixIcon: const Icon(Icons.search, color: AppColors.udhaarIndigo),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Customers List
          Expanded(
            child: udhState.isLoading
                ? Center(child: Text(tr.tr('loading')))
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    itemCount: udhState.filteredCustomers.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final c = udhState.filteredCustomers[index];
                      final name = c['customer_name'] ?? 'Customer';
                      final phone = c['phone'] ?? '';
                      final due = (c['amount_due'] as num?)?.toDouble() ?? 0.0;
                      final paid = (c['amount_paid'] as num?)?.toDouble() ?? 0.0;
                      final balance = (due - paid).clamp(0.0, 999999.0);
                      final dueDate = c['due_date'] ?? '';
                      final isSettled = balance <= 0;

                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2))
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.textMain,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        phone,
                                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      "₹${balance.toStringAsFixed(0)}",
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.extrabold,
                                        color: isSettled ? AppColors.vendorGreen : AppColors.alertRed,
                                      ),
                                    ),
                                    Text(
                                      isSettled ? tr.tr('synced') : "${tr.tr('due_date')}: $dueDate",
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            if (c['items_summary'] != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                c['items_summary'],
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontStyle: FontStyle.italic),
                              ),
                            ],
                            const SizedBox(height: 12),
                            const Divider(height: 1),
                            const SizedBox(height: 8),

                            // Actions: WhatsApp Reminder + Record Payment
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.vendorGreen,
                                      side: const BorderSide(color: AppColors.vendorGreen),
                                      shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(12)),
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                    ),
                                    icon: const Icon(Icons.chat, size: 16),
                                    label: Text(
                                      tr.tr('send_whatsapp_reminder'),
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                    onPressed: isSettled ? null : () => _sendWhatsAppReminder(c, balance),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.udhaarIndigo,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(12)),
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                    ),
                                    icon: const Icon(Icons.check, size: 16),
                                    label: Text(
                                      tr.tr('record_payment'),
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                    onPressed: isSettled ? null : () => _showRecordPaymentDialog(c, balance),
                                  ),
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
