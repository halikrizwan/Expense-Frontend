import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  addRecurringApi,
  deleteRecurringApi,
  getRecurringApi,
  updateRecurringApi,
} from '../services/backend';
import { RecurringTransaction } from '../types/entities';

export const useRecurring = () => {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getRecurringApi();
      setRecurring(list);
    } catch {
      // Keep previous data
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
    async (payload: {
      type: 'income' | 'expense';
      categoryId: string;
      amount: number;
      label?: string;
      dayOfMonth: number;
      endsAt?: string | null;
      notifyEnabled?: boolean;
    }) => {
      const item = await addRecurringApi(payload);
      await refresh();
      return item.id;
    },
    [refresh],
  );

  const update = useCallback(
    async (
      id: string,
      payload: {
        type?: 'income' | 'expense';
        categoryId?: string;
        amount?: number;
        label?: string;
        dayOfMonth?: number;
        isActive?: boolean;
        endsAt?: string | null;
        notifyEnabled?: boolean;
      },
    ) => {
      await updateRecurringApi(id, payload);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRecurringApi(id);
      await refresh();
    },
    [refresh],
  );

  return { recurring, loading, refresh, add, update, remove };
};
