import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  IconBadge,
  PageHeader,
  Screen,
  SectionHeader,
  StateView,
  StatCard,
} from '@/components/ui';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors, radius, spacing } from '@/lib/theme';
import { useApi } from '@/lib/useApi';
import type { DashboardSummary, VendorProfile } from '@/lib/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const SHORTCUTS: { label: string; route: string; icon: IoniconName; fg: string; bg: string }[] = [
  { label: 'Udhaar', route: '/udhaar', icon: 'book', fg: colors.primary, bg: colors.primarySoft },
  { label: 'Analytics', route: '/analytics', icon: 'stats-chart', fg: colors.green, bg: colors.greenSoft },
  { label: 'Mandi Rates', route: '/mandi', icon: 'pricetags', fg: colors.purple, bg: colors.purpleSoft },
  { label: 'Weather', route: '/weather', icon: 'partly-sunny', fg: colors.blue, bg: colors.blueSoft },
  { label: 'Mobility', route: '/mobility', icon: 'navigate', fg: colors.primary, bg: colors.primarySoft },
  { label: 'Profile', route: '/profile', icon: 'storefront', fg: colors.textMuted, bg: colors.surfaceAlt },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const isVendor = session?.role === 'VENDOR';

  const fetchDashboard = useCallback(async () => {
    const [summary, profile] = await Promise.all([
      api.getDashboard(),
      api.getVendorProfile(),
    ]);
    return { summary, profile };
  }, []);

  const { data, loading, refreshing, error, reload, refresh } = useApi<
    { summary: DashboardSummary; profile: VendorProfile }
  >(fetchDashboard, [isVendor]);

  if (!isVendor) {
    return (
      <Screen contentStyle={styles.centered}>
        <StateView
          kind="empty"
          title="Vendor account required"
          message="This app is the VendorSaathi vendor console. Please sign in with a vendor account."
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <StateView kind="loading" title="Loading dashboard…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <StateView kind="error" title="Couldn't load dashboard" message={error} onRetry={reload} />
      </Screen>
    );
  }

  const summary = data?.summary;
  const profile = data?.profile;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title={`Namaskara${profile ? `, ${profile.business_name.split(' ')[0]}` : ''}`}
        subtitle={profile?.operating_location ?? 'Vendor Console'}
        right={
          <Pressable onPress={signOut} hitSlop={10} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
          </Pressable>
        }
      />

      <View style={styles.statsRow}>
        <StatCard
          label="Today Sales"
          value={inr(summary?.today_sales_revenue)}
          hint={`${summary?.today_sales_count ?? 0} orders`}
          icon="cash"
          fg={colors.green}
          bg={colors.greenSoft}
        />
        <StatCard
          label="Net Profit"
          value={inr(summary?.today_net_profit)}
          icon="trending-up"
          fg={colors.primary}
          bg={colors.primarySoft}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Pending Orders"
          value={String(summary?.pending_orders_count ?? 0)}
          icon="time"
          fg={colors.blue}
          bg={colors.blueSoft}
        />
        <StatCard
          label="Udhaar Due"
          value={inr(summary?.total_udhaar_outstanding)}
          icon="book"
          fg={colors.red}
          bg={colors.redSoft}
        />
      </View>

      <Card style={styles.weatherCard}>
        <View style={styles.rowBetween}>
          <View style={styles.weatherLeft}>
            <IconBadge icon="partly-sunny" fg={colors.blue} bg={colors.blueSoft} size={40} />
            <View>
              <AppText variant="heading">Weather Today</AppText>
              <AppText variant="caption">{summary?.weather_summary ?? '—'}</AppText>
            </View>
          </View>
          <Pressable onPress={() => router.push('/weather')} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
          </Pressable>
        </View>
        {summary?.weather_warning ? (
          <View style={styles.warningBox}>
            <Ionicons name="rainy" size={16} color={colors.amber} />
            <AppText variant="caption" color={colors.amber} style={styles.flex1}>
              {summary.weather_warning}
            </AppText>
          </View>
        ) : null}
        <View style={styles.aiBox}>
          <Ionicons name="sparkles" size={16} color={colors.purple} />
          <AppText variant="caption" color={colors.purple} style={styles.flex1}>
            {summary?.ai_recommendation_short ?? 'No recommendation yet.'}
          </AppText>
        </View>
      </Card>

      {(summary?.low_stock_items_count ?? 0) > 0 ? (
        <Pressable onPress={() => router.push('/inventory')}>
          <Card style={styles.alertCard}>
            <Ionicons name="warning" size={20} color={colors.red} />
            <AppText variant="body" style={styles.flex1}>
              {summary?.low_stock_items_count} item(s) running low — restock soon.
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Card>
        </Pressable>
      ) : null}

      <SectionHeader title="Modules" />
      <View style={styles.grid}>
        {SHORTCUTS.map((item) => (
          <Pressable key={item.route} style={styles.gridItem} onPress={() => router.push(item.route as never)}>
            <Card style={styles.gridCard}>
              <IconBadge icon={item.icon} fg={item.fg} bg={item.bg} size={44} />
              <AppText variant="label" style={styles.gridLabel}>
                {item.label}
              </AppText>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: 'center' },
  flex1: { flex: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  weatherCard: { gap: spacing.md },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  aiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.purpleSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '31%', minWidth: 100, flexGrow: 1 },
  gridCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  gridLabel: { textAlign: 'center' },
});
