import dayjs from 'dayjs';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppInput, AppModal, AppMultiSelect, AppSelect, AppText, EmptyState, Loading } from '../components';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';
import { colors, radius, spacing } from '../constants/theme';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { useSplits } from '../hooks/useSplits';
import { SplitExpense } from '../types/entities';
import { formatCurrency, formatDate } from '../utils/format';
import { subscribeRefresh } from '../services/refreshBus';

interface SplitFormState {
  groupId: string;
  title: string;
  payerPersonId: string;
  amount: string;
  note: string;
  date: Date;
  participantPersonIds: string[];
}

const defaultSplitForm: SplitFormState = {
  groupId: '', title: '', payerPersonId: '', amount: '', note: '', date: new Date(), participantPersonIds: [],
};

const SplitRow = memo(({ item, groupName, payerName, currency }: { item: SplitExpense; groupName: string; payerName: string; currency: string }) => (
  <Animated.View entering={FadeInDown.duration(320)} style={styles.rowCard}>
    <View style={styles.rowTop}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}><Icon name="receipt-text-outline" size={14} color={colors.primary} /></View>
        <View>
          <AppText variant="bodyStrong">{item.title}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>{groupName} • paid by {payerName}</AppText>
        </View>
      </View>
      <AppText variant="bodyStrong" color={colors.primary}>{formatCurrency(item.totalAmount, currency)}</AppText>
    </View>
    <AppText variant="caption" color={colors.textSecondary}>{formatDate(item.date)}</AppText>
  </Animated.View>
));

