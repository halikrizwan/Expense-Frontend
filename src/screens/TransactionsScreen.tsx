import dayjs from 'dayjs';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, ListRenderItem, Modal, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppInput, AppModal, AppSelect, AppText, Chip, EmptyState, Loading, SegmentedTabs } from '../components';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';
import { colors, radius, spacing } from '../constants/theme';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { useTransactions } from '../hooks/useTransactions';
import { Transaction, TransactionBillAttachment, TransactionType } from '../types/entities';
import { getTransactionBillsApi } from '../services/backend';
import { persistBillsForTransaction, PickedBillFile, removeStoredBill } from '../services/billsService';
import { formatCurrency, formatDate } from '../utils/format';
import { subscribeRefresh } from '../services/refreshBus';

const loadDocumentScanner = async () => {
  try {
    const moduleName = 'react-native-document-scanner-plugin';
    const scannerModule = await import(moduleName);
    return (scannerModule as any).default || scannerModule;
  } catch {
    return null;
  }
};

interface FormState {
  id?: string;
  type: TransactionType;
  categoryId: string;
  amount: string;
  note: string;
  date: Date;
}

const defaultForm: FormState = { type: 'expense', categoryId: '', amount: '', note: '', date: new Date() };

const TransactionRow = memo(({ item, currency, categoryName, onEdit, onDelete }: {
  item: Transaction;
  currency: string;
  categoryName: string;
  onEdit: (item: Transaction) => void;
  onDelete: (id: string) => void;
}) => (
  <Animated.View entering={FadeInDown.duration(320)} style={styles.rowCard}>
    <View style={styles.rowLeft}>
      <View style={[styles.rowIcon, item.type === 'income' ? styles.incomeBg : styles.expenseBg]}>
        <Icon name={item.type === 'income' ? 'trending-up' : 'trending-down'} size={14} color={item.type === 'income' ? colors.success : colors.secondary} />
      </View>
      <View>
        <AppText variant="bodyStrong">{categoryName || 'Category'}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>{formatDate(item.date)}</AppText>
      </View>
    </View>
    <View style={styles.rowRight}>
      <AppText variant="bodyStrong" color={item.type === 'income' ? colors.success : colors.secondary}>{item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount, currency)}</AppText>
      <View style={styles.rowActions}>
        <Icon name="pencil-outline" size={18} color={colors.primary} onPress={() => onEdit(item)} />
        <Icon name="trash-can-outline" size={18} color={colors.danger} onPress={() => onDelete(item.id)} />
      </View>
    </View>
  </Animated.View>
));

