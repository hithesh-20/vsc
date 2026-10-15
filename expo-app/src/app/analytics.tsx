import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  KeyValue,
  PageHeader,
  Pill,
  Screen,
  SectionHeader,
  StateView,
  StatCard,
} from '@/components/ui';
import { api } from '@/lib/api';
import { inr, qty } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { ProfitAnalytics } from '@/lib/types';
import { useApi } from '@/lib/useApi';

const RANGES = [7, 30, 90];

export default function AnalyticsScreen() {
  const [days, setDays] = useState(7);
  const fetchAnalytics = useCallback(() => api.getProfitAnalytics(days), [days]);
  const { data, loading, refreshing, error, reload, refresh } = useApi<ProfitAnalytics>(
    fetchAnalytics,
    [days],
  );

  const maxRevenue = Math.max(1, ...(data?.trends.map((t) => t.revenue) ?? [1]));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader title="Profit Analytics" subtitle={`Last ${days} days`} />

      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setDays(r)}
            style={[styles.rangeChip, days === r && styles.rangeChipActive]}>
            <AppText variant="label" color={days === r ? colors.primaryDark : colors.textMuted}>
              {r} days
            </AppText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <StateView kind="loading" title="Crunching numbers…" />
      ) : error ? (
        <StateView kind="error" title="Couldn't load analytics" message={error} onRetry={reload} />
      ) : !data ? (
        <StateView kind="empty" title="No analytics yet" />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Revenue" value={inr(data.total_revenue)} icon="cash" fg={colors.blue} bg={colors.blueSoft} />
            <StatCard label="Profit" value={inr(data.total_net_profit)} icon="trending-up" fg={colors.green} bg={colors.greenSoft} />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Cost" value={inr(data.total_cost)} icon="pricetag" fg={colors.amber} bg={colors.amberSoft} />
            <StatCard
              label="Margin"
              value={`${data.overall_profit_margin_pct.toFixed(1)}%`}
              icon="pie-chart"
              fg={colors.purple}
              bg={colors.purpleSoft}
            />
          </View>

          <SectionHeader title="Daily trend" />
          <Card style={styles.chartCard}>
            {data.trends.length === 0 ? (
              <AppText variant="caption">No sales in this period.</AppText>
            ) : (
              <View style={styles.chart}>
                {data.trends.map((point) => {
                  const h = Math.max(4, (point.revenue / maxRevenue) * 120);
                  const profitH = point.revenue > 0 ? (point.profit / point.revenue) * h : 0;
                  return (
                    <View key={point.date} style={styles.barColumn}>
                      <View style={[styles.bar, { height: h }]}>
                        <View style={[styles.barProfit, { height: Math.max(0, profitH) }]} />
                      </View>
                      <AppText variant="caption" style={styles.barLabel} numberOfLines={1}>
                        {point.date.slice(5)}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={styles.legend}>
              <LegendDot color={colors.blueSoft} label="Revenue" />
              <LegendDot color={colors.green} label="Profit" />
            </View>
          </Card>

          <SectionHeader title="Top sellers" />
          <Card style={styles.listCard}>
            {data.top_selling_products.length === 0 ? (
              <AppText variant="caption">No product sales yet.</AppText>
            ) : (
              data.top_selling_products.map((p, i) => (
                <View key={`${p.product_name}-${i}`} style={styles.rankRow}>
                  <View style={styles.rankBadge}>
                    <AppText variant="label" color={colors.primaryDark}>
                      {i + 1}
                    </AppText>
                  </View>
                  <View style={styles.flex1}>
                    <AppText variant="body" style={styles.bold}>
                      {p.product_name}
                    </AppText>
                    <AppText variant="caption">
                      {qty(p.total_qty_sold)} {p.unit} sold
                    </AppText>
                  </View>
                  <View style={styles.alignEnd}>
                    <AppText variant="body" style={styles.bold}>
                      {inr(p.total_revenue)}
                    </AppText>
                    <Pill
                      label={`${p.profit_margin_pct.toFixed(0)}% margin`}
                      fg={colors.green}
                      bg={colors.greenSoft}
                    />
                  </View>
                </View>
              ))
            )}
          </Card>

          <SectionHeader title="Most profitable" />
          <Card style={styles.listCard}>
            {data.top_profitable_products.length === 0 ? (
              <AppText variant="caption">No profit data yet.</AppText>
            ) : (
              data.top_profitable_products.map((p, i) => (
                <View key={`${p.product_name}-${i}`}>
                  {i > 0 ? <View style={styles.sep} /> : null}
                  <KeyValue label={p.product_name} value={inr(p.total_profit)} />
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  bold: { fontWeight: '700' },
  alignEnd: { alignItems: 'flex-end', gap: 4 },
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  rangeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  rangeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  chartCard: { gap: spacing.lg },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 150 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: {
    width: '70%',
    backgroundColor: colors.blueSoft,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barProfit: { width: '100%', backgroundColor: colors.green, borderRadius: radius.sm },
  barLabel: { fontSize: 9 },
  legend: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  listCard: { gap: spacing.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
