import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { formatDate, inr } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { CreditScorecard, MandiSummary } from '@/lib/types';
import { useApi } from '@/lib/useApi';

function trendColor(trend: string, change: number): string {
  const t = trend.toLowerCase();
  if (t.includes('up') || t.includes('rise') || change > 0) return colors.green;
  if (t.includes('down') || t.includes('fall') || change < 0) return colors.red;
  return colors.textMuted;
}

export default function MandiScreen() {
  const fetchMandi = useCallback(async () => {
    const [rates, credit] = await Promise.all([api.getMandiRates(), api.getCreditScorecard()]);
    return { rates, credit };
  }, []);

  const { data, loading, refreshing, error, reload, refresh } = useApi<{
    rates: MandiSummary;
    credit: CreditScorecard;
  }>(fetchMandi, []);

  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Loading mandi data…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" title="Couldn't load mandi data" message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen><StateView kind="empty" title="No mandi data" /></Screen>;

  const { rates, credit } = data;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Mandi & Credit"
        subtitle={`${rates.market_name} · ${formatDate(rates.reported_date)}`}
      />

      <Card style={styles.scoreCard}>
        <View style={styles.scoreTop}>
          <View style={styles.flex1}>
            <AppText variant="caption">VendorSaathi Credit Score</AppText>
            <AppText variant="display" style={{ color: colors.primary }}>
              {credit.credit_score}
            </AppText>
            <AppText variant="body">{credit.rating_category}</AppText>
          </View>
          <Pill
            label={credit.interest_subsidy_eligible ? 'Subsidy eligible' : 'Standard'}
            fg={credit.interest_subsidy_eligible ? colors.green : colors.textMuted}
            bg={credit.interest_subsidy_eligible ? colors.greenSoft : colors.surfaceAlt}
            icon="shield-checkmark"
          />
        </View>
        <KeyValue label="Pre-approved loan" value={inr(credit.max_preapproved_loan_amount)} />
        <KeyValue label="Loan tier" value={credit.eligible_svanidhi_loan_tier} />
        <KeyValue label="Scheme" value={credit.scheme_name} />
      </Card>

      <View style={styles.statsRow}>
        <StatCard label="Repayment" value={`${credit.repayment_reliability_pct.toFixed(0)}%`} icon="checkmark-circle" fg={colors.green} bg={colors.greenSoft} />
        <StatCard label="Digital pay" value={`${credit.digital_transaction_ratio_pct.toFixed(0)}%`} icon="phone-portrait" fg={colors.blue} bg={colors.blueSoft} />
      </View>

      {credit.key_strengths_kn.length > 0 ? (
        <Card style={styles.adviceCard}>
          <AppText variant="heading">Strengths</AppText>
          {credit.key_strengths_kn.map((s) => (
            <View key={s} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={15} color={colors.green} />
              <AppText variant="caption" style={styles.flex1}>
                {s}
              </AppText>
            </View>
          ))}
          {credit.improvement_tips_kn.length > 0 ? (
            <>
              <AppText variant="heading" style={styles.gapTop}>
                Improve
              </AppText>
              {credit.improvement_tips_kn.map((s) => (
                <View key={s} style={styles.bulletRow}>
                  <Ionicons name="arrow-up-circle" size={15} color={colors.amber} />
                  <AppText variant="caption" style={styles.flex1}>
                    {s}
                  </AppText>
                </View>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      <SectionHeader title={`Today's rates (${rates.total_commodities_tracked})`} />
      <Card style={styles.adviceCard}>
        <AppText variant="caption" color={colors.purple}>
          {rates.buyer_advisory_en}
        </AppText>
      </Card>

      {rates.commodities.map((c) => {
        const tc = trendColor(c.trend, c.price_change_pct);
        return (
          <Card key={`${c.commodity_name_en}-${c.market_name}`} style={styles.rateCard}>
            <View style={styles.rowBetween}>
              <View style={styles.flex1}>
                <AppText variant="heading">{c.commodity_name_en}</AppText>
                <AppText variant="caption">
                  {c.commodity_name_kn} · {c.category}
                </AppText>
              </View>
              <View style={styles.alignEnd}>
                <AppText variant="heading">{inr(c.modal_price_per_kg)}</AppText>
                <AppText variant="caption">/{c.unit}</AppText>
              </View>
            </View>
            <View style={styles.rateMeta}>
              <Chip label={`Min ${inr(c.min_price_per_kg)}`} />
              <Chip label={`Max ${inr(c.max_price_per_kg)}`} />
              <View style={styles.trendChip}>
                <Ionicons
                  name={c.price_change_pct >= 0 ? 'trending-up' : 'trending-down'}
                  size={13}
                  color={tc}
                />
                <AppText variant="caption" color={tc}>
                  {c.price_change_pct >= 0 ? '+' : ''}
                  {c.price_change_pct.toFixed(1)}%
                </AppText>
              </View>
            </View>
            <View style={styles.retailRow}>
              <Ionicons name="pricetag" size={14} color={colors.primary} />
              <AppText variant="caption" style={styles.flex1}>
                Suggested retail {inr(c.recommended_retail_price)}/{c.unit} ·{' '}
                {c.expected_profit_margin_pct.toFixed(0)}% margin
              </AppText>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  scoreCard: { gap: spacing.sm },
  scoreTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  adviceCard: { gap: spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  gapTop: { marginTop: spacing.sm },
  rateCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rateMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  retailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
