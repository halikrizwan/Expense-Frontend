import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useBudgets } from './useBudgets';
import { useDebts } from './useDebts';
import { useRecurring } from './useRecurring';
import { useTransactions } from './useTransactions';
import { useUserRequests } from './useUserRequests';

export interface AppNotificationItem {
  id: string;
  kind:
    | 'user_request'
    | 'debt_overdue'
    | 'debt_due_today'
    | 'debt_due_soon'
    | 'recurring_due_today'
    | 'recurring_due_soon'
    | 'budget_warning'
    | 'budget_exceeded';
  title: string;
  message: string;
  icon: string;
  tone: 'info' | 'warning' | 'success';
  sortAt: string;
  actionUserRequestId?: string;
}

const isSameMonth = (value?: string | null) => {
  if (!value) return false;
  return dayjs(value).isSame(dayjs(), 'month');
};

export const useNotifications = () => {
  const {
    requests,
    loading: requestsLoading,
    refreshCount,
    refreshRequests,
    acceptRequest,
    declineRequest,
  } = useUserRequests();
  const { debts, peopleMap, loading: debtsLoading, refresh: refreshDebts } = useDebts();
  const { recurring, loading: recurringLoading, refresh: refreshRecurring } = useRecurring();
  const { budgets, loading: budgetsLoading, refresh: refreshBudgets } = useBudgets();
  const { transactions, categoryMap, loading: transactionsLoading, refresh: refreshTransactions } = useTransactions();

  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      refreshRequests(),
      refreshCount(),
      refreshDebts(),
      refreshRecurring(),
      refreshBudgets(),
      refreshTransactions(),
    ]);
  }, [refreshBudgets, refreshCount, refreshDebts, refreshRecurring, refreshRequests, refreshTransactions]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications]),
  );

  const notifications = useMemo(() => {
    const today = dayjs().startOf('day');
    const endOfMonthDay = today.endOf('month').date();
    const expenseSpentByCategory = transactions.reduce<Record<string, number>>((acc, tx) => {
      if (tx.type === 'expense' && dayjs(tx.date).isSame(today, 'month')) {
        acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
      }
      return acc;
    }, {});

    const items: AppNotificationItem[] = requests.map(request => ({
      id: `request_${request.requesterUserId}`,
      kind: 'user_request',
      title: 'New user request',
      message: `${request.requesterName} sent you a connection request.`,
      icon: 'account-plus-outline',
      tone: 'info',
      sortAt: request.createdAt,
      actionUserRequestId: request.requesterUserId,
    }));

    debts
      .filter(debt => debt.status === 'open')
      .forEach(debt => {
        const dueDate = dayjs(debt.dueDate || debt.date).startOf('day');
        const diff = dueDate.diff(today, 'day');
        const personName = peopleMap[debt.personId]?.name || 'Unknown';

        if (diff < 0) {
          items.push({
            id: `debt_overdue_${debt.id}`,
            kind: 'debt_overdue',
            title: 'Debt repayment overdue',
            message: `${personName} debt is overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}.`,
            icon: 'alert-circle-outline',
            tone: 'warning',
            sortAt: dueDate.toISOString(),
          });
        } else if (diff === 0) {
          items.push({
            id: `debt_today_${debt.id}`,
            kind: 'debt_due_today',
            title: 'Debt repayment due today',
            message: `${personName} debt needs attention today.`,
            icon: 'calendar-alert-outline',
            tone: 'warning',
            sortAt: dueDate.toISOString(),
          });
        } else if (diff <= 3) {
          items.push({
            id: `debt_soon_${debt.id}`,
            kind: 'debt_due_soon',
            title: 'Debt repayment coming up',
            message: `${personName} debt is due in ${diff} day${diff === 1 ? '' : 's'}.`,
            icon: 'calendar-clock-outline',
            tone: 'info',
            sortAt: dueDate.toISOString(),
          });
        }
      });

    recurring
      .filter(item => item.isActive)
      .forEach(item => {
        if (isSameMonth(item.lastProcessedAt)) return;

        const dueDay = Math.min(item.dayOfMonth, endOfMonthDay);
        const dueDate = today.date(dueDay);
        const diff = dueDate.diff(today, 'day');
        const label = item.label || categoryMap[item.categoryId]?.name || 'Monthly entry';
        const kind = item.type === 'income' ? 'Auto credit' : 'Auto debit';

        if (diff === 0) {
          items.push({
            id: `recurring_today_${item.id}`,
            kind: 'recurring_due_today',
            title: `${kind} due today`,
            message: `${label} is scheduled for today and will be added this month.`,
            icon: item.type === 'income' ? 'cash-plus' : 'cash-minus',
            tone: 'info',
            sortAt: dueDate.toISOString(),
          });
        } else if (diff > 0 && diff <= 3) {
          items.push({
            id: `recurring_soon_${item.id}`,
            kind: 'recurring_due_soon',
            title: `${kind} coming up`,
            message: `${label} will be added in ${diff} day${diff === 1 ? '' : 's'}.`,
            icon: item.type === 'income' ? 'calendar-plus' : 'calendar-minus',
            tone: 'info',
            sortAt: dueDate.toISOString(),
          });
        }
      });

    budgets.forEach(budget => {
      const spent = expenseSpentByCategory[budget.categoryId] || 0;
      const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const categoryName = categoryMap[budget.categoryId]?.name || 'Budget';

      if (percent > 100) {
        items.push({
          id: `budget_over_${budget.id}`,
          kind: 'budget_exceeded',
          title: 'Budget exceeded',
          message: `${categoryName} budget is over limit for this month.`,
          icon: 'alert',
          tone: 'warning',
          sortAt: today.toISOString(),
        });
      } else if (percent >= 90) {
        items.push({
          id: `budget_warn_${budget.id}`,
          kind: 'budget_warning',
          title: 'Budget almost reached',
          message: `${categoryName} budget has reached ${percent.toFixed(0)}% this month.`,
          icon: 'alert-outline',
          tone: 'info',
          sortAt: today.toISOString(),
        });
      }
    });

    return items.sort((a, b) => dayjs(b.sortAt).valueOf() - dayjs(a.sortAt).valueOf());
  }, [budgets, categoryMap, debts, peopleMap, recurring, requests, transactions]);

  return {
    notifications,
    count: notifications.length,
    loading: requestsLoading || debtsLoading || recurringLoading || budgetsLoading || transactionsLoading,
    refreshNotifications,
    acceptRequest,
    declineRequest,
  };
};
