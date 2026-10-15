import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, PageHeader, Screen, StateView, TextField } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { inr, qty as fmtQty } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { PaymentMode, Product } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const PAY_MODES: PaymentMode[] = ['CASH', 'UPI', 'UDHAAR'];

interface CartLine {
  product: Product;
  quantity: number;
}

export default function PosScreen() {
  const fetchProducts = useCallback(() => api.getProducts(), []);
  const { data: products, loading, refreshing, error, reload, refresh } = useApi<Product[]>(
    fetchProducts,
    [],
  );

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [payMode, setPayMode] = useState<PaymentMode>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const lines = useMemo(() => Object.values(cart), [cart]);
  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.product.selling_price * l.quantity, 0),
    [lines],
  );
  const count = lines.length;

  function addToCart(product: Product) {
    setFeedback(null);
    setCart((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: { product, quantity: (existing?.quantity ?? 0) + 1 },
      };
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) => {
      const line = prev[productId];
      if (!line) return prev;
      const nextQty = line.quantity + delta;
      const next = { ...prev };
      if (nextQty <= 0) delete next[productId];
      else next[productId] = { ...line, quantity: nextQty };
      return next;
    });
  }

  function clearCart() {
    setCart({});
    setCustomerName('');
    setPayMode('CASH');
  }

  async function completeSale() {
    if (lines.length === 0 || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const isUdhaar = payMode === 'UDHAAR';
      await api.recordSale({
        customer_name: customerName.trim() || 'Walk-in Customer',
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: l.product.selling_price,
        })),
        payment_mode: payMode,
        cash_paid: payMode === 'CASH' ? total : 0,
        upi_paid: payMode === 'UPI' ? total : 0,
        udhaar_amount: isUdhaar ? total : 0,
      });
      setFeedback({ type: 'ok', text: `Sale of ${inr(total)} recorded.` });
      clearCart();
      reload();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Could not record the sale.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.headerWrap}>
        <PageHeader title="Quick POS" subtitle="Tap products to add to the bill" />
      </View>

      {loading ? (
        <StateView kind="loading" title="Loading catalog…" />
      ) : error ? (
        <StateView kind="error" title="Couldn't load products" message={error} onRetry={reload} />
      ) : !products || products.length === 0 ? (
        <StateView
          kind="empty"
          title="No products yet"
          message="Add products in the Stock tab to start selling."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.productScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }>
          <View style={styles.grid}>
            {products.map((product) => {
              const inCart = cart[product.id]?.quantity ?? 0;
              return (
                <View key={product.id} style={styles.productCell}>
                  <Card style={styles.productCard}>
                    <AppText variant="heading" numberOfLines={2} style={styles.productName}>
                      {product.name_en}
                    </AppText>
                    <AppText variant="caption">{inr(product.selling_price)} / {product.unit}</AppText>
                    <AppText
                      variant="caption"
                      color={product.current_stock <= 0 ? colors.red : colors.textMuted}>
                      Stock: {fmtQty(product.current_stock)}
                    </AppText>
                    {inCart > 0 ? (
                      <View style={styles.stepper}>
                        <Pressable style={styles.stepBtn} onPress={() => changeQty(product.id, -1)}>
                          <Ionicons name="remove" size={16} color={colors.primaryDark} />
                        </Pressable>
                        <AppText variant="body" style={styles.stepQty}>
                          {fmtQty(inCart)}
                        </AppText>
                        <Pressable style={styles.stepBtn} onPress={() => addToCart(product)}>
                          <Ionicons name="add" size={16} color={colors.primaryDark} />
                        </Pressable>
                      </View>
                    ) : (
                      <Button
                        label="Add"
                        variant="secondary"
                        icon="add"
                        onPress={() => addToCart(product)}
                        disabled={product.current_stock <= 0}
                        style={styles.addBtn}
                      />
                    )}
                  </Card>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={styles.checkout}>
        {feedback ? (
          <View style={[styles.feedback, feedback.type === 'err' && styles.feedbackErr]}>
            <Ionicons
              name={feedback.type === 'ok' ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={feedback.type === 'ok' ? colors.green : colors.red}
            />
            <AppText
              variant="caption"
              color={feedback.type === 'ok' ? colors.green : colors.red}
              style={styles.flex1}>
              {feedback.text}
            </AppText>
          </View>
        ) : null}

        {count > 0 ? (
          <>
            <TextField
              placeholder="Customer name (optional)"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <View style={styles.modeRow}>
              {PAY_MODES.map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setPayMode(mode)}
                  style={[styles.modeChip, payMode === mode && styles.modeChipActive]}>
                  <AppText
                    variant="label"
                    color={payMode === mode ? colors.primaryDark : colors.textMuted}>
                    {mode}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.totalRow}>
              <AppText variant="caption">{count} item(s)</AppText>
              <AppText variant="title">{inr(total)}</AppText>
            </View>
            <View style={styles.actionRow}>
              <Button label="Clear" variant="ghost" onPress={clearCart} style={styles.flex1} />
              <Button
                label="Complete Sale"
                onPress={completeSale}
                loading={busy}
                style={styles.flex2}
              />
            </View>
          </>
        ) : (
          <AppText variant="caption" style={styles.emptyCart}>
            No items in the bill yet.
          </AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  productScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  productCell: { width: '47%', flexGrow: 1 },
  productCard: { gap: spacing.xs, minHeight: 150 },
  productName: { minHeight: 40 },
  addBtn: { marginTop: spacing.xs, paddingVertical: 8, minHeight: 38 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 4,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: { fontWeight: '700' },
  checkout: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  modeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.greenSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  feedbackErr: { backgroundColor: colors.redSoft },
  emptyCart: { textAlign: 'center', paddingVertical: spacing.md },
});
