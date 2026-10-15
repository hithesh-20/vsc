import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  PageHeader,
  Pill,
  Screen,
  StateView,
  TextField,
} from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { inr, qty as fmtQty } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { Product, ProductUnit } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const UNITS: ProductUnit[] = ['kg', 'g', 'piece', 'dozen', 'packet', 'liter', 'bunch'];
const STOCK_TYPES = ['PURCHASE_IN', 'WASTE_ADJUST', 'CORRECTION', 'RETURN'] as const;

type Mode = 'create' | 'edit' | 'restock';

interface FormState {
  name_en: string;
  name_kn: string;
  unit: ProductUnit;
  cost_price: string;
  selling_price: string;
  current_stock: string;
  low_stock_threshold: string;
  change_qty: string;
  transaction_type: (typeof STOCK_TYPES)[number];
  notes: string;
}

const emptyForm: FormState = {
  name_en: '',
  name_kn: '',
  unit: 'kg',
  cost_price: '',
  selling_price: '',
  current_stock: '',
  low_stock_threshold: '5',
  change_qty: '',
  transaction_type: 'PURCHASE_IN',
  notes: '',
};

const num = (s: string) => {
  const parsed = Number.parseFloat(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function InventoryScreen() {
  const fetchProducts = useCallback(() => api.getProducts(), []);
  const { data: products, loading, refreshing, error, reload, refresh } = useApi<Product[]>(
    fetchProducts,
    [],
  );

  const [mode, setMode] = useState<Mode | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setMode('create');
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      ...emptyForm,
      name_en: product.name_en,
      name_kn: product.name_kn,
      unit: product.unit,
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      current_stock: String(product.current_stock),
      low_stock_threshold: String(product.low_stock_threshold),
    });
    setFormError(null);
    setMode('edit');
  }

  function openRestock(product: Product) {
    setEditing(product);
    setForm({ ...emptyForm, change_qty: '', transaction_type: 'PURCHASE_IN' });
    setFormError(null);
    setMode('restock');
  }

  async function submit() {
    if (!mode) return;
    setBusy(true);
    setFormError(null);
    try {
      if (mode === 'create') {
        await api.createProduct({
          name_en: form.name_en.trim(),
          name_kn: form.name_kn.trim() || form.name_en.trim(),
          unit: form.unit,
          cost_price: num(form.cost_price),
          selling_price: num(form.selling_price),
          current_stock: num(form.current_stock),
          low_stock_threshold: num(form.low_stock_threshold),
        });
      } else if (mode === 'edit' && editing) {
        await api.updateProduct(editing.id, {
          name_en: form.name_en.trim(),
          name_kn: form.name_kn.trim() || form.name_en.trim(),
          unit: form.unit,
          cost_price: num(form.cost_price),
          selling_price: num(form.selling_price),
          low_stock_threshold: num(form.low_stock_threshold),
        });
      } else if (mode === 'restock' && editing) {
        await api.adjustStock({
          product_id: editing.id,
          change_qty: num(form.change_qty),
          transaction_type: form.transaction_type,
          notes: form.notes.trim() || undefined,
        });
      }
      setMode(null);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(product: Product) {
    setBusy(true);
    try {
      await api.deleteProduct(product.id);
      reload();
    } catch {
      // surfaced on next reload
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Stock"
        subtitle={`${products?.length ?? 0} product(s) in catalog`}
        right={<Button label="Add" icon="add" onPress={openCreate} style={styles.addBtn} />}
      />

      {loading ? (
        <StateView kind="loading" title="Loading inventory…" />
      ) : error ? (
        <StateView kind="error" title="Couldn't load inventory" message={error} onRetry={reload} />
      ) : !products || products.length === 0 ? (
        <StateView
          kind="empty"
          title="No products yet"
          message="Tap Add to create your first product."
        />
      ) : (
        products.map((product) => {
          const low = product.current_stock <= product.low_stock_threshold;
          return (
            <Card key={product.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <AppText variant="heading">{product.name_en}</AppText>
                  <AppText variant="caption">{product.name_kn}</AppText>
                </View>
                <Pill
                  label={low ? 'Low stock' : 'In stock'}
                  fg={low ? colors.red : colors.green}
                  bg={low ? colors.redSoft : colors.greenSoft}
                />
              </View>

              <View style={styles.metrics}>
                <Metric label="Stock" value={`${fmtQty(product.current_stock)} ${product.unit}`} />
                <Metric label="Cost" value={inr(product.cost_price)} />
                <Metric label="Sell" value={inr(product.selling_price)} />
              </View>

              <View style={styles.actions}>
                <Button
                  label="Restock"
                  variant="secondary"
                  icon="add-circle-outline"
                  onPress={() => openRestock(product)}
                  style={styles.flex1}
                />
                <Button
                  label="Edit"
                  variant="ghost"
                  icon="create-outline"
                  onPress={() => openEdit(product)}
                  style={styles.flex1}
                />
                <Pressable style={styles.deleteBtn} onPress={() => remove(product)} disabled={busy}>
                  <Ionicons name="trash-outline" size={18} color={colors.red} />
                </Pressable>
              </View>
            </Card>
          );
        })
      )}

      <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={() => setMode(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <AppText variant="title">
                {mode === 'create' ? 'New product' : mode === 'edit' ? 'Edit product' : `Restock ${editing?.name_en ?? ''}`}
              </AppText>

              {mode === 'restock' ? (
                <>
                  <AppText variant="caption">
                    Current stock: {fmtQty(editing?.current_stock)} {editing?.unit}. Use a negative
                    number to reduce (waste/correction).
                  </AppText>
                  <TextField
                    label="Quantity change"
                    value={form.change_qty}
                    onChangeText={(v) => setForm((f) => ({ ...f, change_qty: v }))}
                    keyboardType="numbers-and-punctuation"
                    placeholder="e.g. 20 or -3"
                  />
                  <AppText variant="label">Reason</AppText>
                  <View style={styles.chips}>
                    {STOCK_TYPES.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => setForm((f) => ({ ...f, transaction_type: t }))}
                        style={[styles.chip, form.transaction_type === t && styles.chipActive]}>
                        <AppText
                          variant="label"
                          color={form.transaction_type === t ? colors.primaryDark : colors.textMuted}>
                          {t}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <TextField
                    label="Notes (optional)"
                    value={form.notes}
                    onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                    placeholder="e.g. Morning mandi purchase"
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Name (English)"
                    value={form.name_en}
                    onChangeText={(v) => setForm((f) => ({ ...f, name_en: v }))}
                    placeholder="e.g. Tomato"
                  />
                  <TextField
                    label="Name (Kannada)"
                    value={form.name_kn}
                    onChangeText={(v) => setForm((f) => ({ ...f, name_kn: v }))}
                    placeholder="ಟೊಮೇಟೊ"
                  />
                  <AppText variant="label">Unit</AppText>
                  <View style={styles.chips}>
                    {UNITS.map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => setForm((f) => ({ ...f, unit: u }))}
                        style={[styles.chip, form.unit === u && styles.chipActive]}>
                        <AppText variant="label" color={form.unit === u ? colors.primaryDark : colors.textMuted}>
                          {u}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.twoCols}>
                    <TextField
                      label="Cost price"
                      value={form.cost_price}
                      onChangeText={(v) => setForm((f) => ({ ...f, cost_price: v }))}
                      keyboardType="decimal-pad"
                      style={styles.flex1}
                    />
                    <TextField
                      label="Selling price"
                      value={form.selling_price}
                      onChangeText={(v) => setForm((f) => ({ ...f, selling_price: v }))}
                      keyboardType="decimal-pad"
                      style={styles.flex1}
                    />
                  </View>
                  <View style={styles.twoCols}>
                    {mode === 'create' ? (
                      <TextField
                        label="Opening stock"
                        value={form.current_stock}
                        onChangeText={(v) => setForm((f) => ({ ...f, current_stock: v }))}
                        keyboardType="decimal-pad"
                        style={styles.flex1}
                      />
                    ) : null}
                    <TextField
                      label="Low stock alert at"
                      value={form.low_stock_threshold}
                      onChangeText={(v) => setForm((f) => ({ ...f, low_stock_threshold: v }))}
                      keyboardType="decimal-pad"
                      style={styles.flex1}
                    />
                  </View>
                </>
              )}

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.red} />
                  <AppText variant="caption" color={colors.red} style={styles.flex1}>
                    {formError}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Button label="Cancel" variant="ghost" onPress={() => setMode(null)} style={styles.flex1} />
                <Button
                  label={mode === 'restock' ? 'Apply' : 'Save'}
                  onPress={submit}
                  loading={busy}
                  disabled={
                    mode === 'restock'
                      ? form.change_qty.trim().length === 0
                      : form.name_en.trim().length < 2
                  }
                  style={styles.flex1}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body" style={styles.metricValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  addBtn: { paddingVertical: 10, minHeight: 40 },
  card: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  metrics: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  metricValue: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.redSoft,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  modalContent: { padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  twoCols: { flexDirection: 'row', gap: spacing.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.redSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
