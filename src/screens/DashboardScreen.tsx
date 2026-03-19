import React, { memo, useEffect, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AnimatedSection, AppCard, AppHeader, AppText, DonutChart, EmptyState, Loading } from '../components';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../constants/theme';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useNotifications } from '../hooks/useNotifications';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { DashboardStackParamList } from '../navigation/types';
import { useTransactions } from '../hooks/useTransactions';
import { subscribeRefresh } from '../services/refreshBus';
import { Transaction } from '../types/entities';
import { formatCurrency, formatDate } from '../utils/format';

const quickActions = [
  { key: 'Income', icon: 'arrow-down-bold-circle-outline', tab: 'TransactionsTab' },
  { key: 'Expense', icon: 'arrow-up-bold-circle-outline', tab: 'TransactionsTab' },
  { key: 'Debt', icon: 'hand-coin-outline', tab: 'DebtsTab' },
  { key: 'Split', icon: 'account-group-outline', tab: 'SplitsTab' },
] as const;

const ActivityRow = memo(({ item, currency }: { item: Transaction; currency: string }) => (
  <Animated.View entering={FadeInDown.duration(320)} style={styles.activityRow}>
    <View style={[styles.activityIcon, item.type === 'income' ? styles.incomeBg : styles.expenseBg]}>
      <Icon
        name={item.type === 'income' ? 'arrow-down-bold' : 'arrow-up-bold'}
        size={14}
        color={item.type === 'income' ? colors.success : colors.secondary}
      />
    </View>
    <View style={styles.activityMeta}>
      <AppText variant="bodyStrong">{item.note || (item.type === 'income' ? 'Income' : 'Expense')}</AppText>
      <AppText variant="caption" color={colors.textSecondary}>{formatDate(item.date)}</AppText>
    </View>
    <AppText variant="bodyStrong" color={item.type === 'income' ? colors.success : colors.secondary}>
      {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount, currency)}
    </AppText>
  </Animated.View>
));