export const SplitsScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useAppTheme();
  const { alert } = useAppAlert();
  const { groups, people, splitExpenses, balances, peopleMap, loading, refresh, addNewGroup, addNewSplit, addNewSettlement } = useSplits();
  const { currency } = useSettingsCurrency();

  const [groupModal, setGroupModal] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const [settleModal, setSettleModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [splitForm, setSplitForm] = useState<SplitFormState>(defaultSplitForm);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [settleGroupId, setSettleGroupId] = useState('');
  const [settleFromId, setSettleFromId] = useState('');
  const [settleToId, setSettleToId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(new Date());
  const [showSettleDatePicker, setShowSettleDatePicker] = useState(false);

  const groupMap = useMemo(() => groups.reduce<Record<string, string>>((acc, group) => {
    acc[group.id] = group.name;
    return acc;
  }, {}), [groups]);

  const renderItem: ListRenderItem<SplitExpense> = ({ item }) => (
    <SplitRow item={item} groupName={groupMap[item.groupId] || 'Group'} payerName={peopleMap[item.payerPersonId]?.name || 'Unknown'} currency={currency} />
  );

  useEffect(() => subscribeRefresh('splits', refresh), [refresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, backgroundColor: themeColors.background }]}>
      <FlatList
        data={splitExpenses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        initialNumToRender={8}
        windowSize={7}
        ListHeaderComponent={<View style={styles.listHeader}>
          <AnimatedSection><AppHeader title="Splits" subtitle="Easy shared expense tracker" right={<AppButton title="Add Split" iconName="plus" variant="secondary" onPress={() => setSplitModal(true)} />} /></AnimatedSection>

          <AnimatedSection delay={60} style={styles.actionRow}>
            <AppButton title="Add Group" iconName="account-group-outline" variant="soft" onPress={() => setGroupModal(true)} style={styles.actionBtn} />
            <AppButton title="Settle" iconName="handshake-outline" variant="soft" onPress={() => setSettleModal(true)} style={styles.actionBtn} />
          </AnimatedSection>

          <AnimatedSection delay={120}><AppCard>
            <AppText variant="heading">Balances</AppText>
            {balances.length ? (
              <View style={styles.balanceWrap}>
                {balances.map((balance, index) => (
                  <View key={`${balance.fromPersonId}_${index}`} style={styles.balancePill}>
                    <AppText variant="caption">{peopleMap[balance.fromPersonId]?.name || 'Unknown'} owes {peopleMap[balance.toPersonId]?.name || 'Unknown'} {formatCurrency(balance.amount, currency)}</AppText>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState title="All settled" description="No pending balances." />
            )}
          </AppCard></AnimatedSection>
        </View>}
        ListEmptyComponent={loading ? <Loading label="Loading splits..." /> : <EmptyState title="No split expenses" description="Create a group and add a split." />}
        contentContainerStyle={styles.content}
      />

      <AppModal visible={groupModal} title="Add Group" onClose={() => setGroupModal(false)}>
        <View style={styles.modalBody}>
          <AppInput label="Group Name" value={groupName} onChangeText={setGroupName} placeholder="Trip, House, Team" />
          <AppButton title="Save Group" iconName="content-save-outline" onPress={async () => {
            if (!groupName.trim()) return;
            try { await addNewGroup(groupName.trim()); setGroupName(''); setGroupModal(false); } catch { await alert('Error', 'Could not add group.', 'error'); }
          }} />
        </View>
      </AppModal>

      <AppModal visible={splitModal} title="Add Split Expense" onClose={() => setSplitModal(false)}>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <AppInput label="Title" value={splitForm.title} onChangeText={value => setSplitForm(current => ({ ...current, title: value }))} placeholder="Dinner" />
          <AppSelect
            label="Select Group"
            value={splitForm.groupId}
            items={groups.map(group => ({ label: group.name, value: group.id }))}
            onValueChange={value => setSplitForm(current => ({ ...current, groupId: value }))}
            placeholder="Select group"
          />
          <AppSelect
            label="Select Payer"
            value={splitForm.payerPersonId}
            items={people.map(person => ({ label: person.name, value: person.id }))}
            onValueChange={value => setSplitForm(current => ({ ...current, payerPersonId: value }))}
            placeholder="Select payer"
          />
          <AppMultiSelect
            label="Participants (equal split)"
            options={people.map(person => ({ label: person.name, value: person.id }))}
            selectedValues={splitForm.participantPersonIds}
            onChange={values => setSplitForm(current => ({ ...current, participantPersonIds: values }))}
            placeholder="Select participants"
          />
          <AppInput label="Amount" keyboardType="decimal-pad" value={splitForm.amount} onChangeText={value => setSplitForm(current => ({ ...current, amount: value }))} placeholder="0.00" />
          <AppInput label="Note" value={splitForm.note} onChangeText={value => setSplitForm(current => ({ ...current, note: value }))} placeholder="Optional" />
          <AppButton title={`Date: ${formatDate(splitForm.date)}`} iconName="calendar" variant="outline" onPress={() => setShowDatePicker(true)} />
          {showDatePicker ? <DateTimePicker mode="date" display="default" value={splitForm.date} onChange={(_, dateValue) => { setShowDatePicker(false); if (dateValue) setSplitForm(current => ({ ...current, date: dateValue })); }} /> : null}
          <AppButton title="Save Split" iconName="content-save-outline" onPress={async () => {
            if (!splitForm.groupId || !splitForm.payerPersonId || !splitForm.title.trim()) return alert('Validation', 'Group, title, and payer are required.', 'warning');
            const amount = Number(splitForm.amount);
            if (!amount || amount <= 0) return alert('Validation', 'Amount must be greater than 0.', 'warning');
            if (splitForm.participantPersonIds.length < 2) return alert('Validation', 'Select at least 2 participants.', 'warning');
            try {
              await addNewSplit({ groupId: splitForm.groupId, title: splitForm.title.trim(), payerPersonId: splitForm.payerPersonId, totalAmount: amount, note: splitForm.note.trim(), date: dayjs(splitForm.date).format('YYYY-MM-DD'), participantPersonIds: splitForm.participantPersonIds });
              setSplitForm(defaultSplitForm);
              setSplitModal(false);
            } catch (error) {
              await alert('Error', error instanceof Error ? error.message : 'Could not add split.', 'error');
            }
          }} />
        </ScrollView>
      </AppModal>

      <AppModal visible={settleModal} title="Settle Balance" onClose={() => setSettleModal(false)}>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <AppSelect
            label="Group"
            value={settleGroupId}
            items={groups.map(group => ({ label: group.name, value: group.id }))}
            onValueChange={setSettleGroupId}
            placeholder="Select group"
          />
          <AppSelect
            label="From"
            value={settleFromId}
            items={people.map(person => ({ label: person.name, value: person.id }))}
            onValueChange={setSettleFromId}
            placeholder="Select person"
          />
          <AppSelect
            label="To"
            value={settleToId}
            items={people.map(person => ({ label: person.name, value: person.id }))}
            onValueChange={setSettleToId}
            placeholder="Select person"
          />
          <AppInput label="Amount" keyboardType="decimal-pad" value={settleAmount} onChangeText={setSettleAmount} placeholder="0.00" />
          <AppButton title={`Date: ${formatDate(settleDate)}`} iconName="calendar" variant="outline" onPress={() => setShowSettleDatePicker(true)} />
          {showSettleDatePicker ? <DateTimePicker mode="date" display="default" value={settleDate} onChange={(_, d) => { setShowSettleDatePicker(false); if (d) setSettleDate(d); }} /> : null}
          <AppButton title="Save Settlement" iconName="content-save-outline" onPress={async () => {
            const amount = Number(settleAmount);
            if (!settleGroupId || !settleFromId || !settleToId || !amount || amount <= 0) return alert('Validation', 'Please fill all settlement fields correctly.', 'warning');
            try {
              await addNewSettlement({ groupId: settleGroupId, fromPersonId: settleFromId, toPersonId: settleToId, amount, note: '', date: dayjs(settleDate).format('YYYY-MM-DD') });
              setSettleModal(false);
              setSettleAmount('');
            } catch {
              await alert('Error', 'Could not save settlement.', 'error');
            }
          }} />
        </ScrollView>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  listHeader: { gap: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
  balanceWrap: { marginTop: spacing.sm, gap: spacing.xs },
  balancePill: { backgroundColor: '#F6F2FF', borderRadius: 999, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rowCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  rowIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  modalBody: { gap: spacing.md, paddingBottom: spacing.xl },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
