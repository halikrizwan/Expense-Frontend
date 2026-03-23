import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppInput, AppModal, AppSelect, AppText, DatePickerModal, Loading, SegmentedTabs } from '../components';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';
import { useRecurring } from '../hooks/useRecurring';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { useTransactions } from '../hooks/useTransactions';
import { SettingsStackParamList } from '../navigation/types';
import { resetAllApi, updateSettingsApi, addCategoryApi, addGroupApi } from '../services/backend';
import { exportToJson, exportTransactionsToCsv, importFromJson } from '../services/exportService';
import { emitRefresh, subscribeRefresh } from '../services/refreshBus';
import { RecurringTransaction, TransactionType } from '../types/entities';
import { formatCurrency, formatDate } from '../utils/format';

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors, mode, setMode } = useAppTheme();
  const { logout } = useAuth();
  const { alert, confirm } = useAppAlert();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const { currency, loading: currencyLoading, refresh, saveCurrency } = useSettingsCurrency();
  const { recurring, loading: recurringLoading, add: addRecurring, update: updateRecurring, remove: removeRecurring } = useRecurring();
  const { categories, categoryMap } = useTransactions();
  const [currencyInput, setCurrencyInput] = useState(currency);
  const [busy, setBusy] = useState(false);
  const [createModal, setCreateModal] = useState<'category' | 'group' | 'recurring' | null>(null);
  const [createName, setCreateName] = useState('');
  const [categoryType, setCategoryType] = useState<TransactionType>('expense');
  const [recurringForm, setRecurringForm] = useState({
    type: 'income' as TransactionType,
    categoryId: '',
    amount: '',
    label: 'Salary',
    dayOfMonth: 1,
    endsAt: null as Date | null,
    notifyEnabled: true,
  });
  const [recurringPickerDate, setRecurringPickerDate] = useState(new Date());
  const [recurringEndPickerDate, setRecurringEndPickerDate] = useState(new Date());
  const [showRecurringDatePicker, setShowRecurringDatePicker] = useState(false);
  const [showRecurringEndDatePicker, setShowRecurringEndDatePicker] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  useEffect(() => { setCurrencyInput(currency); }, [currency]);
  useEffect(() => subscribeRefresh('settings', refresh), [refresh]);

  const withLoading = async (task: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    try { await task(); await alert('Success', successMessage, 'success'); }
    catch (error) { await alert('Error', error instanceof Error ? error.message : 'Action failed.', 'error'); }
    finally { setBusy(false); }
  };

  const openCreate = (kind: 'category' | 'group' | 'recurring') => {
    setCreateModal(kind);
    setCreateName('');
    setCategoryType('expense');
    if (kind === 'recurring') {
      setRecurringForm({
        type: 'income',
        categoryId: getDefaultRecurringCategoryId('income'),
        amount: '',
        label: 'Salary',
        dayOfMonth: new Date().getDate(),
        endsAt: null,
        notifyEnabled: true,
      });
      setRecurringPickerDate(new Date());
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setRecurringEndPickerDate(nextYear);
      setEditingRecurring(null);
    }
  };

  const openEditRecurring = (r: RecurringTransaction) => {
    setEditingRecurring(r);
    setCreateModal('recurring');
    const end = r.endsAt ? new Date(r.endsAt) : null;
    setRecurringForm({
      type: r.type,
      categoryId: r.categoryId,
      amount: String(r.amount),
      label: r.label,
      dayOfMonth: r.dayOfMonth,
      endsAt: end,
      notifyEnabled: r.notifyEnabled !== false,
    });
    setRecurringPickerDate(new Date(new Date().getFullYear(), new Date().getMonth(), r.dayOfMonth));
    setRecurringEndPickerDate(end ?? new Date(new Date().getFullYear(), new Date().getMonth() + 6, 1));
  };

  const categoriesByType = useMemo(
    () => ({
      income: categories.filter(c => c.type === 'income'),
      expense: categories.filter(c => c.type === 'expense'),
    }),
    [categories],
  );
  const getDefaultRecurringCategoryId = (type: TransactionType) => {
    const options = categoriesByType[type];
    if (!options.length) return '';
    const preferredName = type === 'income' ? 'salary' : 'other';
    return options.find(category => category.name.trim().toLowerCase() === preferredName)?.id || options[0].id;
  };

  const onSaveRecurring = async () => {
    const amount = parseFloat(recurringForm.amount);
    if (!recurringForm.categoryId) {
      await alert('Validation', 'Please select a category.', 'warning');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      await alert('Validation', 'Amount must be greater than zero.', 'warning');
      return;
    }
    await withLoading(async () => {
      const endsIso = recurringForm.endsAt ? recurringForm.endsAt.toISOString() : null;
      if (editingRecurring) {
        await updateRecurring(editingRecurring.id, {
          type: recurringForm.type,
          categoryId: recurringForm.categoryId,
          amount,
          label: recurringForm.label.trim() || 'Salary',
          dayOfMonth: recurringForm.dayOfMonth,
          endsAt: endsIso,
          notifyEnabled: recurringForm.notifyEnabled,
        });
      } else {
        await addRecurring({
          type: recurringForm.type,
          categoryId: recurringForm.categoryId,
          amount,
          label: recurringForm.label.trim() || 'Salary',
          dayOfMonth: recurringForm.dayOfMonth,
          ...(endsIso ? { endsAt: endsIso } : {}),
          notifyEnabled: recurringForm.notifyEnabled,
        });
      }
      emitRefresh('dashboard');
      emitRefresh('transactions');
      setCreateModal(null);
      setEditingRecurring(null);
    }, editingRecurring ? 'Monthly auto entry updated.' : 'Monthly auto entry added.');
  };

  const onCreateCommonData = async () => {
    const name = createName.trim();
    if (!createModal) return;
    if (!name) {
      await alert('Validation', 'Name is required.', 'warning');
      return;
    }

    await withLoading(async () => {
      if (createModal === 'category') {
        await addCategoryApi({ name, type: categoryType });
      } else {
        await addGroupApi(name);
      }

      emitRefresh('settings');
      emitRefresh('transactions');
      emitRefresh('splits');
      setCreateModal(null);
      setCreateName('');
      setCategoryType('expense');
    }, `${createModal === 'category' ? 'Category' : 'Group'} added.`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <AnimatedSection><AppHeader title="Settings" subtitle="Backup and app preferences" /></AnimatedSection>

        <AnimatedSection delay={40}><AppCard>
          <AppText variant="heading">Theme</AppText>
          <View style={styles.themeRow}>
            <View style={styles.themeMeta}>
              <AppText variant="bodyStrong">Dark Mode</AppText>
              <AppText variant="caption" color={colors.textSecondary}>Current: {mode === 'dark' ? 'Dark' : 'Light'}</AppText>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={async enabled => {
                const next = enabled ? 'dark' : 'light';
                await setMode(next);
                try { await updateSettingsApi({ theme: next }); } catch {}
              }}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={mode === 'dark' ? colors.primary : '#FFFFFF'}
            />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={55}><AppCard>
          <AppText variant="heading">Common Data</AppText>
          <View style={styles.currencyContent}>
            <AppText variant="caption" color={colors.textSecondary}>Manage categories, users, and groups on a dedicated page.</AppText>
            <View style={styles.buttonRow}>
              <AppButton
                title="Add Category"
                iconName="shape-outline"
                variant="soft"
                onPress={() => openCreate('category')}
                style={styles.rowButton}
              />
              <AppButton
                title="Add Group"
                iconName="account-group-outline"
                variant="soft"
                onPress={() => openCreate('group')}
                style={styles.rowButton}
              />
            </View>
            <AppButton
              title="Open Common Data"
              iconName="database-cog-outline"
              variant="outline"
              onPress={() => navigation.navigate('CommonData')}
            />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={60}><AppCard>
          <AppText variant="heading">Monthly Auto Credit</AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.captionBlock}>
            Add salary by default, or choose any other income or expense that should be created automatically every month on the date you select.
          </AppText>
          {recurringLoading ? (
            <Loading label="Loading..." />
          ) : (
            <View style={styles.recurringList}>
              {recurring.map(r => (
                <View key={r.id} style={styles.recurringRow}>
                  <View style={styles.recurringMeta}>
                    <AppText variant="bodyStrong">{r.label}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {formatCurrency(r.amount, currency)} · Day {r.dayOfMonth} · {categoryMap[r.categoryId]?.name || '—'}
                    </AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {r.endsAt ? `Until ${formatDate(r.endsAt)}` : 'Permanent'} ·{' '}
                      {r.notifyEnabled === false ? 'No reminders' : 'Reminders on'}
                    </AppText>
                  </View>
                  <View style={styles.recurringActions}>
                    <Switch
                      value={r.isActive}
                      onValueChange={async v => {
                        try {
                          await updateRecurring(r.id, { isActive: v });
                          emitRefresh('dashboard');
                        } catch {}
                      }}
                      trackColor={{ false: colors.border, true: colors.primarySoft }}
                      thumbColor={r.isActive ? colors.primary : '#FFFFFF'}
                    />
                    <Pressable onPress={() => openEditRecurring(r)} style={styles.iconBtn}>
                      <Icon name="pencil" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        const ok = await confirm('Remove?', `Remove "${r.label}" from auto credit?`, 'Remove', 'Cancel');
                        if (ok) {
                          await removeRecurring(r.id);
                          emitRefresh('dashboard');
                        }
                      }}
                      style={styles.iconBtn}
                    >
                      <Icon name="delete-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
          <AppButton
            title="Add Monthly Auto Credit"
            iconName="calendar-plus"
            variant="outline"
            onPress={() => openCreate('recurring')}
          />
        </AppCard></AnimatedSection>

        <AnimatedSection delay={70}><AppCard>
          <AppText variant="heading">Currency</AppText>
          {currencyLoading ? <Loading label="Loading currency..." /> : (
            <View style={styles.currencyContent}>
              <AppText variant="caption" color={colors.textSecondary}>Current currency: {currency}</AppText>
              <AppInput value={currencyInput} onChangeText={setCurrencyInput} autoCapitalize="characters" maxLength={3} placeholder="AED" />
              <AppButton title="Save Currency" iconName="content-save-outline" onPress={async () => {
                const next = currencyInput.trim().toUpperCase();
                if (next.length !== 3) return alert('Validation', 'Currency must be a 3-letter code.', 'warning');
                await withLoading(async () => saveCurrency(next), 'Currency updated.');
              }} />
            </View>
          )}
        </AppCard></AnimatedSection>

        <AnimatedSection delay={120}><AppCard>
          <AppText variant="heading">Backup</AppText>
          <View style={styles.buttonGap}>
            <AppButton title="Export Transactions CSV" iconName="file-delimited-outline" variant="outline" onPress={async () => withLoading(async () => { await exportTransactionsToCsv(); }, 'CSV file exported.')} disabled={busy} />
            <AppButton title="Export to JSON" iconName="file-code-outline" variant="outline" onPress={async () => withLoading(async () => { await exportToJson(); }, 'JSON backup exported.')} disabled={busy} />
            <AppButton title="Import from JSON" iconName="file-import-outline" variant="outline" onPress={async () => withLoading(async () => importFromJson(), 'JSON backup imported.')} disabled={busy} />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={150}><AppCard>
          <AppText variant="heading">Account</AppText>
          <View style={styles.buttonGap}>
            <AppButton title="Profile" iconName="account-cog-outline" variant="soft" onPress={() => navigation.navigate('Profile')} />
            <AppButton title="Logout" iconName="logout" variant="outline" onPress={logout} />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={180} style={styles.dangerCard}>
          <AppText variant="heading">Danger Zone</AppText>
          <AppText variant="caption" color={colors.textSecondary}>This deletes all local data on this device.</AppText>
          <AppButton title="Reset All Data" iconName="trash-can-outline" variant="danger" onPress={async () => {
            const confirmed = await confirm('Reset all data?', 'This permanently deletes all local records.', 'Reset', 'Cancel');
            if (!confirmed) return;
            await withLoading(async () => resetAllApi(), 'All data reset complete.');
          }} />
        </AnimatedSection>
      </ScrollView>

      <AppModal
        visible={!!createModal}
        title={
          createModal === 'recurring'
            ? editingRecurring
              ? 'Edit Monthly Auto Credit'
              : 'Add Monthly Auto Credit'
            : createModal === 'category'
              ? 'Add Category'
              : 'Add Group'
        }
        onClose={() => setCreateModal(null)}
        overlay={(
          <>
            <DatePickerModal
              visible={showRecurringDatePicker}
              embedded
              value={recurringPickerDate}
              title="Select Monthly Date"
              onClose={() => setShowRecurringDatePicker(false)}
              onConfirm={value => {
                setRecurringPickerDate(value);
                setRecurringForm(current => ({ ...current, dayOfMonth: value.getDate() }));
                setShowRecurringDatePicker(false);
              }}
            />
            <DatePickerModal
              visible={showRecurringEndDatePicker}
              embedded
              value={recurringEndPickerDate}
              title="End date (inclusive)"
              onClose={() => setShowRecurringEndDatePicker(false)}
              onConfirm={value => {
                setRecurringEndPickerDate(value);
                setRecurringForm(current => ({ ...current, endsAt: value }));
                setShowRecurringEndDatePicker(false);
              }}
            />
          </>
        )}>
        <View style={styles.modalBody}>
          {createModal === 'recurring' ? (
            <>
              <AppInput
                label="Title"
                value={recurringForm.label}
                onChangeText={v => setRecurringForm(f => ({ ...f, label: v }))}
                placeholder="e.g. Salary, Rent, Bonus"
              />
              <SegmentedTabs
                items={[
                  { key: 'income', label: 'Income' },
                  { key: 'expense', label: 'Expense' },
                ]}
                value={recurringForm.type}
                onChange={v => {
                  const nextType = v as TransactionType;
                  setRecurringForm(f => ({
                    ...f,
                    type: nextType,
                    categoryId: getDefaultRecurringCategoryId(nextType),
                    label: nextType === 'income' && (!f.label.trim() || f.label === 'Salary') ? 'Salary' : f.label,
                  }));
                }}
              />
              <AppSelect
                label="Category"
                value={recurringForm.categoryId}
                items={categoriesByType[recurringForm.type].map(c => ({ label: c.name, value: c.id }))}
                onValueChange={v => setRecurringForm(f => ({ ...f, categoryId: v }))}
                placeholder="Select category"
              />
              {categoriesByType[recurringForm.type].length === 0 && (
                <AppButton
                  title="Add category first"
                  variant="soft"
                  onPress={() => {
                    setCreateModal(null);
                    navigation.navigate('CommonData', { tab: recurringForm.type === 'income' ? 'category' : 'category' });
                  }}
                />
              )}
              <AppInput
                label="Amount"
                value={recurringForm.amount}
                onChangeText={v => setRecurringForm(f => ({ ...f, amount: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <AppButton
                title={`Date each month: ${recurringForm.dayOfMonth}`}
                iconName="calendar"
                variant="outline"
                onPress={() => setShowRecurringDatePicker(true)}
              />
              <AppText variant="caption" color={colors.textSecondary}>
                This entry will be created every month on day {recurringForm.dayOfMonth}. Leave &quot;Runs until&quot;
                empty for a permanent schedule (you can change it anytime).
              </AppText>
              <AppButton
                title={
                  recurringForm.endsAt
                    ? `Runs until: ${formatDate(recurringForm.endsAt)}`
                    : 'Runs until: Permanent (no end date)'
                }
                iconName="calendar-range"
                variant="outline"
                onPress={() => setShowRecurringEndDatePicker(true)}
              />
              {recurringForm.endsAt ? (
                <AppButton
                  title="Clear end date (permanent)"
                  variant="soft"
                  onPress={() => setRecurringForm(f => ({ ...f, endsAt: null }))}
                />
              ) : null}
              <View style={styles.themeRow}>
                <View style={styles.themeMeta}>
                  <AppText variant="bodyStrong">Remind me</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    In-app notifications when this entry is due today or in the next few days.
                  </AppText>
                </View>
                <Switch
                  value={recurringForm.notifyEnabled}
                  onValueChange={v => setRecurringForm(f => ({ ...f, notifyEnabled: v }))}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={recurringForm.notifyEnabled ? colors.primary : '#FFFFFF'}
                />
              </View>
              <AppButton
                title={editingRecurring ? 'Update Monthly Entry' : 'Save Monthly Entry'}
                iconName="plus"
                onPress={onSaveRecurring}
                loading={busy}
              />
            </>
          ) : (
            <>
              <AppInput
                label="Name"
                value={createName}
                onChangeText={setCreateName}
                placeholder={createModal === 'category' ? 'Enter category name' : 'Enter group name'}
              />
              {createModal === 'category' ? (
                <SegmentedTabs
                  items={[
                    { key: 'expense', label: 'Expense' },
                    { key: 'income', label: 'Income' },
                  ]}
                  value={categoryType}
                  onChange={value => setCategoryType(value as TransactionType)}
                />
              ) : null}
              <AppButton
                title={createModal === 'category' ? 'Save Category' : 'Save Group'}
                iconName="plus"
                onPress={onCreateCommonData}
                loading={busy}
              />
              <AppButton
                title="Manage All Common Data"
                variant="outline"
                onPress={() => {
                  const tab = createModal || 'category';
                  setCreateModal(null);
                  navigation.navigate('CommonData', { tab });
                }}
              />
            </>
          )}
        </View>
      </AppModal>
    </View>
  );
};

const createStyles = (colors: AppColors, mode: 'light' | 'dark') =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    themeRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    themeMeta: {
      flex: 1,
      gap: spacing.xs,
    },
    currencyContent: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    rowButton: {
      flex: 1,
    },
    buttonGap: { marginTop: spacing.sm, gap: spacing.sm },
    captionBlock: { marginBottom: spacing.sm },
    recurringList: { marginBottom: spacing.md, gap: spacing.sm },
    recurringRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    recurringMeta: { flex: 1, gap: 2 },
    recurringActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconBtn: { padding: spacing.xs },
    modalBody: {
      gap: spacing.md,
      paddingBottom: spacing.sm,
    },
    dangerCard: {
      backgroundColor: mode === 'dark' ? colors.surface : '#FFF1EF',
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: mode === 'dark' ? colors.border : '#FFD9D2',
    },
  });