const QuickActionButton = ({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.quickItemWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.95, { duration: 90 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
        style={styles.quickItem}>
        <Icon name={icon} size={18} color={colors.primary} />
        <AppText variant="caption" color={colors.primary}>{label}</AppText>
      </Pressable>
    </Animated.View>
  );
};

export const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useAppTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { user } = useAuth();
  const { summary, recentActivity, payments, loading, refresh } = useDashboardSummary();
  const { count: notificationCount, refreshNotifications } = useNotifications();
  const { currency } = useSettingsCurrency();
  const { transactions, categoryMap, refresh: refreshTransactions } = useTransactions();
  const [activeBalanceIndex, setActiveBalanceIndex] = useState(0);
  const balanceCardWidth = width - spacing.lg * 2;

  const expenseSlices = useMemo(() => {
    const totalsByCategory: Record<string, number> = {};

    transactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        const name = categoryMap[tx.categoryId]?.name || 'Other';
        totalsByCategory[name] = (totalsByCategory[name] || 0) + tx.amount;
      });

    const palette = ['#7A3FF2', '#FF7A3D', '#2F3359', '#19A7CE', '#12B76A'];

    return Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, value], index) => ({
        label,
        value,
        color: palette[index % palette.length],
      }));
  }, [categoryMap, transactions]);

  const renderItem: ListRenderItem<Transaction> = ({ item }) => <ActivityRow item={item} currency={currency} />;

  const totalSettledAmount = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const onBalanceScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / balanceCardWidth);
    setActiveBalanceIndex(nextIndex);
  };

  useEffect(() => subscribeRefresh('dashboard', () => {
    refresh();
    refreshTransactions();
    refreshNotifications();
  }), [refresh, refreshTransactions, refreshNotifications]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, backgroundColor: themeColors.background }]}>
      <FlatList
        data={recentActivity}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        initialNumToRender={8}
        windowSize={7}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <AnimatedSection delay={0}>
              <AppHeader
                title={`Hi, ${user?.displayName || user?.email || 'User'}`}
                subtitle="Easy money overview"
                right={(
                  <View style={styles.headerRight}>
                  <Pressable onPress={() => navigation.navigate('Insights')} style={styles.bellBtn}>
                    <Icon name="lightbulb-outline" size={20} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable style={styles.bellBtn} onPress={() => navigation.navigate('Alerts')}>
                    <Icon name="bell-outline" size={20} color={colors.textSecondary} />
                    {notificationCount > 0 ? (
                      <View style={styles.bellBadge}>
                        <AppText variant="caption" color="#FFF">{notificationCount > 99 ? '99+' : String(notificationCount)}</AppText>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              )}
              />
            </AnimatedSection>

            <AnimatedSection delay={60}>
              <View style={styles.balancePagerWrap}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onBalanceScrollEnd}
                  style={styles.balancePager}
                  contentContainerStyle={styles.balancePagerContent}>
                  <View style={[styles.balanceCard, styles.balanceCardPrimary, { width: balanceCardWidth }]}>
                    <AppText variant="label" color="#E6E9FF">Total Balance</AppText>
                    <AppText variant="titleLg" color="#FFF">{formatCurrency(summary.net, currency)}</AppText>
                  </View>

                  <View style={[styles.balanceCard, styles.balanceCardSecondary, { width: balanceCardWidth }]}>
                    <AppText variant="label" color="#FFF2EA">Total Debts (Overall)</AppText>
                    <AppText variant="bodyStrong" color="#FFFFFF">I Owe: {formatCurrency(summary.totalDebtIOwe, currency)}</AppText>
                    <AppText variant="bodyStrong" color="#FFFFFF">Owed To Me: {formatCurrency(summary.totalDebtOwedToMe, currency)}</AppText>
                  </View>

                  <View style={[styles.balanceCard, styles.balanceCardTertiary, { width: balanceCardWidth }]}>
                    <AppText variant="label" color="#E7FFEF">Total Settled Amount</AppText>
                    <AppText variant="titleLg" color="#FFFFFF">{formatCurrency(totalSettledAmount, currency)}</AppText>
                  </View>
                </ScrollView>
                <View style={styles.balanceDots}>
                  {[0, 1, 2].map(index => (
                    <View
                      key={index}
                      style={[styles.dot, activeBalanceIndex === index ? styles.dotActive : styles.dotInactive]}
                    />
                  ))}
                </View>
              </View>
            </AnimatedSection>

            <AnimatedSection delay={120} style={styles.kpiRow}>
              <View style={[styles.kpiCard, styles.kpiCardPrimary]}>
                <Icon name="wallet-outline" size={16} color="#FFF" />
                <AppText variant="label" color="#F3EDFF">Total Salary</AppText>
                <AppText variant="heading" color="#FFF">{formatCurrency(summary.totalIncome, currency)}</AppText>
              </View>
              <View style={[styles.kpiCard, styles.kpiCardSecondary]}>
                <Icon name="credit-card-outline" size={16} color="#FFF" />
                <AppText variant="label" color="#FFF1E9">Total Expense</AppText>
                <AppText variant="heading" color="#FFF">{formatCurrency(summary.totalExpense, currency)}</AppText>
              </View>
            </AnimatedSection>

            <AnimatedSection delay={180}>
              <AppCard>
              <View style={styles.quickHeader}>
                <AppText variant="heading">Quick Actions</AppText>
                <Pressable onPress={() => navigation.navigate('Budgets')}>
                  <AppText variant="caption" color={colors.primary}>Budgets</AppText>
                </Pressable>
              </View>
              <View style={styles.quickWrap}>
                {quickActions.map(action => (
                  <QuickActionButton
                    key={action.key}
                    label={action.key}
                    icon={action.icon}
                    onPress={() => navigation.getParent()?.navigate(action.tab)}
                  />
                ))}
              </View>
              </AppCard>
            </AnimatedSection>

            <AnimatedSection delay={240}>
              <AppCard>
              <View style={styles.analyticsHeader}>
                <AppText variant="heading">Analytics</AppText>
                <Pressable onPress={() => navigation.navigate('Charts')} style={styles.analyticsLink}>
                  <AppText variant="caption" color={colors.primary}>View all</AppText>
                  <Icon name="chevron-right" size={16} color={colors.primary} />
                </Pressable>
              </View>
              {expenseSlices.length ? (
                <View style={styles.analyticsRow}>
                  <DonutChart
                    slices={expenseSlices}
                    centerLabel={formatCurrency(expenseSlices.reduce((s, i) => s + i.value, 0), currency)}
                  />
                  <View style={styles.legendWrap}>
                    {expenseSlices.map(slice => (
                      <View key={slice.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                        <AppText variant="caption" numberOfLines={1}>{slice.label}</AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <EmptyState title="No expense analytics yet" description="Add expenses to view category distribution." />
              )}
              </AppCard>
            </AnimatedSection>

            <AnimatedSection delay={280}>
              <AppText variant="heading">Transactions</AppText>
            </AnimatedSection>
          </View>
        }
        ListEmptyComponent={loading ? <Loading label="Loading dashboard..." /> : <EmptyState title="No activity yet" description="Add income or expense to get started." />}
        contentContainerStyle={styles.content}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  listHeader: { gap: spacing.md },
  balancePagerWrap: {
    position: 'relative',
  },
  balancePager: {
    width: '100%',
  },
  balancePagerContent: {
    alignItems: 'stretch',
  },
  balanceCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  balanceCardPrimary: {
    backgroundColor: colors.darkCard,
    borderWidth: 1,
    borderColor: '#2D305A',
  },
  balanceCardSecondary: {
    backgroundColor: colors.secondary,
  },
  balanceCardTertiary: {
    backgroundColor: colors.success,
  },
  balanceDots: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.xl,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: { width: 24, height: 4, borderRadius: 999 },
  dotActive: { opacity: 1, backgroundColor: '#8F94FF' },
  dotInactive: { opacity: 0.35, backgroundColor: '#8F94FF' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    right: -4,
    top: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpiCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  kpiCardPrimary: { backgroundColor: colors.primary },
  kpiCardSecondary: { backgroundColor: colors.secondary },
  quickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  quickWrap: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  quickItemWrap: {
    width: '23%',
  },
  quickItem: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  analyticsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  analyticsRow: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legendWrap: { flex: 1, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  activityRow: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  incomeBg: { backgroundColor: '#EAFFF5' },
  expenseBg: { backgroundColor: '#FFF1EA' },
  activityMeta: { flex: 1 },
});
