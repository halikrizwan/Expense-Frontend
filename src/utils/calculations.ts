import {
  Debt,
  DebtPayment,
  SplitBalance,
  SplitExpense,
  SplitParticipant,
  Settlement,
  Transaction,
} from '../types/entities';

export const calculateTransactionTotals = (transactions: Transaction[]) => {
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
};

export const calculateDebtTotals = (debts: Debt[]) => {
  const totalDebtIOwe = debts
    .filter(debt => debt.direction === 'i_owe' && debt.status === 'open')
    .reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalDebtOwedToMe = debts
    .filter(debt => debt.direction === 'owed_to_me' && debt.status === 'open')
    .reduce((sum, debt) => sum + debt.remainingAmount, 0);

  return {
    totalDebtIOwe,
    totalDebtOwedToMe,
  };
};

export const applyDebtPayment = (debt: Debt, paymentAmount: number) => {
  const remainingAmount = Math.max(0, debt.remainingAmount - paymentAmount);
  const status: 'open' | 'settled' =
    remainingAmount <= 0 ? 'settled' : 'open';
  return { remainingAmount, status };
};

export const calculateSplitBalances = (
  splitExpenses: SplitExpense[],
  splitParticipants: SplitParticipant[],
  settlements: Settlement[],
): SplitBalance[] => {
  const netByPerson: Record<string, number> = {};

  splitExpenses.forEach(expense => {
    netByPerson[expense.payerPersonId] =
      (netByPerson[expense.payerPersonId] || 0) + expense.totalAmount;
  });

  splitParticipants.forEach(participant => {
    netByPerson[participant.personId] =
      (netByPerson[participant.personId] || 0) - participant.shareAmount;
  });

  settlements.forEach(settlement => {
    netByPerson[settlement.fromPersonId] =
      (netByPerson[settlement.fromPersonId] || 0) + settlement.amount;
    netByPerson[settlement.toPersonId] =
      (netByPerson[settlement.toPersonId] || 0) - settlement.amount;
  });

  const debtors = Object.entries(netByPerson)
    .filter(([, net]) => net < -0.01)
    .map(([personId, net]) => ({ personId, amount: Math.abs(net) }));
  const creditors = Object.entries(netByPerson)
    .filter(([, net]) => net > 0.01)
    .map(([personId, amount]) => ({ personId, amount }));

  const balances: SplitBalance[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    balances.push({
      fromPersonId: debtor.personId,
      toPersonId: creditor.personId,
      amount,
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount <= 0.01) {
      debtorIndex += 1;
    }
    if (creditor.amount <= 0.01) {
      creditorIndex += 1;
    }
  }

  return balances;
};

export const sortByDateDesc = <T extends { date: string }>(items: T[]) =>
  [...items].sort((a, b) => (a.date < b.date ? 1 : -1));

export const countDebtPaymentsByDebtId = (payments: DebtPayment[]) => {
  const map: Record<string, number> = {};
  payments.forEach(payment => {
    map[payment.debtId] = (map[payment.debtId] || 0) + 1;
  });
  return map;
};
