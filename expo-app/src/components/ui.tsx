import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const textStyles: Record<TextVariant, TextStyle> = {
  display: { fontSize: 26, fontWeight: '800', color: colors.text },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
};

export function AppText({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: PropsWithChildren<{
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}>) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[textStyles[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  edges = ['top', 'left', 'right'],
}: PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}>) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {action}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderText}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IoniconName;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.white },
    secondary: { bg: colors.primarySoft, fg: colors.primaryDark },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
    danger: { bg: colors.redSoft, fg: colors.red },
  };
  const p = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: p.bg, borderColor: p.border ?? 'transparent', borderWidth: p.border ? 1 : 0 },
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={p.fg} /> : null}
          <Text style={[styles.buttonLabel, { color: p.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  hint,
  style,
  ...props
}: TextInputProps & { label?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={styles.field}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, style]}
        {...props}
      />
      {hint ? (
        <AppText variant="caption" style={styles.fieldHint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function Pill({
  label,
  fg,
  bg,
  icon,
}: {
  label: string;
  fg: string;
  bg: string;
  icon?: IoniconName;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.pillLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function IconBadge({
  icon,
  fg = colors.primary,
  bg = colors.primarySoft,
  size = 40,
}: {
  icon: IoniconName;
  fg?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.iconBadge,
        { backgroundColor: bg, width: size, height: size, borderRadius: size / 3 },
      ]}>
      <Ionicons name={icon} size={size * 0.5} color={fg} />
    </View>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  fg = colors.primary,
  bg = colors.primarySoft,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IoniconName;
  fg?: string;
  bg?: string;
}) {
  return (
    <Card style={styles.statCard}>
      <IconBadge icon={icon} fg={fg} bg={bg} size={36} />
      <AppText variant="caption" style={styles.statLabel}>
        {label}
      </AppText>
      <AppText variant="title" style={{ color: fg }}>
        {value}
      </AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </Card>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValue}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body" style={styles.keyValueValue}>
        {value}
      </AppText>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

// ---------------------------------------------------------------------------
// Async states
// ---------------------------------------------------------------------------

export function StateView({
  kind,
  title,
  message,
  onRetry,
  action,
}: {
  kind: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  if (kind === 'loading') {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="caption" style={styles.stateText}>
          {title ?? 'Loading…'}
        </AppText>
      </View>
    );
  }

  const isError = kind === 'error';
  return (
    <View style={styles.stateContainer}>
      <Ionicons
        name={isError ? 'cloud-offline-outline' : 'file-tray-outline'}
        size={44}
        color={isError ? colors.red : colors.textFaint}
      />
      <AppText variant="heading" style={styles.stateText}>
        {title ?? (isError ? 'Something went wrong' : 'Nothing here yet')}
      </AppText>
      {message ? (
        <AppText variant="caption" style={[styles.stateText, styles.stateMessage]}>
          {message}
        </AppText>
      ) : null}
      {isError && onRetry ? (
        <Button label="Try again" onPress={onRetry} variant="secondary" icon="refresh" style={styles.stateButton} />
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pageHeaderText: { flexShrink: 1, gap: 2 },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minHeight: 48,
  },
  buttonDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  buttonLabel: { fontSize: 15, fontWeight: '700' },

  field: { gap: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  fieldHint: { marginTop: 2 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillLabel: { fontSize: 11, fontWeight: '700' },

  iconBadge: { alignItems: 'center', justifyContent: 'center' },

  statCard: { flex: 1, gap: spacing.xs, minHeight: 120 },
  statLabel: { textTransform: 'uppercase', letterSpacing: 0.4 },

  keyValue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: spacing.md },
  keyValueValue: { fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },

  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    minHeight: 260,
  },
  stateText: { textAlign: 'center' },
  stateMessage: { maxWidth: 320 },
  stateButton: { marginTop: spacing.sm },
});
