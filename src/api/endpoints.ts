import { apiRequest } from './client';
import {
  Budget,
  Category,
  RecurringTransaction,
  DashboardSummary,
  Debt,
  DebtPayment,
  Group,
  Person,
  Settlement,
  SplitExpense,
  SplitParticipant,
  Transaction,
  TransactionBillAttachment,
  TransactionType,
} from '../types/entities';

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName?: string | null };
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const signupApi = (payload: { email: string; password: string; displayName?: string }) =>
  apiRequest<{ user: { id: string; email: string; displayName?: string | null } }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const loginApi = (payload: { email: string; password: string }) =>
  apiRequest<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const meApi = () =>
  apiRequest<{ user: { id: string; email: string; displayName?: string | null } }>('/auth/me');

export const refreshApi = (refreshToken: string) =>
  apiRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

export const logoutApi = (refreshToken: string) =>
  apiRequest<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });

export const getSettingsApi = () =>
  apiRequest<{ currency: string; theme: 'light' | 'dark' }>('/settings');

export const updateSettingsApi = (payload: { currency?: string; theme?: 'light' | 'dark' }) =>
  apiRequest<void>('/settings', { method: 'PUT', body: JSON.stringify(payload) });

export const getCategoriesApi = (type?: TransactionType) =>
  apiRequest<Category[]>(`/categories${type ? `?type=${type}` : ''}`);

export const addCategoryApi = (payload: { name: string; type: TransactionType }) =>
  apiRequest<Category>('/categories', { method: 'POST', body: JSON.stringify(payload) });

export const updateCategoryApi = (id: string, payload: { name: string; type: TransactionType }) =>
  apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteCategoryApi = (id: string) => apiRequest<void>(`/categories/${id}`, { method: 'DELETE' });

export const getBudgetsApi = () => apiRequest<Budget[]>('/budgets');
export const addBudgetApi = (payload: { categoryId: string; amount: number }) =>
  apiRequest<Budget>('/budgets', { method: 'POST', body: JSON.stringify(payload) });
