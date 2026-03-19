import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  addBudgetApi,
  deleteBudgetApi,
  getBudgetsApi,
  updateBudgetApi,
} from '../services/backend';
import { Budget } from '../types/entities';

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getBudgetsApi();
      setBudgets(list);
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

  const add = useCallback(
    async (payload: { categoryId: string; amount: number }) => {
      const item = await addBudgetApi(payload);
      await refresh();
      return item.id;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, payload: { amount: number }) => {
      await updateBudgetApi(id, payload);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteBudgetApi(id);
      await refresh();
    },
    [refresh],
  );

  return { budgets, loading, refresh, add, update, remove };
};
