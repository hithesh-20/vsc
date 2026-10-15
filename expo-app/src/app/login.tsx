import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, TextField, IconBadge } from '@/components/ui';
import { ApiError, api, getApiBaseUrl, setAuthToken } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, radius, spacing } from '@/lib/theme';
import type { AuthSession } from '@/lib/types';

type Step = 'phone' | 'otp' | 'signup' | 'vendor_fix';

export default function LoginScreen() {
  const { signIn } = useSession();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [requestId, setRequestId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [fullName, setFullName] = useState('');
  const [lang, setLang] = useState<'en' | 'kn'>('en');
  // Held when a verified number already belongs to a Customer account.
  const [pendingSession, setPendingSession] = useState<AuthSession | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fail(err: unknown) {
    setError(err instanceof ApiError ? err.message : 'Unexpected error. Please try again.');
  }

  /**
   * VendorSaathi is a vendor-only app. A verified number that already exists as
   * a Customer is parked on the conversion step instead of being signed in as a
   * customer (which would 403 on every vendor endpoint).
   */
  function adopt(session: AuthSession) {
    if (session.role === 'CUSTOMER') {
      setPendingSession(session);
      setStep('vendor_fix');
      return;
    }
    signIn(session);
  }

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(phone);
      setRequestId(res.request_id);
      setMaskedPhone(res.masked_phone);
      setDemoCode(res.demo_code ?? null);
      setIsNewUser(res.is_new_user);
      setCode('');
      setStep('otp');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.verifyOtp(requestId, code.trim());
      if (res.access_token && res.user_id) {
        adopt(api.sessionFromVerify(res));
      } else {
        setStep('signup');
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      const session = await api.completeSignup(requestId, fullName.trim(), 'VENDOR', lang);
      signIn(session);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function convertVendor() {
    if (!pendingSession) return;
    setBusy(true);
    setError(null);
    try {
      // The token has not been adopted yet, so attach it just for this call.
      setAuthToken(pendingSession.token);
      await api.becomeVendor(fullName.trim() || 'New Vendor Store');
      signIn({ ...pendingSession, role: 'VENDOR' });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  function discardPending() {
    setPendingSession(null);
    setFullName('');
    setError(null);
    setStep('phone');
  }

  async function pinLogin() {
    setBusy(true);
    setError(null);
    try {
      const session = await api.login(phone.trim(), pin.trim());
      adopt(session);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <IconBadge icon="storefront" size={56} />
        <AppText variant="display">VendorSaathi</AppText>
        <AppText variant="caption">ವೆಂಡರ್‌ಸಾಥಿ · Voice Commerce for Street Vendors</AppText>
      </View>

      <Card style={styles.card}>
        {step === 'phone' && (
          <>
            <AppText variant="title">Sign in</AppText>
            <AppText variant="caption">
              Enter your 10-digit mobile number to receive an OTP.
            </AppText>
            <TextField
              label="Mobile number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="98765 43210"
            />
            <Button label="Send OTP" onPress={sendOtp} loading={busy} icon="chatbubble-ellipses" />
          </>
        )}

        {step === 'otp' && (
          <>
            <AppText variant="title">Verify OTP</AppText>
            <AppText variant="caption">A 6-digit code was sent to {maskedPhone || phone}.</AppText>
            {demoCode ? (
              <View style={styles.demoBanner}>
                <Ionicons name="information-circle" size={16} color={colors.blue} />
                <AppText variant="caption" style={styles.demoText}>
                  Demo mode — your OTP is <AppText variant="body" style={styles.demoCode}>{demoCode}</AppText>
                </AppText>
              </View>
            ) : null}
            <TextField
              label="OTP code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />
            <Button label="Verify & continue" onPress={verify} loading={busy} />
            <Button
              label="Change number"
              variant="ghost"
              onPress={() => {
                setStep('phone');
                setError(null);
              }}
            />
          </>
        )}

        {step === 'signup' && (
          <>
            <AppText variant="title">Create your vendor profile</AppText>
            <AppText variant="caption">
              {isNewUser ? 'New number detected. ' : ''}This app is for vendors — tell us about your
              business.
            </AppText>
            <TextField
              label="Full name / Business name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Ramesh Fresh Vegetables"
            />
            <AppText variant="label">Preferred language</AppText>
            <View style={styles.roles}>
              {([['en', 'English'], ['kn', 'ಕನ್ನಡ']] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setLang(value)}
                  style={[styles.roleChip, lang === value && styles.roleChipActive]}>
                  <AppText
                    variant="body"
                    color={lang === value ? colors.primaryDark : colors.textMuted}>
                    {label}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <Button
              label="Create account"
              onPress={complete}
              loading={busy}
              disabled={fullName.trim().length < 2}
            />
          </>
        )}

        {step === 'vendor_fix' && pendingSession && (
          <>
            <AppText variant="title">Vendor account needed</AppText>
            <View style={styles.noticeBox}>
              <Ionicons name="storefront-outline" size={16} color={colors.blue} />
              <AppText variant="caption" style={styles.noticeText}>
                This number is already registered as a <AppText variant="body">Customer</AppText>{' '}
                in the customer app. VendorSaathi is the vendor side, so convert this number to a
                vendor account to continue.
              </AppText>
            </View>
            <TextField
              label="Business name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Afreen Fresh Market"
            />
            <Button
              label="Convert to vendor account"
              onPress={convertVendor}
              loading={busy}
              disabled={fullName.trim().length < 2}
            />
            <Button
              label="Use a different number"
              variant="ghost"
              onPress={discardPending}
              disabled={busy}
            />
          </>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.red} />
            <AppText variant="caption" color={colors.red} style={styles.errorText}>
              {error}
            </AppText>
          </View>
        ) : null}
      </Card>

      {step === 'phone' && (
        <Card style={styles.card}>
          <AppText variant="heading">Sign in with password</AppText>
          <AppText variant="caption">
            Alternatively, sign in with your registered phone number and password.
          </AppText>
          <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="number-pad" />
          <TextField
            label="Password"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <Button label="Login with password" variant="secondary" onPress={pinLogin} loading={busy} />
        </Card>
      )}

      <AppText variant="caption" style={styles.footer}>
        API: {getApiBaseUrl()}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  card: { gap: spacing.md },
  roles: { flexDirection: 'row', gap: spacing.sm },
  roleChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blueSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  noticeText: { flex: 1 },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blueSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  demoText: { flex: 1 },
  demoCode: { fontWeight: '800', letterSpacing: 2 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.redSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: { flex: 1 },
  footer: { textAlign: 'center' },
});
