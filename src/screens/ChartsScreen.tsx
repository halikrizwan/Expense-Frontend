import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { AnimatedSection, AppCard, AppHeader, AppText, BarChart, DonutChart, EmptyState, Loading, SegmentedTabs } from '../components';
import { useAppTheme } from '../context/ThemeContext';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { useTransactions } from '../hooks/useTransactions';
import { DashboardStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/format';

const PALETTE = ['#7A3FF2', '#FF7A3D', '#2F3359', '#19A7CE', '#12B76A'];

export const ChartsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { colors: themeColors } = useAppTheme();
  const { currency } = useSettingsCurrency();
  const { transactions, categoryMap, loading } = useTransactions();
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');

  const monthsCount = period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const monthlyData = useMemo(() => {
    const now = dayjs();
    const result: Array<{ label: string; income: number; expense: number }> = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const m = now.subtract(i, 'month');
      const start = m.startOf('month').format('YYYY-MM-DD');
      const end = m.endOf('month').format('YYYY-MM-DD');
      let income = 0;
      let expense = 0;
      transactions.forEach(tx => {
        if (tx.date >= start && tx.date <= end) {
          if (tx.type === 'income') income += tx.amount;
          else expense += tx.amount;
        }
      });
      result.push({
        label: m.format('MMM'),
        income,
        expense,
      });
    }
    return result;
  }, [transactions, monthsCount]);

  const barChartData = useMemo(
    () =>
      monthlyData.map(d => ({
        label: d.label,
        income: d.income,
        expense: d.expense,
      })),
    [monthlyData],
  );

  const expenseSlices = useMemo(() => {
    const totalsByCategory: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        const name = categoryMap[tx.categoryId]?.name || 'Other';
        totalsByCategory[name] = (totalsByCategory[name] || 0) + tx.amount;
      });
    return Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], index) => ({
        label,
        value,
        color: PALETTE[index % PALETTE.length],
      }));
  }, [transactions, categoryMap]);

  const incomeSlices = useMemo(() => {
    const totalsByCategory: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'income')
      .forEach(tx => {
        const name = categoryMap[tx.categoryId]?.name || 'Other';
        totalsByCategory[name] = (totalsByCategory[name] || 0) + tx.amount;
      });
    return Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], index) => ({
        label,
        value,
        color: PALETTE[index % PALETTE.length],
      }));
  }, [transactions, categoryMap]);

  const totalExpense = expenseSlices.reduce((s, i) => s + i.value, 0);
  const totalIncome = incomeSlices.reduce((s, i) => s + i.value, 0);

  const hasData = transactions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <AppHeader
          title="Analytics"
          subtitle="Income & expense trends"
          left={
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
              <Icon name="arrow-left" size={24} color={themeColors.textPrimary} />
            </Pressable>
          }
        />
      </View>

      {loading ? (
        <Loading label="Loading analytics..." />
      ) : !hasData ? (
        <EmptyState
          title="No data yet"
          description="Add income or expenses to see charts and trends."
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedSection delay={0}>
            <SegmentedTabs
              items={[
                { key: '3m', label: '3 months' },
                { key: '6m', label: '6 months' },
                { key: '12m', label: '12 months' },
              ]}
              value={period}
              onChange={v => setPeriod(v as '3m' | '6m' | '12m')}
            />
          </AnimatedSection>

          <AnimatedSection delay={60}>
            <AppCard>
              <AppText variant="heading">Monthly trends</AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.subtitle}>
                Income (green) vs Expense (orange)
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                <View style={styles.chartWrap}>
                  <BarChart data={barChartData} />
                </View>
              </ScrollView>
            </AppCard>
          </AnimatedSection>

          <AnimatedSection delay={120}>
            <AppCard>
              <AppText variant="heading">Expense by category</AppText>
              {expenseSlices.length ? (
                <View style={styles.donutRow}>
                  <DonutChart
                    slices={expenseSlices}
                    centerLabel={formatCurrency(totalExpense, currency)}
                  />
                  <View style={styles.legendWrap}>
                    {expenseSlices.map(slice => (
                      <View key={slice.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                        <AppText variant="caption" numberOfLines={1}>
                          {slice.label}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <EmptyState title="No expenses" description="Add expenses to see breakdown." />
              )}
            </AppCard>
          </AnimatedSection>

          <AnimatedSection delay={180}>
            <AppCard>
              <AppText variant="heading">Income by category</AppText>
              {incomeSlices.length ? (
                <View style={styles.donutRow}>
                  <DonutChart
                    slices={incomeSlices}
                    centerLabel={formatCurrency(totalIncome, currency)}
                  />
                  <View style={styles.legendWrap}>
                    {incomeSlices.map(slice => (
                      <View key={slice.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                        <AppText variant="caption" numberOfLines={1}>
                          {slice.label}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <EmptyState title="No income" description="Add income to see breakdown." />
              )}
            </AppCard>
          </AnimatedSection>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  subtitle: { marginTop: spacing.xs },
  chartScroll: { marginTop: spacing.md },
  chartWrap: { alignItems: 'center', paddingHorizontal: spacing.sm },
  donutRow: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legendWrap: { flex: 1, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
