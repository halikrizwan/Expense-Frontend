import { TransactionType } from '../types/entities';

export interface SeedCategory {
  name: string;
  type: TransactionType;
}

export const seedCategories: SeedCategory[] = [
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Investment', type: 'income' },
  { name: 'Food', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Health', type: 'expense' },
  { name: 'Other', type: 'expense' },
];
