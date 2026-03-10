import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  addGroupApi,
  addSettlementApi,
  addSplitExpenseApi,
  getGroupsApi,
  getPeopleApi,
  getSettlementsApi,
  getSplitExpensesApi,
  getSplitParticipantsApi,
} from '../services/backend';
import {
  Group,
  Person,
  Settlement,
  SplitBalance,
  SplitExpense,
  SplitParticipant,
} from '../types/entities';
import { calculateSplitBalances } from '../utils/calculations';

interface AddSplitInput {
  groupId: string;
  title: string;
  payerPersonId: string;
  totalAmount: number;
  date: string;
  note: string;
  participantPersonIds: string[];
}

interface AddSettlementInput {
  groupId: string;
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  date: string;
  note: string;
}

export const useSplits = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [splitExpenses, setSplitExpenses] = useState<SplitExpense[]>([]);
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>(
    [],
  );
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [groupRows, peopleRows, expenseRows, participantRows, settlementRows] =
        await Promise.all([
          getGroupsApi(),
          getPeopleApi(),
          getSplitExpensesApi(),
          getSplitParticipantsApi(),
          getSettlementsApi(),
        ]);

      setGroups(groupRows);
      setPeople(peopleRows);
      setSplitExpenses(expenseRows);
      setSplitParticipants(participantRows);
      setSettlements(settlementRows);
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

  const addNewGroup = useCallback(
    async (name: string) => {
      await addGroupApi(name);
      await refresh();
    },
    [refresh],
  );

  const addNewSplit = useCallback(
    async (payload: AddSplitInput) => {
      if (payload.participantPersonIds.length < 2) {
        throw new Error('At least 2 participants are required for a split.');
      }
      await addSplitExpenseApi(payload);
      await refresh();
    },
    [refresh],
  );

  const addNewSettlement = useCallback(
    async (payload: AddSettlementInput) => {
      await addSettlementApi(payload);
      await refresh();
    },
    [refresh],
  );

  const balances: SplitBalance[] = useMemo(
    () => calculateSplitBalances(splitExpenses, splitParticipants, settlements),
    [settlements, splitExpenses, splitParticipants],
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
    groups,
    people,
    splitExpenses,
    splitParticipants,
    settlements,
    balances,
    peopleMap,
    loading,
    refresh,
    addNewGroup,
    addNewSplit,
    addNewSettlement,
  };
};
