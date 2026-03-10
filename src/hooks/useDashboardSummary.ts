import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getDashboardSummaryApi } from '../services/backend';
import { DashboardSummary, DebtPayment, Transaction } from '../types/entities';

export const useDashboardSummary = () => {
  const [recentActivity, setRecentActivity] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
    totalDebtIOwe: 0,
    totalDebtOwedToMe: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardSummaryApi();
      setSummary(data.summary);
      setRecentActivity(data.recentActivity);
      setPayments(data.payments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return {
    summary,
    recentActivity,
    payments,
    loading,
    refresh,
  };
};
