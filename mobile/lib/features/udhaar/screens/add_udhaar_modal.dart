import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/udhaar_provider.dart';

class AddUdhaarModal extends ConsumerStatefulWidget {
  const AddUdhaarModal({Key? key}) : super(key: key);

  @override
  ConsumerState<AddUdhaarModal> createState() => _AddUdhaarModalState();
}

class _AddUdhaarModalState extends ConsumerState<AddUdhaarModal> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController(text: "+91");
  final _amountController = TextEditingController();
  final _itemsController = TextEditingController();
  String _dueDate = DateTime.now().add(const Duration(days: 7)).toIso8601String().substring(0, 10);

  void _save() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final amount = double.tryParse(_amountController.text.trim()) ?? 0.0;
    final items = _itemsController.text.trim();

    if (name.isEmpty || amount <= 0) return;

    await ref.read(udhaarProvider.notifier).addUdhaarEntry(
          customerName: name,
          phone: phone,
          amountDue: amount,
          dueDate: _dueDate,
          itemsSummary: items.isNotEmpty ? items : "Vegetables & Groceries",
        );

    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final tr = ref.read(localeProvider.notifier);

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  tr.tr('add_udhaar_entry'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textMain),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: tr.tr('customer_name'),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.bgCanvas,
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: tr.tr('phone_number'),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.bgCanvas,
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: "${tr.tr('total_amount')} (₹)",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.bgCanvas,
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _itemsController,
              decoration: InputDecoration(
                labelText: tr.tr('bill_summary'),
                hintText: "2kg Tomato, 1kg Onion",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.bgCanvas,
              ),
            ),
            const SizedBox(height: 18),

            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.udhaarIndigo,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleRBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: _save,
              child: Text(tr.tr('save'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
