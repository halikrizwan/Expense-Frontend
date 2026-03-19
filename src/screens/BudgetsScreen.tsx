import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppInput, AppModal, AppSelect, AppText, EmptyState, Loading } from '../components';
import { useAppTheme } from '../context/ThemeContext';
import { useAppAlert } from '../context/AppAlertContext';
import { useBudgets } from '../hooks/useBudgets';
import { useTransactions } from '../hooks/useTransactions';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { DashboardStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/format';

export const BudgetsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { colors: themeColors } = useAppTheme();
  const { alert } = useAppAlert();
  const { budgets, loading, add, update, remove } = useBudgets();
  const { transactions, categoryMap } = useTransactions();
  const { currency } = useSettingsCurrency();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ categoryId: '', amount: '' });

  const expenseCategories = useMemo(
    () => Object.values(categoryMap).filter(c => c.type === 'expense'),
    [categoryMap],
  );

  const thisMonthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const thisMonthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && tx.date >= thisMonthStart && tx.date <= thisMonthEnd)
      .forEach(tx => {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
      });
    return map;
  }, [transactions, thisMonthStart, thisMonthEnd]);

  const budgetsWithSpent = useMemo(
    () =>
      budgets.map(b => ({
        ...b,
        spent: spentByCategory[b.categoryId] || 0,
        categoryName: b.category?.name || categoryMap[b.categoryId]?.name || 'Unknown',
      })),
    [budgets, spentByCategory, categoryMap],
  );

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({ categoryId: '', amount: '' });
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((id: string, amount: number) => {
    setEditingId(id);
    const b = budgets.find(x => x.id === id);
    setForm({ categoryId: b?.categoryId || '', amount: String(amount) });
    setModalVisible(true);
  }, [budgets]);

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!form.categoryId || isNaN(amount) || amount <= 0) {
      await alert('Invalid', 'Please select a category and enter a valid amount.', 'error');
      return;
    }
    try {
      if (editingId) {
        await update(editingId, { amount });
        await alert('Updated', 'Budget updated successfully.', 'success');
      } else {
        await add({ categoryId: form.categoryId, amount });
        await alert('Added', 'Budget created successfully.', 'success');
      }
      setModalVisible(false);
    } catch (e) {
      await alert('Error', e instanceof Error ? e.message : 'Could not save budget.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      await alert('Deleted', 'Budget removed.', 'success');
      setModalVisible(false);
    } catch (e) {
      await alert('Error', e instanceof Error ? e.message : 'Could not delete budget.', 'error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, backgroundColor: themeColors.background }]}>
      <AppHeader
        title="Budgets"
        subtitle="Monthly spending limits"
        left={
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={themeColors.textPrimary} />
          </Pressable>
        }
        right={
          <AppButton title="Add" iconName="plus" onPress={openAdd} />
        }
      />

      {loading ? (
        <Loading label="Loading budgets..." />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {budgetsWithSpent.length === 0 ? (
            <EmptyState
              title="No budgets yet"
              description="Set monthly spending limits per category to track your expenses."
              actionTitle="Add budget"
              onAction={openAdd}
            />
          ) : (
            budgetsWithSpent.map((b, i) => {
              const pct = Math.min(100, (b.spent / b.amount) * 100);
              const isOver = b.spent > b.amount;
              return (
                <AnimatedSection key={b.id} delay={i * 40}>
                  <AppCard>
                    <View style={styles.budgetRow}>
                      <View style={styles.budgetMeta}>
                        <AppText variant="bodyStrong">{b.categoryName}</AppText>
                        <AppText variant="caption" color={colors.textSecondary}>
                          {formatCurrency(b.spent, currency)} / {formatCurrency(b.amount, currency)}
                        </AppText>
                      </View>
                      <View style={styles.budgetActions}>
                        <Pressable onPress={() => openEdit(b.id, b.amount)} style={styles.iconBtn}>
                          <Icon name="pencil" size={18} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleDelete(b.id)} style={styles.iconBtn}>
                          <Icon name="delete-outline" size={18} color={colors.secondary} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={[styles.progressBg, isOver && styles.progressOver]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(100, pct)}%`, backgroundColor: isOver ? colors.secondary : colors.primary },
                        ]}
                      />
                    </View>
                  </AppCard>
                </AnimatedSection>
              );
            })
          )}
        </ScrollView>
      )}

      <AppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingId ? 'Edit budget' : 'Add budget'}
      >
        {!editingId && (
          <AppSelect
            label="Category"
            value={form.categoryId}
            items={expenseCategories.map(c => ({ label: c.name, value: c.id }))}
            onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}
            placeholder="Select category"
          />
        )}
        <AppInput
          label="Monthly limit"
          value={form.amount}
          onChangeText={v => setForm(f => ({ ...f, amount: v }))}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <View style={styles.modalActions}>
          {editingId && (
            <AppButton
              title="Delete"
              variant="outline"
              iconName="delete-outline"
              onPress={() => handleDelete(editingId)}
              style={styles.deleteBtn}
            />
          )}
          <AppButton title={editingId ? 'Update' : 'Add'} onPress={handleSubmit} />
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  budgetMeta: { flex: 1 },
  budgetActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: { padding: spacing.xs },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressOver: { backgroundColor: '#FFE5E5' },
  progressFill: { height: '100%', borderRadius: 3 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  deleteBtn: { marginRight: 'auto' },
});
