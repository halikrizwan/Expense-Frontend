export type TransactionType = 'income' | 'expense';
export type DebtDirection = 'i_owe' | 'owed_to_me';
export type DebtStatus = 'open' | 'settled';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  categoryId: string;
  amount: number;
  label: string;
  dayOfMonth: number;
  isActive: boolean;
  /** Last calendar day the schedule runs (inclusive). Omitted/null = permanent until edited. */
  endsAt?: string | null;
  /** In-app reminders for this schedule (default true if omitted). */
  notifyEnabled?: boolean;
  lastProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  categoryId: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionBillAttachment {
  id: string;
  transactionId: string;
  fileName: string;
  fileUri: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  personId: string;
  direction: DebtDirection;
  originalAmount: number;
  remainingAmount: number;
  note: string;
  date: string;
  dueDate: string;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitExpense {
  id: string;
  groupId: string;
  title: string;
  payerPersonId: string;
  totalAmount: number;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitParticipant {
  id: string;
  splitExpenseId: string;
  personId: string;
  shareAmount: number;
  createdAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface AppSettings {
  currency: string;
  theme?: 'light' | 'dark';
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  totalDebtIOwe: number;
  totalDebtOwedToMe: number;
}

export interface SplitBalance {
  fromPersonId: string;
  toPersonId: string;
  amount: number;
}
