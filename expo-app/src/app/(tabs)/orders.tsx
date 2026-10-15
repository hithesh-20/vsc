import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Divider,
  PageHeader,
  Pill,
  Screen,
  SectionHeader,
  StateView,
} from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { formatDateTime, inr, nextOrderStatus, orderStatusColor, titleCase } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { Order, OrderStatus } from '@/lib/types';
import { useApi } from '@/lib/useApi';

export default function OrdersScreen() {
  const fetchOrders = useCallback(() => api.getVendorOrders(), []);
  const { data: orders, loading, refreshing, error, reload, refresh } = useApi<Order[]>(
    fetchOrders,
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function advance(order: Order, to: OrderStatus) {
    setBusyId(order.id);
    setFeedback(null);
    try {
      await api.updateOrderStatus(order.id, to);
      setFeedback(`Order ${order.order_number} → ${titleCase(to)}`);
      reload();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Could not update the order.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Loading orders…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" title="Couldn't load orders" message={error} onRetry={reload} /></Screen>;

  const list = orders ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader title="Orders" subtitle={`${list.length} order(s) from customers`} />

      {feedback ? (
        <View style={styles.feedback}>
          <Ionicons name="information-circle" size={16} color={colors.blue} />
          <AppText variant="caption" color={colors.blue} style={styles.flex1}>
            {feedback}
          </AppText>
        </View>
      ) : null}

      {list.length === 0 ? (
        <StateView kind="empty" title="No orders yet" message="New customer orders will appear here." />
      ) : (
        list.map((order) => {
          const sc = orderStatusColor(order.status);
          const next = nextOrderStatus(order.status);
          const canCancel = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
          return (
            <Card key={order.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <AppText variant="heading">{order.order_number}</AppText>
                  <AppText variant="caption">{formatDateTime(order.created_at)}</AppText>
                </View>
                <Pill label={titleCase(order.status)} fg={sc.fg} bg={sc.bg} />
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                <AppText variant="body" style={styles.flex1}>
                  {order.customer_name ?? 'Customer'}
                </AppText>
                <AppText variant="heading">{inr(order.total_amount)}</AppText>
              </View>
              {order.delivery_address ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption" style={styles.flex1} numberOfLines={2}>
                    {order.delivery_address}
                  </AppText>
                </View>
              ) : null}

              <Divider />
              <SectionHeader title={`${order.items.length} item(s)`} />
              {order.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <AppText variant="body" style={styles.flex1} numberOfLines={1}>
                    {item.product_name_snapshot}
                  </AppText>
                  <AppText variant="caption">
                    {item.quantity} {item.unit} × {inr(item.unit_price)}
                  </AppText>
                  <AppText variant="body" style={styles.itemTotal}>
                    {inr(item.subtotal)}
                  </AppText>
                </View>
              ))}

              <View style={styles.actions}>
                {next ? (
                  <Button
                    label={`Mark ${titleCase(next)}`}
                    onPress={() => advance(order, next)}
                    loading={busyId === order.id}
                    style={styles.flex1}
                  />
                ) : null}
                {canCancel ? (
                  <Button
                    label="Cancel"
                    variant="danger"
                    onPress={() => advance(order, 'CANCELLED')}
                    disabled={busyId === order.id}
                    style={styles.flex1}
                  />
                ) : (
                  <AppText variant="caption" style={styles.doneText}>
                    Order {titleCase(order.status).toLowerCase()}
                  </AppText>
                )}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  card: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 3 },
  itemTotal: { fontWeight: '700', minWidth: 64, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  doneText: { flex: 1, textAlign: 'center', paddingVertical: spacing.md },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blueSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