export const updateBudgetApi = (id: string, payload: { amount: number }) =>
  apiRequest<Budget>(`/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteBudgetApi = (id: string) => apiRequest<void>(`/budgets/${id}`, { method: 'DELETE' });

export const getRecurringApi = () => apiRequest<RecurringTransaction[]>('/recurring');
export const addRecurringApi = (payload: {
  type: 'income' | 'expense';
  categoryId: string;
  amount: number;
  label?: string;
  dayOfMonth: number;
}) =>
  apiRequest<RecurringTransaction>('/recurring', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const updateRecurringApi = (
  id: string,
  payload: {
    type?: 'income' | 'expense';
    categoryId?: string;
    amount?: number;
    label?: string;
    dayOfMonth?: number;
    isActive?: boolean;
  },
) =>
  apiRequest<RecurringTransaction>(`/recurring/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
export const deleteRecurringApi = (id: string) =>
  apiRequest<void>(`/recurring/${id}`, { method: 'DELETE' });

export interface TransactionFilters {
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionsResponse {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export const getTransactionsApi = (filters?: TransactionFilters) => {
  const query = new URLSearchParams();
  if (filters?.fromDate) query.set('fromDate', filters.fromDate);
  if (filters?.toDate) query.set('toDate', filters.toDate);
  if (filters?.type) query.set('type', filters.type);
  if (filters?.categoryId) query.set('categoryId', filters.categoryId);
  if (filters?.limit != null) query.set('limit', String(filters.limit));
  if (filters?.offset != null) query.set('offset', String(filters.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<TransactionsResponse>(`/transactions${suffix}`);
};

export const addTransactionApi = (payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
  apiRequest<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(payload) });

export const updateTransactionApi = (id: string, payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
  apiRequest<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteTransactionApi = (id: string) => apiRequest<void>(`/transactions/${id}`, { method: 'DELETE' });

export const getTransactionBillsApi = (transactionId: string) =>
  apiRequest<TransactionBillAttachment[]>(`/transactions/${transactionId}/bills`);

export const addTransactionBillApi = (
  transactionId: string,
  payload: { fileName: string; fileUri: string; mimeType?: string; size?: number },
) =>
  apiRequest<TransactionBillAttachment>(`/transactions/${transactionId}/bills`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteTransactionBillApi = (transactionId: string, billId: string) =>
  apiRequest<void>(`/transactions/${transactionId}/bills/${billId}`, { method: 'DELETE' });

export const getPeopleApi = () => apiRequest<Person[]>('/people');
export const addPersonApi = (name: string) =>
  apiRequest<Person>('/people', { method: 'POST', body: JSON.stringify({ name }) });
export const addPersonFromUserApi = (userId: string) =>
  apiRequest<Person>('/people/link-user', { method: 'POST', body: JSON.stringify({ userId }) });
export const updatePersonApi = (id: string, name: string) =>
  apiRequest<Person>(`/people/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
export const deletePersonApi = (id: string) => apiRequest<void>(`/people/${id}`, { method: 'DELETE' });

export const getDebtsApi = () => apiRequest<Debt[]>('/debts');
export const addDebtApi = (payload: {
  personId: string;
  direction: Debt['direction'];
  originalAmount: number;
  note: string;
  date: string;
  dueDate: string;
}) => apiRequest<Debt>('/debts', { method: 'POST', body: JSON.stringify(payload) });
export const updateDebtApi = (id: string, payload: {
  personId: string;
  direction: Debt['direction'];
  originalAmount: number;
  note: string;
  date: string;
  dueDate: string;
}) => apiRequest<Debt>(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteDebtApi = (id: string) => apiRequest<void>(`/debts/${id}`, { method: 'DELETE' });
export const getDebtPaymentsApi = () => apiRequest<DebtPayment[]>('/debts/payments/all');
export const addDebtPaymentApi = (id: string, payload: { amount: number; date: string; note: string }) =>
  apiRequest<DebtPayment>(`/debts/${id}/payments`, { method: 'POST', body: JSON.stringify(payload) });

export const getGroupsApi = () => apiRequest<Group[]>('/groups');
export const addGroupApi = (name: string) =>
  apiRequest<Group>('/groups', { method: 'POST', body: JSON.stringify({ name }) });
export const updateGroupApi = (id: string, name: string) =>
  apiRequest<Group>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
export const deleteGroupApi = (id: string) => apiRequest<void>(`/groups/${id}`, { method: 'DELETE' });

export const getSplitExpensesApi = () => apiRequest<SplitExpense[]>('/splits/expenses');
export const getSplitParticipantsApi = () => apiRequest<SplitParticipant[]>('/splits/participants');
export const addSplitExpenseApi = (payload: {
  groupId: string;
  title: string;
  payerPersonId: string;
  totalAmount: number;
  date: string;
  note: string;
  participantPersonIds: string[];
}) =>
  apiRequest<SplitExpense>('/splits/expenses', { method: 'POST', body: JSON.stringify(payload) });

export const getSettlementsApi = () => apiRequest<Settlement[]>('/splits/settlements');
export const addSettlementApi = (payload: {
  groupId: string;
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  date: string;
  note: string;
}) =>
  apiRequest<Settlement>('/splits/settlements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getDashboardSummaryApi = () =>
  apiRequest<{ summary: DashboardSummary; recentActivity: Transaction[]; payments: DebtPayment[] }>('/dashboard/summary');

export const exportFullApi = () => apiRequest<Record<string, unknown>>('/data/full');
export const resetAllApi = () => apiRequest<void>('/data/reset', { method: 'DELETE' });
export const importFullApi = (payload: Record<string, unknown>) =>
  apiRequest<void>('/data/import', { method: 'POST', body: JSON.stringify(payload) });

export const searchUsersApi = (q: string) =>
  apiRequest<Array<{ id: string; email: string; displayName?: string | null }>>(
    `/users/search?q=${encodeURIComponent(q)}`,
  );

export const getMyProfileApi = () =>
  apiRequest<{ user: UserProfile }>('/users/me');

export const updateMyProfileApi = (payload: {
  email?: string;
  displayName?: string | null;
  currentPassword?: string;
  newPassword?: string;
}) =>
  apiRequest<{ user: UserProfile }>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export interface UserRequest {
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
}

export const sendUserRequestApi = (targetUserId: string) =>
  apiRequest<{ ok: true }>('/users/requests', {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });

export const getUserRequestsApi = () => apiRequest<UserRequest[]>('/users/requests');
export const getUserRequestCountApi = () => apiRequest<{ count: number }>('/users/requests/count');
export const acceptUserRequestApi = (requesterUserId: string) =>
  apiRequest<{ ok: true; personId: string }>(`/users/requests/${requesterUserId}/accept`, { method: 'POST' });
export const declineUserRequestApi = (requesterUserId: string) =>
  apiRequest<{ ok: true }>(`/users/requests/${requesterUserId}/decline`, { method: 'POST' });
