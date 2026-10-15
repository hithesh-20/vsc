import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  PageHeader,
  Pill,
  Screen,
  SectionHeader,
  StateView,
} from '@/components/ui';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { MobilityRecommendations } from '@/lib/types';
import { useApi } from '@/lib/useApi';

function demandColor(level: string): { fg: string; bg: string } {
  const l = level.toLowerCase();
  if (l.includes('high')) return { fg: colors.green, bg: colors.greenSoft };
  if (l.includes('low')) return { fg: colors.textMuted, bg: colors.surfaceAlt };
  return { fg: colors.amber, bg: colors.amberSoft };
}

export default function MobilityScreen() {
  const fetchMobility = useCallback(() => api.getMobilityRecommendations(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<MobilityRecommendations>(
    fetchMobility,
    [],
  );

  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Finding best spots…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" title="Couldn't load mobility" message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen><StateView kind="empty" title="No recommendations" /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader title="Smart Mobility" subtitle={`Category: ${data.vendor_category}`} />

      {data.cluster_warning ? (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={16} color={colors.amber} />
          <AppText variant="caption" color={colors.amber} style={styles.flex1}>
            {data.cluster_warning}
          </AppText>
        </View>
      ) : null}

      <SectionHeader title={`Ranked spots (${data.recommendations.length})`} />
      {data.recommendations.length === 0 ? (
        <StateView kind="empty" title="No spots available right now" />
      ) : (
        data.recommendations.map((rec, index) => {
          const dc = demandColor(rec.demand_level);
          return (
            <Card key={`${rec.location_name}-${index}`} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.rankWrap}>
                  <View style={styles.rankBadge}>
                    <AppText variant="heading" color={colors.primaryDark}>
                      {index + 1}
                    </AppText>
                  </View>
                  <View style={styles.flex1}>
                    <AppText variant="heading">{rec.location_name}</AppText>
                    <AppText variant="caption">
                      {rec.location_name_kn} · {rec.distance_km.toFixed(1)} km away
                    </AppText>
                  </View>
                </View>
                <Pill label={`${rec.demand_level}`} fg={dc.fg} bg={dc.bg} />
              </View>

              <View style={styles.metricsRow}>
                <Metric icon="star" label="Score" value={rec.score.toFixed(1)} />
                <Metric icon="people" label="Footfall" value={rec.expected_customers_density} />
                <Metric icon="storefront" label="Rivals" value={String(rec.active_competitors_count)} />
              </View>

              <View style={styles.turnoverRow}>
                <Ionicons name="cash" size={15} color={colors.green} />
                <AppText variant="body" style={styles.flex1}>
                  Est. turnover {inr(rec.estimated_turnover_inr)}
                </AppText>
                {rec.cannibalization_risk_percent > 0 ? (
                  <AppText variant="caption" color={colors.red}>
                    {rec.cannibalization_risk_percent.toFixed(0)}% overlap risk
                  </AppText>
                ) : null}
              </View>

              <AppText variant="caption">{rec.recommendation_reason}</AppText>
              <AppText variant="caption" color={colors.textFaint}>
                {rec.recommendation_reason_kn}
              </AppText>

              {rec.high_demand_products.length > 0 ? (
                <View style={styles.tagRow}>
                  <AppText variant="caption" color={colors.green}>
                    In demand:
                  </AppText>
                  {rec.high_demand_products.slice(0, 4).map((p) => (
                    <Pill key={p} label={p} fg={colors.green} bg={colors.greenSoft} />
                  ))}
                </View>
              ) : null}

              <View style={styles.cardActions}>
                <Pill
                  label={rec.route_strategy.replace(/_/g, ' ')}
                  fg={colors.purple}
                  bg={colors.purpleSoft}
                  icon="git-branch"
                />
                {rec.google_maps_url ? (
                  <Button
                    label="Navigate"
                    icon="navigate"
                    variant="secondary"
                    onPress={() => Linking.openURL(rec.google_maps_url)}
                    style={styles.navBtn}
                  />
                ) : (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${rec.latitude},${rec.longitude}`,
                      )
                    }
                    style={styles.navBtn}>
                    <Ionicons name="navigate" size={16} color={colors.primaryDark} />
                    <AppText variant="label" color={colors.primaryDark}>
                      Maps
                    </AppText>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function Metric({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body" style={styles.metricValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  card: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rankWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
  metricValue: { fontWeight: '700', fontSize: 13 },
  turnoverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xs },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, minHeight: 40 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
