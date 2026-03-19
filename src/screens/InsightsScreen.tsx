import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { AnimatedSection, AppCard, AppHeader, AppText } from '../components';
import { useAppTheme } from '../context/ThemeContext';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { useTransactions } from '../hooks/useTransactions';
import { useBudgets } from '../hooks/useBudgets';
import { DashboardStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/format';

export const InsightsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { colors: themeColors } = useAppTheme();
  const { currency } = useSettingsCurrency();
  const { transactions, categoryMap } = useTransactions();
  const { budgets } = useBudgets();

  const thisMonth = dayjs().format('YYYY-MM');
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');

  const insights = useMemo(() => {
    const result: Array<{ id: string; icon: string; title: string; body: string; type: 'info' | 'warning' | 'success' }> = [];

    const thisMonthExpenses = transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(thisMonth))
      .reduce((s, t) => s + t.amount, 0);
    const lastMonthExpenses = transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(lastMonth))
      .reduce((s, t) => s + t.amount, 0);

    const expenseChange = lastMonthExpenses > 0
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : 0;

    if (expenseChange > 20 && thisMonthExpenses > 0) {
      result.push({
        id: 'spend-up',
        icon: 'trending-up',
        title: 'Spending increased',
        body: `Your expenses are ${expenseChange.toFixed(0)}% higher than last month. Consider reviewing your budget.`,
        type: 'warning',
      });
    } else if (expenseChange < -10 && lastMonthExpenses > 0) {
      result.push({
        id: 'spend-down',
        icon: 'trending-down',
        title: 'Spending decreased',
        body: `Great! Your expenses are ${Math.abs(expenseChange).toFixed(0)}% lower than last month.`,
        type: 'success',
      });
    }

    const byCategory: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(thisMonth))
      .forEach(tx => {
        const name = categoryMap[tx.categoryId]?.name || 'Other';
        byCategory[name] = (byCategory[name] || 0) + tx.amount;
      });

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && thisMonthExpenses > 0) {
      const pct = (topCategory[1] / thisMonthExpenses) * 100;
      result.push({
        id: 'top-cat',
        icon: 'chart-pie',
        title: 'Top spending category',
        body: `${topCategory[0]} accounts for ${pct.toFixed(0)}% of your expenses (${formatCurrency(topCategory[1], currency)}).`,
        type: 'info',
      });
    }

    budgets.forEach(b => {
      const spent = transactions
        .filter(tx => tx.type === 'expense' && tx.categoryId === b.categoryId && tx.date.startsWith(thisMonth))
        .reduce((s, t) => s + t.amount, 0);
      const pct = (spent / b.amount) * 100;
      if (pct >= 90 && pct <= 100) {
        result.push({
          id: `budget-near-${b.id}`,
          icon: 'alert-circle-outline',
          title: 'Budget nearly reached',
          body: `You've used ${pct.toFixed(0)}% of your ${categoryMap[b.categoryId]?.name || 'category'} budget.`,
          type: 'warning',
        });
      } else if (pct > 100) {
        result.push({
          id: `budget-over-${b.id}`,
          icon: 'alert',
          title: 'Budget exceeded',
          body: `You've exceeded your ${categoryMap[b.categoryId]?.name || 'category'} budget by ${formatCurrency(spent - b.amount, currency)}.`,
          type: 'warning',
        });
      }
    });

    const avgDaily = thisMonthExpenses / Math.max(1, dayjs().date());
    const daysLeft = dayjs().endOf('month').date() - dayjs().date();
    const projectedMonthEnd = avgDaily * dayjs().endOf('month').date();
    if (thisMonthExpenses > 0 && daysLeft > 0) {
      result.push({
        id: 'projection',
        icon: 'calendar-clock',
        title: 'Monthly projection',
        body: `At current pace, you'll spend ~${formatCurrency(projectedMonthEnd, currency)} by month end.`,
        type: 'info',
      });
    }

    if (result.length === 0) {
      result.push({
        id: 'empty',
        icon: 'lightbulb-outline',
        title: 'Keep tracking',
        body: 'Add more transactions to get personalized insights and spending trends.',
        type: 'info',
      });
    }

    return result;
  }, [transactions, categoryMap, budgets, thisMonth, lastMonth, currency]);

  const iconColor = (type: string) =>
    type === 'warning' ? colors.secondary : type === 'success' ? colors.success : colors.primary;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, backgroundColor: themeColors.background }]}>
      <AppHeader
        title="Insights"
        subtitle="Smart spending analysis"
        left={
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={themeColors.textPrimary} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {insights.map((insight, i) => (
          <AnimatedSection key={insight.id} delay={i * 60}>
            <AppCard>
              <View style={styles.insightRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${iconColor(insight.type)}20` }]}>
                  <Icon name={insight.icon as any} size={24} color={iconColor(insight.type)} />
                </View>
                <View style={styles.insightBody}>
                  <AppText variant="bodyStrong">{insight.title}</AppText>
                  <AppText variant="body" color={colors.textSecondary} style={styles.insightText}>
                    {insight.body}
                  </AppText>
                </View>
              </View>
            </AppCard>
          </AnimatedSection>
        ))}
      </ScrollView>
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
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  insightBody: { flex: 1 },
  insightText: { marginTop: spacing.xs },
});
