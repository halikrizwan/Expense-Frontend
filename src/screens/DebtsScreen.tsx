import dayjs from 'dayjs';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppInput, AppModal, AppSelect, AppText, Chip, EmptyState, Loading, SegmentedTabs } from '../components';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';
import { colors, radius, spacing } from '../constants/theme';
import { useDebts } from '../hooks/useDebts';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { exportDebtSummaryToExcel } from '../services/exportService';
import { Debt, DebtDirection } from '../types/entities';
import { formatCurrency, formatDate } from '../utils/format';
import { subscribeRefresh } from '../services/refreshBus';

interface DebtFormState {
  id?: string;
  personId: string;
  direction: DebtDirection;
  amount: string;
  note: string;
  date: Date;
  dueDate: Date;
}

const defaultDebtForm: DebtFormState = { personId: '', direction: 'i_owe', amount: '', note: '', date: new Date(), dueDate: new Date() };

const DebtRow = memo(({
  item,
  personName,
  currency,
  onPay,
  onEdit,
  onDelete,
}: {
  item: Debt;
  personName: string;
  currency: string;
  onPay: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debtId: string) => void;
}) => (
  <Animated.View entering={FadeInDown.duration(320)} style={styles.debtRow}>
    <View style={styles.rowTop}>
      <View style={styles.personWrap}>
        <View style={[styles.personIcon, item.direction === 'i_owe' ? styles.warnBg : styles.primaryBg]}>
          <Icon name={item.direction === 'i_owe' ? 'arrow-up-bold' : 'arrow-down-bold'} size={13} color={item.direction === 'i_owe' ? colors.warning : colors.primary} />
        </View>
        <View>
          <AppText variant="bodyStrong">{personName}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>{item.direction === 'i_owe' ? 'I owe' : 'Owed to me'} • {item.status}</AppText>
        </View>
      </View>
      <AppText variant="bodyStrong" color={item.direction === 'i_owe' ? colors.warning : colors.primary}>{formatCurrency(item.remainingAmount, currency)}</AppText>
    </View>
    <View style={styles.rowActions}>
      <Icon name="pencil-outline" size={18} color={colors.primary} onPress={() => onEdit(item)} />
      <Icon name="trash-can-outline" size={18} color={colors.danger} onPress={() => onDelete(item.id)} />
    </View>
    <AppText variant="caption" color={colors.textSecondary}>Original {formatCurrency(item.originalAmount, currency)} • {formatDate(item.date)}</AppText>
    <AppText variant="caption" color={colors.textSecondary}>
      {item.direction === 'i_owe' ? 'Pay back by' : 'Expected by'} {formatDate(item.dueDate || item.date)}
    </AppText>
    {item.status === 'open' ? <AppButton title="Add Payment" iconName="cash-plus" variant="outline" onPress={() => onPay(item)} /> : null}
  </Animated.View>
));

