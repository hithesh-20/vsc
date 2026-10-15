import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  KeyValue,
  PageHeader,
  Pill,
  Screen,
  SectionHeader,
  StateView,
  TextField,
} from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';
import type { VendorProfile } from '@/lib/types';
import { useApi } from '@/lib/useApi';

export default function ProfileScreen() {
  const fetchProfile = useCallback(() => api.getVendorProfile(), []);
  const { data: profile, loading, refreshing, error, reload, refresh } = useApi<VendorProfile>(
    fetchProfile,
    [],
  );

  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Loading profile…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" title="Couldn't load profile" message={error} onRetry={reload} /></Screen>;
  if (!profile) return <Screen><StateView kind="empty" title="No profile" /></Screen>;

  return (
    <ProfileEditor
      key={profile.id}
      profile={profile}
      refreshing={refreshing}
      onRefresh={refresh}
      onSaved={reload}
    />
  );
}

function ProfileEditor({
  profile,
  refreshing,
  onRefresh,
  onSaved,
}: {
  profile: VendorProfile;
  refreshing: boolean;
  onRefresh: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    business_name: profile.business_name,
    business_name_kn: profile.business_name_kn ?? '',
    business_category: profile.business_category,
    operating_location: profile.operating_location,
    operating_radius_km: String(profile.operating_radius_km),
    working_hours: profile.working_hours,
    upi_id: profile.upi_id ?? '',
    is_accepting_orders: profile.is_accepting_orders,
    is_active: profile.is_active,
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setBusy(true);
    setFeedback(null);
    try {
      await api.updateVendorProfile({
        business_name: form.business_name.trim(),
        business_name_kn: form.business_name_kn.trim() || null,
        business_category: form.business_category.trim(),
        operating_location: form.operating_location.trim(),
        operating_radius_km: Number.parseFloat(form.operating_radius_km) || 0,
        working_hours: form.working_hours.trim(),
        upi_id: form.upi_id.trim() || null,
        is_accepting_orders: form.is_accepting_orders,
        is_active: form.is_active,
      });
      setFeedback({ type: 'ok', text: 'Profile updated.' });
      onSaved();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Could not update the profile.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        title={profile.business_name}
        subtitle={profile.business_name_kn ?? profile.business_category}
        right={
          <Pill
            label={profile.is_active ? 'Active' : 'Inactive'}
            fg={profile.is_active ? colors.green : colors.textMuted}
            bg={profile.is_active ? colors.greenSoft : colors.surfaceAlt}
          />
        }
      />

      <Card style={styles.statsCard}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color={colors.amber} />
          <AppText variant="heading">{profile.rating_avg.toFixed(1)}</AppText>
          <AppText variant="caption">({profile.rating_count} ratings)</AppText>
        </View>
        <KeyValue label="Category" value={profile.business_category} />
        <KeyValue label="Location" value={profile.operating_location} />
        <KeyValue label="Radius" value={`${profile.operating_radius_km} km`} />
        <KeyValue label="Hours" value={profile.working_hours} />
        {profile.current_lat != null && profile.current_lon != null ? (
          <KeyValue
            label="Coordinates"
            value={`${profile.current_lat.toFixed(4)}, ${profile.current_lon.toFixed(4)}`}
          />
        ) : null}
      </Card>

      <SectionHeader title="Edit business details" />
      <Card style={styles.formCard}>
        <TextField label="Business name" value={form.business_name} onChangeText={(v) => set('business_name', v)} />
        <TextField label="Business name (Kannada)" value={form.business_name_kn} onChangeText={(v) => set('business_name_kn', v)} />
        <TextField label="Category" value={form.business_category} onChangeText={(v) => set('business_category', v)} />
        <TextField label="Operating location" value={form.operating_location} onChangeText={(v) => set('operating_location', v)} />
        <View style={styles.twoCols}>
          <TextField label="Radius (km)" value={form.operating_radius_km} onChangeText={(v) => set('operating_radius_km', v)} keyboardType="decimal-pad" style={styles.flex1} />
          <TextField label="Working hours" value={form.working_hours} onChangeText={(v) => set('working_hours', v)} style={styles.flex1} />
        </View>
        <TextField label="UPI ID" value={form.upi_id} onChangeText={(v) => set('upi_id', v)} placeholder="name@upi" autoCapitalize="none" />

        <View style={styles.switchRow}>
          <View style={styles.flex1}>
            <AppText variant="body">Accepting orders</AppText>
            <AppText variant="caption">Toggle whether new orders are allowed</AppText>
          </View>
          <Switch
            value={form.is_accepting_orders}
            onValueChange={(v) => set('is_accepting_orders', v)}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.flex1}>
            <AppText variant="body">Shop active</AppText>
            <AppText variant="caption">Mark the shop as open/operational</AppText>
          </View>
          <Switch
            value={form.is_active}
            onValueChange={(v) => set('is_active', v)}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

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

        <Button label="Save changes" onPress={save} loading={busy} disabled={form.business_name.trim().length < 2} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statsCard: { gap: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  formCard: { gap: spacing.md },
  twoCols: { flexDirection: 'row', gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.greenSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  feedbackErr: { backgroundColor: colors.redSoft },
});
