import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  PageHeader,
  Pill,
  Screen,
  SectionHeader,
  StateView,
  StatCard,
  TextField,
} from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { formatDate, inr, titleCase, udhaarStatusColor } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { UdhaarSummary } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type ModalKind = 'new' | { repayId: string; remaining: number; name: string } | null;

export default function UdhaarScreen() {
  const fetchUdhaar = useCallback(() => api.getUdhaar(), []);
  const { data, loading, refreshing, error, reload, refresh } = useApi<UdhaarSummary>(
    fetchUdhaar,
    [],
  );

  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [payMode, setPayMode] = useState<'CASH' | 'UPI'>('CASH');

  function openNew() {
    setName('');
    setPhone('');
    setAmount('');
    setNotes('');
    setFormError(null);
    setModal('new');
  }

  function openRepay(id: string, remaining: number, customerName: string) {
    setRepayAmount(String(remaining));
    setPayMode('CASH');
    setFormError(null);
    setModal({ repayId: id, remaining, name: customerName });
  }

  async function create() {
    setBusy(true);
    setFormError(null);
    try {
      await api.createUdhaar({
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        amount_due: Number.parseFloat(amount) || 0,
        notes: notes.trim() || null,
      });
      setModal(null);
      setFeedback('Udhaar entry added.');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save the entry.');
    } finally {
      setBusy(false);
    }
  }

  async function repay() {
    if (!modal || modal === 'new') return;
    setBusy(true);
    setFormError(null);
    try {
      await api.repayUdhaar(modal.repayId, Number.parseFloat(repayAmount) || 0, payMode);
      setModal(null);
      setFeedback('Repayment recorded.');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not record the repayment.');
    } finally {
      setBusy(false);
    }
  }

  async function remind(id: string) {
    try {
      await api.sendUdhaarReminder(id);
      setFeedback('Reminder sent.');
      reload();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Could not send the reminder.');
    }
  }

  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Loading udhaar…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" title="Couldn't load udhaar" message={error} onRetry={reload} /></Screen>;

  const records = data?.records ?? [];
  const isNew = modal === 'new';
  const repayTarget = isNew || modal === null ? null : modal;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Udhaar"
        subtitle="Customer credit ledger"
        right={<Button label="Add" icon="add" onPress={openNew} style={styles.addBtn} />}
      />

      <View style={styles.statsRow}>
        <StatCard
          label="Outstanding"
          value={inr(data?.total_outstanding_udhaar)}
          icon="wallet"
          fg={colors.red}
          bg={colors.redSoft}
        />
        <StatCard
          label="Repaid"
          value={inr(data?.total_repaid_udhaar)}
          icon="checkmark-done"
          fg={colors.green}
          bg={colors.greenSoft}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Debtors" value={String(data?.total_debtors_count ?? 0)} icon="people" fg={colors.blue} bg={colors.blueSoft} />
        <StatCard label="Unpaid" value={String(data?.unpaid_accounts_count ?? 0)} icon="alert-circle" fg={colors.amber} bg={colors.amberSoft} />
      </View>

      {feedback ? (
        <View style={styles.feedback}>
          <Ionicons name="information-circle" size={16} color={colors.blue} />
          <AppText variant="caption" color={colors.blue} style={styles.flex1}>
            {feedback}
          </AppText>
        </View>
      ) : null}

      <SectionHeader title="Ledger" />
      {records.length === 0 ? (
        <StateView kind="empty" title="No udhaar records" message="Credit you extend will be listed here." />
      ) : (
        records.map((record) => {
          const sc = udhaarStatusColor(record.status);
          const settled = record.status === 'SETTLED';
          return (
            <Card key={record.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <AppText variant="heading">{record.customer_name}</AppText>
                  <AppText variant="caption">
                    {record.customer_phone ?? 'No phone'} · {formatDate(record.created_at)}
                  </AppText>
                </View>
                <Pill label={titleCase(record.status)} fg={sc.fg} bg={sc.bg} />
              </View>

              <View style={styles.amountRow}>
                <Amount label="Due" value={inr(record.amount_due)} />
                <Amount label="Paid" value={inr(record.amount_paid)} />
                <Amount label="Balance" value={inr(record.remaining_balance)} highlight />
              </View>

              {record.notes ? <AppText variant="caption">{record.notes}</AppText> : null}

              {!settled ? (
                <View style={styles.actions}>
                  <Button
                    label="Repay"
                    icon="cash-outline"
                    onPress={() => openRepay(record.id, record.remaining_balance, record.customer_name)}
                    style={styles.flex1}
                  />
                  <Button
                    label="Remind"
                    variant="secondary"
                    icon="notifications-outline"
                    onPress={() => remind(record.id)}
                    style={styles.flex1}
                  />
                </View>
              ) : (
                <AppText variant="caption" color={colors.green}>
                  Fully settled
                </AppText>
              )}
            </Card>
          );
        })
      )}

      <Modal visible={modal !== null} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <AppText variant="title">
                {isNew ? 'New udhaar entry' : `Repay — ${repayTarget?.name ?? ''}`}
              </AppText>

              {isNew ? (
                <>
                  <TextField label="Customer name" value={name} onChangeText={setName} placeholder="e.g. Lakshmi" />
                  <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  <TextField label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
                  <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. Purchased on credit" />
                </>
              ) : (
                <>
                  <AppText variant="caption">
                    Balance due: {inr(repayTarget?.remaining ?? 0)}
                  </AppText>
                  <TextField label="Amount paid (₹)" value={repayAmount} onChangeText={setRepayAmount} keyboardType="decimal-pad" />
                  <AppText variant="label">Payment mode</AppText>
                  <View style={styles.chips}>
                    {(['CASH', 'UPI'] as const).map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setPayMode(m)}
                        style={[styles.chip, payMode === m && styles.chipActive]}>
                        <AppText variant="label" color={payMode === m ? colors.primaryDark : colors.textMuted}>
                          {m}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.red} />
                  <AppText variant="caption" color={colors.red} style={styles.flex1}>
                    {formError}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Button label="Cancel" variant="ghost" onPress={() => setModal(null)} style={styles.flex1} />
                <Button
                  label={isNew ? 'Save' : 'Confirm'}
                  onPress={isNew ? create : repay}
                  loading={busy}
                  disabled={isNew ? name.trim().length < 2 : repayAmount.trim().length === 0}
                  style={styles.flex1}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Amount({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.amount}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body" style={[styles.amountValue, highlight && { color: colors.red }]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  addBtn: { paddingVertical: 10, minHeight: 40 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  card: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  amountRow: { flexDirection: 'row', gap: spacing.md },
  amount: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  amountValue: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.md },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blueSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%' },
  modalContent: { padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.redSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