export const DebtsScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useAppTheme();
  const { alert, confirm } = useAppAlert();
  const { people, debts, peopleMap, loading, refresh, addNewPerson, addNewDebt, updateExistingDebt, removeDebt, addPayment } = useDebts();
  const { currency } = useSettingsCurrency();

  const [personModal, setPersonModal] = useState(false);
  const [debtModal, setDebtModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [personName, setPersonName] = useState('');
  const [debtForm, setDebtForm] = useState<DebtFormState>(defaultDebtForm);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentNote, setPaymentNote] = useState('');
  const [activeDebtId, setActiveDebtId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [exportingDebt, setExportingDebt] = useState(false);

  const activeDebt = useMemo(() => debts.find(d => d.id === activeDebtId), [activeDebtId, debts]);
  const totals = useMemo(() => ({
    owe: debts.filter(d => d.direction === 'i_owe' && d.status === 'open').reduce((s, d) => s + d.remainingAmount, 0),
    owed: debts.filter(d => d.direction === 'owed_to_me' && d.status === 'open').reduce((s, d) => s + d.remainingAmount, 0),
  }), [debts]);

  const onAddDebt = async () => {
    if (!debtForm.personId) return alert('Validation', 'Please select a person.', 'warning');
    const amount = Number(debtForm.amount);
    if (!amount || amount <= 0) return alert('Validation', 'Amount must be greater than zero.', 'warning');

    try {
      if (debtForm.id) {
        await updateExistingDebt({
          id: debtForm.id,
          personId: debtForm.personId,
          direction: debtForm.direction,
          originalAmount: amount,
          note: debtForm.note.trim(),
          date: dayjs(debtForm.date).format('YYYY-MM-DD'),
          dueDate: dayjs(debtForm.dueDate).format('YYYY-MM-DD'),
        });
      } else {
        await addNewDebt({
          personId: debtForm.personId,
          direction: debtForm.direction,
          originalAmount: amount,
          note: debtForm.note.trim(),
          date: dayjs(debtForm.date).format('YYYY-MM-DD'),
          dueDate: dayjs(debtForm.dueDate).format('YYYY-MM-DD'),
        });
      }
      setDebtForm(defaultDebtForm);
      setDebtModal(false);
    } catch {
      await alert('Error', 'Could not save debt.', 'error');
    }
  };

  const renderItem: ListRenderItem<Debt> = ({ item }) => <DebtRow
    item={item}
    personName={peopleMap[item.personId]?.name || 'Unknown'}
    currency={currency}
    onPay={(debt) => {
      setActiveDebtId(debt.id);
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentDate(new Date());
      setPaymentModal(true);
    }}
    onEdit={debt => {
      setDebtForm({
        id: debt.id,
        personId: debt.personId,
        direction: debt.direction,
        amount: String(debt.originalAmount),
        note: debt.note,
        date: new Date(debt.date),
        dueDate: debt.dueDate ? new Date(debt.dueDate) : new Date(debt.date),
      });
      setDebtModal(true);
    }}
    onDelete={debtId => {
      confirm('Delete debt?', 'This will also remove related debt payments.', 'Delete', 'Cancel')
        .then(async confirmed => {
          if (!confirmed) return;
          try {
            await removeDebt(debtId);
          } catch {
            await alert('Error', 'Could not delete debt.', 'error');
          }
        });
    }}
  />;

  const onExportDebtSummary = async () => {
    if (exportingDebt) return;
    setExportingDebt(true);
    try {
      await exportDebtSummaryToExcel();
      await alert('Success', 'Debt summary Excel exported.', 'success');
    } catch (error) {
      await alert('Error', error instanceof Error ? error.message : 'Could not export debt summary.', 'error');
    } finally {
      setExportingDebt(false);
    }
  };

  useEffect(() => subscribeRefresh('debts', refresh), [refresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, backgroundColor: themeColors.background }]}>
      <FlatList
        data={debts}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        initialNumToRender={8}
        windowSize={7}
        ListHeaderComponent={<View style={styles.listHeader}>
          <AnimatedSection><AppHeader title="Debts" subtitle="Simple people-based tracking" right={<View style={styles.headerActions}>
            <AppButton title="Add Debt" iconName="plus" variant="secondary" onPress={() => {
              setDebtForm(defaultDebtForm);
              setDebtModal(true);
            }} />
            <Pressable
              onPress={onExportDebtSummary}
              style={[styles.excelBtn, exportingDebt && styles.excelBtnDisabled]}>
              <Icon name="file-excel-box-outline" size={20} color="#FFF" />
            </Pressable>
          </View>} /></AnimatedSection>
          <AnimatedSection delay={60} style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.secondary }]}>
              <AppText variant="label" color="#FFF2EA">I Owe</AppText>
              <AppText variant="heading" color="#FFF">{formatCurrency(totals.owe, currency)}</AppText>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
              <AppText variant="label" color="#F3EDFF">Owed To Me</AppText>
              <AppText variant="heading" color="#FFF">{formatCurrency(totals.owed, currency)}</AppText>
            </View>
          </AnimatedSection>

          <AnimatedSection delay={120}><AppCard>
            <View style={styles.personHeader}>
              <AppText variant="heading">People</AppText>
              <Icon name="account-plus-outline" size={20} color={colors.primary} onPress={() => setPersonModal(true)} />
            </View>
            <View style={styles.peopleWrap}>{people.map(p => <Chip key={p.id} label={p.name} onPress={() => undefined} />)}</View>
          </AppCard></AnimatedSection>
        </View>}
        ListEmptyComponent={loading ? <Loading label="Loading debts..." /> : <EmptyState title="No debts yet" description="Add a person and create your first debt." />}
        contentContainerStyle={styles.content}
      />

      <AppModal visible={personModal} title="Add Person" onClose={() => setPersonModal(false)}>
        <View style={styles.modalBody}>
          <AppInput label="Name" value={personName} onChangeText={setPersonName} placeholder="Person name" />
          <AppButton title="Save Person" iconName="content-save-outline" onPress={async () => {
            if (!personName.trim()) return;
            try { await addNewPerson(personName.trim()); setPersonName(''); setPersonModal(false); } catch { await alert('Error', 'Could not add person.', 'error'); }
          }} />
        </View>
      </AppModal>

      <AppModal visible={debtModal} title="Add Debt" onClose={() => setDebtModal(false)}>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <SegmentedTabs items={[{ key: 'i_owe', label: 'I Owe' }, { key: 'owed_to_me', label: 'Owed To Me' }]} value={debtForm.direction} onChange={v => setDebtForm(c => ({ ...c, direction: v as DebtDirection }))} />
          <AppSelect
            label="Select Person"
            value={debtForm.personId}
            items={people.map(person => ({ label: person.name, value: person.id }))}
            onValueChange={value => setDebtForm(c => ({ ...c, personId: value }))}
            placeholder="Select person"
          />
          <AppInput label="Amount" keyboardType="decimal-pad" value={debtForm.amount} onChangeText={v => setDebtForm(c => ({ ...c, amount: v }))} placeholder="0.00" />
          <AppInput label="Note" value={debtForm.note} onChangeText={v => setDebtForm(c => ({ ...c, note: v }))} placeholder="Optional" />
          <AppButton title={`Date: ${formatDate(debtForm.date)}`} iconName="calendar" variant="outline" onPress={() => setShowDatePicker(true)} />
          {showDatePicker ? <DateTimePicker mode="date" display="default" value={debtForm.date} onChange={(_, d) => { setShowDatePicker(false); if (d) setDebtForm(c => ({ ...c, date: d })); }} /> : null}
          <AppButton
            title={`${debtForm.direction === 'i_owe' ? 'Payback Date' : 'Expected Payment Date'}: ${formatDate(debtForm.dueDate)}`}
            iconName="calendar-clock"
            variant="outline"
            onPress={() => setShowDueDatePicker(true)}
          />
          {showDueDatePicker ? <DateTimePicker mode="date" display="default" value={debtForm.dueDate} onChange={(_, d) => { setShowDueDatePicker(false); if (d) setDebtForm(c => ({ ...c, dueDate: d })); }} /> : null}
          <AppButton title={debtForm.id ? 'Update Debt' : 'Save Debt'} iconName="content-save-outline" onPress={onAddDebt} />
        </ScrollView>
      </AppModal>

      <AppModal visible={paymentModal} title="Add Payment" onClose={() => setPaymentModal(false)}>
        <View style={styles.modalBody}>
          <AppText variant="label" color={colors.textSecondary}>Remaining: {formatCurrency(activeDebt?.remainingAmount || 0, currency)}</AppText>
          <AppInput label="Payment Amount" keyboardType="decimal-pad" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="0.00" />
          <AppInput label="Note" value={paymentNote} onChangeText={setPaymentNote} placeholder="Optional" />
          <AppButton title={`Date: ${formatDate(paymentDate)}`} iconName="calendar" variant="outline" onPress={() => setShowPaymentDatePicker(true)} />
          {showPaymentDatePicker ? <DateTimePicker mode="date" display="default" value={paymentDate} onChange={(_, d) => { setShowPaymentDatePicker(false); if (d) setPaymentDate(d); }} /> : null}
          <AppButton title="Save Payment" iconName="content-save-outline" onPress={async () => {
            if (!activeDebt) return;
            try {
              await addPayment(activeDebt.id, Number(paymentAmount), dayjs(paymentDate).format('YYYY-MM-DD'), paymentNote.trim());
              setPaymentModal(false);
              setActiveDebtId('');
            } catch (error) {
              await alert('Error', error instanceof Error ? error.message : 'Payment failed.', 'error');
            }
          }} />
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  listHeader: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  excelBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1D9E4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  excelBtnDisabled: { opacity: 0.6 },
  summaryCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  personHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  peopleWrap: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  debtRow: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  personWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  warnBg: { backgroundColor: '#FFF2E8' },
  primaryBg: { backgroundColor: '#F3EEFF' },
  modalBody: { gap: spacing.md, paddingBottom: spacing.xl },
});
