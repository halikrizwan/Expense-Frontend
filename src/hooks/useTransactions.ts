import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  addCategoryApi,
  addTransactionApi,
  deleteTransactionApi,
  getCategoriesApi,
  getTransactionsApi,
  TransactionFilters,
  updateTransactionApi,
} from '../services/backend';
import { Category, Transaction, TransactionType } from '../types/entities';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [txList, categoryList] = await Promise.all([
        getTransactionsApi(filters),
        getCategoriesApi(),
      ]);
      setTransactions(txList);
      setCategories(categoryList);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const add = useCallback(
    async (payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const item = await addTransactionApi(payload);
      await refresh();
      return item.id;
    },
    [refresh],
  );

  const update = useCallback(
    async (
      id: string,
      payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      await updateTransactionApi(id, payload);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTransactionApi(id);
      await refresh();
    },
    [refresh],
  );

  const addNewCategory = useCallback(
    async (name: string, type: TransactionType) => {
      await addCategoryApi({ name, type });
      await refresh();
    },
    [refresh],
  );

  const categoryMap = useMemo(() => {
    return categories.reduce<Record<string, Category>>((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {});
  }, [categories]);

  return {
    transactions,
    categories,
    categoryMap,
    filters,
    setFilters,
    loading,
    refresh,
    add,
    update,
    remove,
    addNewCategory,
  };
};
