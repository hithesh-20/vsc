import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, IconBadge, PageHeader, Screen } from '@/components/ui';
import { ApiError, api, getApiBaseUrl } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const LINKS: { label: string; desc: string; route: string; icon: IoniconName; fg: string; bg: string }[] = [
  { label: 'Udhaar Ledger', desc: 'Credit given & repayments', route: '/udhaar', icon: 'book', fg: colors.primary, bg: colors.primarySoft },
  { label: 'Profit Analytics', desc: 'Revenue, margins & trends', route: '/analytics', icon: 'stats-chart', fg: colors.green, bg: colors.greenSoft },
  { label: 'Mandi & Credit', desc: 'APMC rates & loan score', route: '/mandi', icon: 'pricetags', fg: colors.purple, bg: colors.purpleSoft },
  { label: 'Weather & Demand', desc: 'Forecast & stock advice', route: '/weather', icon: 'partly-sunny', fg: colors.blue, bg: colors.blueSoft },
  { label: 'Smart Mobility', desc: 'Best spots & routing', route: '/mobility', icon: 'navigate', fg: colors.primary, bg: colors.primarySoft },
  { label: 'Business Profile', desc: 'Shop details & settings', route: '/profile', icon: 'storefront', fg: colors.textMuted, bg: colors.surfaceAlt },
];

export default function MoreScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [health, setHealth] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await api.health();
      setHealth(res.db ? `Backend healthy (${res.status})` : `Backend reachable, DB ${res.status}`);
    } catch (err) {
      setHealth(err instanceof ApiError ? err.message : 'Backend unreachable.');
    } finally {
      setChecking(false);
    }
  }, []);

  return (
    <Screen>
      <PageHeader title="More" subtitle={session?.name ?? 'Vendor console'} />

      <Card style={styles.profileCard}>
        <IconBadge icon="person-circle" size={48} fg={colors.primary} bg={colors.primarySoft} />
        <View style={styles.flex1}>
          <AppText variant="heading">{session?.name ?? 'Vendor'}</AppText>
          <AppText variant="caption">
            {session?.role ?? '—'}
            {session?.languagePref ? ` · ${session.languagePref.toUpperCase()}` : ''}
          </AppText>
        </View>
      </Card>

      {LINKS.map((link) => (
        <Pressable key={link.route} onPress={() => router.push(link.route as never)}>
          <Card style={styles.linkCard}>
            <IconBadge icon={link.icon} fg={link.fg} bg={link.bg} size={42} />
            <View style={styles.flex1}>
              <AppText variant="heading">{link.label}</AppText>
              <AppText variant="caption">{link.desc}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
          </Card>
        </Pressable>
      ))}

      <Card style={styles.connCard}>
        <AppText variant="heading">Connection</AppText>
        <AppText variant="caption">API: {getApiBaseUrl()}</AppText>
        {health ? <AppText variant="body">{health}</AppText> : null}
        <Button
          label="Test backend connection"
          variant="secondary"
          icon="pulse"
          onPress={checkHealth}
          loading={checking}
        />
      </Card>

      <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  connCard: { gap: spacing.sm },
});
