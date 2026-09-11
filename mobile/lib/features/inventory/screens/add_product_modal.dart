import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/colors.dart';
import '../../../core/localization/locale_provider.dart';
import '../providers/inventory_provider.dart';

class AddProductModal extends ConsumerStatefulWidget {
  const AddProductModal({Key? key}) : super(key: key);

  @override
  ConsumerState<AddProductModal> createState() => _AddProductModalState();
}

class _AddProductModalState extends ConsumerState<AddProductModal> {
  final _nameKnController = TextEditingController();
  final _nameEnController = TextEditingController();
  final _costPriceController = TextEditingController();
  final _sellPriceController = TextEditingController();
  final _stockController = TextEditingController();
  final _shelfLifeController = TextEditingController(text: "3");
  String _selectedUnit = "kg";

  void _save() async {
    final nameKn = _nameKnController.text.trim();
    final nameEn = _nameEnController.text.trim();
    final cost = double.tryParse(_costPriceController.text.trim()) ?? 0.0;
    final sell = double.tryParse(_sellPriceController.text.trim()) ?? 0.0;
    final stock = double.tryParse(_stockController.text.trim()) ?? 0.0;
    final shelf = int.tryParse(_shelfLifeController.text.trim()) ?? 3;

    if ((nameKn.isEmpty && nameEn.isEmpty) || sell <= 0) {
      return;
    }

    await ref.read(inventoryProvider.notifier).addProduct(
          nameEn: nameEn.isNotEmpty ? nameEn : nameKn,
          nameKn: nameKn.isNotEmpty ? nameKn : nameEn,
          category: "Vegetables",
          unit: _selectedUnit,
          costPrice: cost,
          sellingPrice: sell,
          initialStock: stock,
          shelfLifeDays: shelf,
        );

    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider);
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
                  tr.tr('add_new_product'),
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
              controller: lang == 'kn' ? _nameKnController : _nameEnController,
              decoration: InputDecoration(
                labelText: tr.tr('product_name'),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.bgCanvas,
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _costPriceController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: "${tr.tr('cost_price')} (₹)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: AppColors.bgCanvas,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _sellPriceController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: "${tr.tr('selling_price')} (₹)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: AppColors.bgCanvas,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _stockController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: tr.tr('current_stock'),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: AppColors.bgCanvas,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedUnit,
                    decoration: InputDecoration(
                      labelText: tr.tr('unit'),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: AppColors.bgCanvas,
                    ),
                    items: [
                      DropdownMenuItem(value: 'kg', child: Text(tr.tr('unit_kg'))),
                      DropdownMenuItem(value: 'bunch', child: Text(tr.tr('unit_bunch'))),
                      DropdownMenuItem(value: 'piece', child: Text(tr.tr('unit_piece'))),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedUnit = val);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _shelfLifeController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: tr.tr('perishable_shelf_life'),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.bgCanvas,
              ),
            ),
            const SizedBox(height: 18),

            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
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