export const TransactionsScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useAppTheme();
  const { alert, confirm } = useAppAlert();
  const { transactions, categories, categoryMap, filters, setFilters, loading, refresh, add, update, remove, addNewCategory } = useTransactions();
  const { currency } = useSettingsCurrency();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [existingBills, setExistingBills] = useState<TransactionBillAttachment[]>([]);
  const [newBills, setNewBills] = useState<PickedBillFile[]>([]);
  const [removingBillIds, setRemovingBillIds] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState('');
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);
  const [activeFilterDateField, setActiveFilterDateField] = useState<'from' | 'to' | null>(null);
  const [calendarFocusDate, setCalendarFocusDate] = useState(dayjs());
  const [showFocusCalendarPicker, setShowFocusCalendarPicker] = useState(false);

  const filteredCategories = useMemo(() => categories.filter(item => item.type === form.type), [categories, form.type]);

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [transactions]);

  const resetAndClose = () => {
    setForm(defaultForm);
    setNewCategoryName('');
    setExistingBills([]);
    setNewBills([]);
    setRemovingBillIds([]);
    setPreviewUri('');
    setModalVisible(false);
  };

  const onSave = async () => {
    if (!form.categoryId) return alert('Validation', 'Please select a category.', 'warning');
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return alert('Validation', 'Amount must be greater than zero.', 'warning');

    const payload = { type: form.type, categoryId: form.categoryId, amount, note: form.note.trim(), date: dayjs(form.date).format('YYYY-MM-DD') };
    try {
      let transactionId = form.id;
      if (form.id) {
        await update(form.id, payload);
      } else {
        transactionId = await add(payload);
      }

      if (!transactionId) throw new Error('Transaction not found.');

      const billsToRemove = existingBills.filter(bill => removingBillIds.includes(bill.id));
      for (const bill of billsToRemove) {
        await removeStoredBill(bill);
      }
      await persistBillsForTransaction(transactionId, newBills);

      resetAndClose();
    } catch {
      await alert('Error', 'Unable to save transaction.', 'error');
    }
  };

  const onPickBills = async () => {
    try {
      const files = await pick({
        type: [types.images, types.pdf, types.allFiles],
        mode: 'import',
        allowMultiSelection: true,
      });

      const validFiles = files
        .filter(file => !!file.uri)
        .map(file => ({
          uri: file.uri,
          name: file.name,
          size: file.size,
          type: file.type,
        }));
      setNewBills(current => [...current, ...validFiles]);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      await alert('Error', 'Could not pick bill files.', 'error');
    }
  };

  const onScanBills = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Camera access is required to scan bills.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          await alert('Permission required', 'Please allow camera permission to scan bills.', 'warning');
          return;
        }
      }

      const scanner = await loadDocumentScanner();
      if (!scanner?.scanDocument) {
        await alert(
          'Scanner not installed',
          'Install scanner package and rebuild app to enable auto document crop scanning.',
          'warning',
        );
        return;
      }

      const scanned = await scanner.scanDocument({
        maxNumDocuments: 5,
        croppedImageQuality: 100,
      });

      if (!scanned?.scannedImages?.length) return;

      const scannedFiles: PickedBillFile[] = scanned.scannedImages.map((uri: string, index: number) => ({
        uri,
        name: `scanned_bill_${Date.now()}_${index + 1}.jpg`,
        type: 'image/jpeg',
      }));

      setNewBills(current => [...current, ...scannedFiles]);
    } catch {
      await alert('Error', 'Could not scan document.', 'error');
    }
  };

  const toPreviewUri = (uri: string) => {
    if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('http')) return uri;
    return `file://${uri}`;
  };

  const onDelete = (id: string) => {
    confirm('Delete transaction?', 'This action cannot be undone.', 'Delete', 'Cancel')
      .then(async confirmed => {
        if (!confirmed) return;
        try {
          await remove(id);
        } catch {
          await alert('Error', 'Unable to delete transaction.', 'error');
        }
      });
  };

  const openFilterDatePicker = (field: 'from' | 'to') => {
    setActiveFilterDateField(field);
    setShowFilterDatePicker(true);
  };

  const onFilterDateChange = (_: unknown, dateValue?: Date) => {
    setShowFilterDatePicker(false);
    if (!dateValue || !activeFilterDateField) return;
    const formatted = dayjs(dateValue).format('YYYY-MM-DD');
    setFilters(current => ({
      ...current,
      [activeFilterDateField === 'from' ? 'fromDate' : 'toDate']: formatted,
    }));
  };

  const weekDays = useMemo(() => {
    const start = calendarFocusDate.startOf('week');
    return Array.from({ length: 7 }, (_, index) => start.add(index, 'day'));
  }, [calendarFocusDate]);

  const onSelectDay = (dateValue: dayjs.Dayjs) => {
    const formatted = dateValue.format('YYYY-MM-DD');
    setFilters(current => ({
      ...current,
      fromDate: formatted,
      toDate: formatted,
    }));
    setCalendarFocusDate(dateValue);
  };

  const onAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await addNewCategory(newCategoryName.trim(), form.type);
      setNewCategoryName('');
    } catch {
      await alert('Error', 'Could not add category.', 'error');
    }
  };

  const renderItem: ListRenderItem<Transaction> = ({ item }) => (
    <TransactionRow item={item} currency={currency} categoryName={categoryMap[item.categoryId]?.name || 'Unknown'} onEdit={(tx) => {
      setForm({ id: tx.id, type: tx.type, categoryId: tx.categoryId, amount: String(tx.amount), note: tx.note, date: new Date(tx.date) });
      getTransactionBillsApi(tx.id)
        .then(rows => setExistingBills(rows))
        .catch(() => setExistingBills([]));
      setNewBills([]);
      setRemovingBillIds([]);
      setModalVisible(true);
    }} onDelete={onDelete} />
  );

  useEffect(() => subscribeRefresh('transactions', refresh), [refresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, backgroundColor: themeColors.background }]}>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <AnimatedSection><AppHeader title="Expenses" subtitle="Simple monthly view" right={<AppButton title="Add" iconName="plus" variant="secondary" onPress={() => setModalVisible(true)} />} /></AnimatedSection>

            <AnimatedSection delay={60}><AppCard>
              <View style={styles.calendarHeader}>
                <AppText variant="label" color={colors.textSecondary}>{calendarFocusDate.format('MMMM YYYY')}</AppText>
                <Pressable style={styles.calendarBtn} onPress={() => setShowFocusCalendarPicker(true)}>
                  <Icon name="calendar-month-outline" size={18} color={colors.primary} />
                </Pressable>
              </View>
              <View style={styles.dayRow}>
                {weekDays.map(day => {
                  const dayStr = day.format('YYYY-MM-DD');
                  const isActive = filters.fromDate === dayStr && filters.toDate === dayStr;
                  return (
                    <Pressable key={dayStr} style={[styles.dayItem, isActive && styles.dayActive]} onPress={() => onSelectDay(day)}>
                      <AppText variant="caption" color={isActive ? '#FFF' : colors.textSecondary}>{day.format('dd')}</AppText>
                      <AppText variant="caption" color={isActive ? '#FFF' : colors.textPrimary}>{day.format('D')}</AppText>
                    </Pressable>
                  );
                })}
              </View>
              {showFocusCalendarPicker ? (
                <DateTimePicker
                  mode="date"
                  display="default"
                  value={calendarFocusDate.toDate()}
                  onChange={(_, value) => {
                    setShowFocusCalendarPicker(false);
                    if (!value) return;
                    const next = dayjs(value);
                    setCalendarFocusDate(next);
                    onSelectDay(next);
                  }}
                />
              ) : null}
            </AppCard></AnimatedSection>

            <AnimatedSection delay={120} style={styles.summaryCards}>
              <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
                <AppText variant="label" color="#F3EDFF">Total Salary</AppText>
                <AppText variant="heading" color="#FFF">{formatCurrency(totals.income, currency)}</AppText>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.secondary }]}>
                <AppText variant="label" color="#FFF1E9">Total Expense</AppText>
                <AppText variant="heading" color="#FFF">{formatCurrency(totals.expense, currency)}</AppText>
              </View>
            </AnimatedSection>

            <AnimatedSection delay={180}><AppCard>
              <AppText variant="heading">Filters</AppText>
              <View style={styles.filterRow}>
                <SegmentedTabs
                  items={[{ key: 'all', label: 'All' }, { key: 'income', label: 'Income' }, { key: 'expense', label: 'Expense' }]}
                  value={filters.type || 'all'}
                  onChange={value => setFilters(current => ({ ...current, type: value === 'all' ? undefined : (value as TransactionType) }))}
                />
              </View>
              <View style={styles.filterDateRow}>
                <AppButton
                  title={`From: ${filters.fromDate || 'Select'}`}
                  iconName="calendar"
                  variant="outline"
                  onPress={() => openFilterDatePicker('from')}
                  style={styles.filterDateBtn}
                />
                <AppButton
                  title={`To: ${filters.toDate || 'Select'}`}
                  iconName="calendar"
                  variant="outline"
                  onPress={() => openFilterDatePicker('to')}
                  style={styles.filterDateBtn}
                />
              </View>
              {showFilterDatePicker ? (
                <DateTimePicker
                  mode="date"
                  display="default"
                  value={
                    activeFilterDateField === 'to' && filters.toDate
                      ? new Date(filters.toDate)
                      : activeFilterDateField === 'from' && filters.fromDate
                        ? new Date(filters.fromDate)
                        : new Date()
                  }
                  onChange={onFilterDateChange}
                />
              ) : null}
            </AppCard></AnimatedSection>
          </View>
        }
        ListEmptyComponent={loading ? <Loading label="Loading transactions..." /> : <EmptyState title="No transactions" description="Add your first transaction." />}
        contentContainerStyle={styles.content}
      />

      <AppModal visible={modalVisible} title={form.id ? 'Edit Transaction' : 'Add Transaction'} onClose={resetAndClose}>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <SegmentedTabs items={[{ key: 'income', label: 'Income' }, { key: 'expense', label: 'Expense' }]} value={form.type} onChange={value => setForm(current => ({ ...current, type: value as TransactionType, categoryId: '' }))} />

          <AppSelect
            label="Select Category"
            value={form.categoryId}
            items={filteredCategories.map(category => ({ label: category.name, value: category.id }))}
            onValueChange={value => setForm(current => ({ ...current, categoryId: value }))}
            placeholder="Select category"
          />

          <AppInput
            label="New Category"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Custom category"
            rightElement={(
              <TouchableOpacity style={styles.inlineAddBtn} onPress={onAddCategory}>
                <Icon name="plus" size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          />
          <AppInput label="Amount" keyboardType="decimal-pad" value={form.amount} onChangeText={value => setForm(current => ({ ...current, amount: value }))} placeholder="0.00" />
          <AppInput label="Note" value={form.note} onChangeText={value => setForm(current => ({ ...current, note: value }))} placeholder="Optional" />
          <View style={styles.billActionRow}>
            <AppButton title="Attach Bill" iconName="paperclip" variant="outline" onPress={onPickBills} style={styles.billActionBtn} />
            <AppButton title="Scan Bill" iconName="camera-document" variant="outline" onPress={onScanBills} style={styles.billActionBtn} />
          </View>

          {(existingBills.length || newBills.length) ? (
            <View style={styles.billWrap}>
              <AppText variant="label" color={colors.textSecondary}>Attached Bills</AppText>
              <View style={styles.chipsWrap}>
                {existingBills
                  .filter(bill => !removingBillIds.includes(bill.id))
                  .map(bill => (
                    <Chip
                      key={bill.id}
                      label={`Bill: ${bill.fileName}`}
                      onPress={() => setPreviewUri(toPreviewUri(bill.fileUri))}
                      onLongPress={() => setRemovingBillIds(current => [...current, bill.id])}
                    />
                  ))}
                {newBills.map((bill, index) => (
                  <Chip
                    key={`${bill.uri}_${index}`}
                    label={`Bill: ${bill.name || `Bill ${index + 1}`}`}
                    onPress={() => setPreviewUri(toPreviewUri(bill.uri))}
                    onLongPress={() => setNewBills(current => current.filter((_, i) => i !== index))}
                  />
                ))}
              </View>
              <AppText variant="caption" color={colors.textSecondary}>Tap to preview. Long press to remove.</AppText>
            </View>
          ) : null}

          <AppButton title={`Date: ${formatDate(form.date)}`} iconName="calendar" variant="outline" onPress={() => setShowDatePicker(true)} />
          {showDatePicker ? <DateTimePicker mode="date" display="default" value={form.date} onChange={(_, d) => { setShowDatePicker(false); if (d) setForm(current => ({ ...current, date: d })); }} /> : null}
          <AppButton title={form.id ? 'Update' : 'Save'} iconName="content-save-outline" onPress={onSave} />
        </ScrollView>
      </AppModal>

      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri('')}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUri('')}>
          <View style={styles.previewCard}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  listHeader: { gap: spacing.md },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calendarBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  dayItem: { width: 42, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayActive: { backgroundColor: colors.secondary },
  summaryCards: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  filterRow: { marginTop: spacing.sm, marginBottom: spacing.md },
  filterDateRow: { flexDirection: 'row', gap: spacing.sm },
  filterDateBtn: { flex: 1 },
  rowCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  rowRight: { alignItems: 'flex-end', gap: spacing.xs },
  rowIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  incomeBg: { backgroundColor: '#EAFFF5' },
  expenseBg: { backgroundColor: '#FFF1EA' },
  rowActions: { flexDirection: 'row', gap: spacing.md },
  modalBody: { gap: spacing.md, paddingBottom: spacing.xxl },
  inlineAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billActionRow: { flexDirection: 'row', gap: spacing.sm },
  billActionBtn: { flex: 1 },
  billWrap: { gap: spacing.xs },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewCard: {
    width: '100%',
    height: '80%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
