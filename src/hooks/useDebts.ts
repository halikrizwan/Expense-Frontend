import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  addDebtApi,
  addDebtPaymentApi,
  addPersonApi,
  deleteDebtApi,
  getDebtPaymentsApi,
  getDebtsApi,
  getPeopleApi,
  updateDebtApi,
} from '../services/backend';
import { Debt, DebtDirection, DebtPayment, Person } from '../types/entities';

interface AddDebtInput {
  personId: string;
  direction: DebtDirection;
  originalAmount: number;
  note: string;
  date: string;
  dueDate: string;
}

interface UpdateDebtInput extends AddDebtInput {
  id: string;
}

export const useDebts = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [peopleRows, debtRows, paymentRows] = await Promise.all([
        getPeopleApi(),
        getDebtsApi(),
        getDebtPaymentsApi(),
      ]);
      setPeople(peopleRows);
      setDebts(debtRows);
      setPayments(paymentRows);
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

  const addNewPerson = useCallback(
    async (name: string) => {
      await addPersonApi(name);
      await refresh();
    },
    [refresh],
  );

  const addNewDebt = useCallback(
    async (payload: AddDebtInput) => {
      await addDebtApi(payload);
      await refresh();
    },
    [refresh],
  );

  const addPayment = useCallback(
    async (debtId: string, amount: number, date: string, note: string) => {
      await addDebtPaymentApi(debtId, { amount, date, note });
      await refresh();
    },
    [refresh],
  );

  const updateExistingDebt = useCallback(
    async (payload: UpdateDebtInput) => {
      await updateDebtApi(payload.id, {
        personId: payload.personId,
        direction: payload.direction,
        originalAmount: payload.originalAmount,
        note: payload.note,
        date: payload.date,
        dueDate: payload.dueDate,
      });
      await refresh();
    },
    [refresh],
  );

  const removeDebt = useCallback(
    async (debtId: string) => {
      await deleteDebtApi(debtId);
      await refresh();
    },
    [refresh],
  );

  const peopleMap = useMemo(
    () =>
      people.reduce<Record<string, Person>>((acc, person) => {
        acc[person.id] = person;
        return acc;
      }, {}),
    [people],
  );

  return {
    people,
    debts,
    payments,
    peopleMap,
    loading,
    refresh,
    addNewPerson,
    addNewDebt,
    updateExistingDebt,
    removeDebt,
    addPayment,
  };
};
