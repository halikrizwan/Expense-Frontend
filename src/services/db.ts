/**
 * @deprecated This module is unused. The app uses the backend API exclusively.
 * Kept for reference; safe to remove along with react-native-sqlite-storage dependency.
 */
import SQLite from 'react-native-sqlite-storage';
import { seedCategories } from '../constants/categories';
import { ThemeMode } from '../constants/theme';
import {
  Category,
  Debt,
  DebtPayment,
  Group,
  Person,
  Settlement,
  SplitExpense,
  SplitParticipant,
  TransactionBillAttachment,
  Transaction,
  TransactionType,
} from '../types/entities';
import { nowIso } from '../utils/format';
import { createId } from '../utils/ids';

SQLite.enablePromise(true);

type SQLParam = string | number | null;

const DB_NAME = 'finance_local.db';

let dbInstance: any | null = null;

const openDb = async () => {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
  });
  return dbInstance;
};

const run = async (sql: string, params: SQLParam[] = []) => {
  const db = await openDb();
  const [result] = await db.executeSql(sql, params);
  return result;
};

const rows = <T>(result: any): T[] => {
  const list: T[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    list.push(result.rows.item(i));
  }
  return list;
};

const parseNumberFields = (row: Record<string, unknown>, keys: string[]) => {
  const copy: Record<string, unknown> = { ...row };
  keys.forEach(key => {
    const value = copy[key];
    if (typeof value === 'string') {
      copy[key] = Number(value);
    }
  });
  return copy;
};

export const initDatabase = async () => {
  await run('PRAGMA foreign_keys = ON;');

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(categoryId) REFERENCES categories(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      personId TEXT NOT NULL,
      direction TEXT NOT NULL,
      originalAmount REAL NOT NULL,
      remainingAmount REAL NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      dueDate TEXT DEFAULT '',
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(personId) REFERENCES people(id)
    );
  `);

  try {
    await run(`ALTER TABLE debts ADD COLUMN dueDate TEXT DEFAULT '';`);
  } catch {
    // Column already exists on upgraded databases.
  }

  await run(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debtId TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(debtId) REFERENCES debts(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transaction_bills (
      id TEXT PRIMARY KEY,
      transactionId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileUri TEXT NOT NULL,
      mimeType TEXT DEFAULT '',
      size REAL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(transactionId) REFERENCES transactions(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS groups_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS split_expenses (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      title TEXT NOT NULL,
      payerPersonId TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(groupId) REFERENCES groups_table(id),
      FOREIGN KEY(payerPersonId) REFERENCES people(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS split_participants (
      id TEXT PRIMARY KEY,
      splitExpenseId TEXT NOT NULL,
      personId TEXT NOT NULL,
      shareAmount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(splitExpenseId) REFERENCES split_expenses(id) ON DELETE CASCADE,
      FOREIGN KEY(personId) REFERENCES people(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      fromPersonId TEXT NOT NULL,
      toPersonId TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(groupId) REFERENCES groups_table(id),
      FOREIGN KEY(fromPersonId) REFERENCES people(id),
      FOREIGN KEY(toPersonId) REFERENCES people(id)
    );
  `);

  await run(
    'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);',
  );
  await run(
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);',
  );
  await run('CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);');
  await run('CREATE INDEX IF NOT EXISTS idx_debts_person ON debts(personId);');
  await run(
    'CREATE INDEX IF NOT EXISTS idx_split_expenses_group ON split_expenses(groupId);',
  );
  await run(
    'CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(groupId);',
  );
  await run(
    'CREATE INDEX IF NOT EXISTS idx_transaction_bills_transaction ON transaction_bills(transactionId);',
  );

  const existingCategories = await run('SELECT COUNT(*) as count FROM categories;');
  const count = rows<{ count: number }>(existingCategories)[0]?.count ?? 0;
  if (!count) {
    const now = nowIso();
    for (const category of seedCategories) {
      await run(
        `INSERT INTO categories (id, name, type, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?);`,
        [createId('cat'), category.name, category.type, now, now],
      );
    }
  }

  const existingCurrency = await run(
    `SELECT value FROM settings WHERE key = 'currency' LIMIT 1;`,
  );
  if (!rows(existingCurrency).length) {
    await run(`INSERT INTO settings (key, value) VALUES ('currency', 'AED');`);
  }

  const existingThemeMode = await run(
    `SELECT value FROM settings WHERE key = 'theme' LIMIT 1;`,
  );
  if (!rows(existingThemeMode).length) {
    await run(`INSERT INTO settings (key, value) VALUES ('theme', 'light');`);
  }
};

export const resetAllData = async () => {
  const db = await openDb();
  await db.transaction(async (tx: any) => {
    await tx.executeSql('DELETE FROM split_participants;');
    await tx.executeSql('DELETE FROM split_expenses;');
    await tx.executeSql('DELETE FROM settlements;');
    await tx.executeSql('DELETE FROM groups_table;');
    await tx.executeSql('DELETE FROM debt_payments;');
    await tx.executeSql('DELETE FROM debts;');
    await tx.executeSql('DELETE FROM transactions;');
    await tx.executeSql('DELETE FROM people;');
    await tx.executeSql('DELETE FROM categories;');
    await tx.executeSql('DELETE FROM settings;');
  });

  await initDatabase();
};

export const setCurrency = async (currency: string) => {
  await run(
    `INSERT OR REPLACE INTO settings (key, value)
     VALUES ('currency', ?);`,
    [currency],
  );
};

export const getCurrency = async () => {
  const result = await run(`SELECT value FROM settings WHERE key = 'currency';`);
  const value = rows<{ value: string }>(result)[0]?.value;
  return value || 'AED';
};

export const setThemeMode = async (mode: ThemeMode) => {
  await run(
    `INSERT OR REPLACE INTO settings (key, value)
     VALUES ('theme', ?);`,
    [mode],
  );
};

export const getThemeMode = async (): Promise<ThemeMode> => {
  const result = await run(`SELECT value FROM settings WHERE key = 'theme';`);
  const value = rows<{ value: string }>(result)[0]?.value;
  return value === 'dark' ? 'dark' : 'light';
};

export const getCategories = async (type?: TransactionType) => {
  const result = await run(
    `SELECT * FROM categories ${type ? 'WHERE type = ?' : ''} ORDER BY name ASC;`,
    type ? [type] : [],
  );
  return rows<Category>(result);
};

export const addCategory = async (name: string, type: TransactionType) => {
  const now = nowIso();
  const id = createId('cat');
  await run(
    `INSERT INTO categories (id, name, type, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?);`,
    [id, name, type, now, now],
  );
  return id;
};

export const updateCategory = async (
  categoryId: string,
  payload: { name: string; type: TransactionType },
) => {
  await run(
    `UPDATE categories
     SET name = ?, type = ?, updatedAt = ?
     WHERE id = ?;`,
    [payload.name, payload.type, nowIso(), categoryId],
  );
};

export const deleteCategory = async (categoryId: string) => {
  await run('DELETE FROM categories WHERE id = ?;', [categoryId]);
};

export interface TransactionFilters {
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  categoryId?: string;
}

export const getTransactions = async (filters?: TransactionFilters) => {
  const conditions: string[] = [];
  const params: SQLParam[] = [];

  if (filters?.fromDate) {
    conditions.push('date >= ?');
    params.push(filters.fromDate);
  }
  if (filters?.toDate) {
    conditions.push('date <= ?');
    params.push(filters.toDate);
  }
  if (filters?.type) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters?.categoryId) {
    conditions.push('categoryId = ?');
    params.push(filters.categoryId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await run(
    `SELECT * FROM transactions ${where} ORDER BY date DESC, createdAt DESC;`,
    params,
  );
  return rows<Record<string, unknown>>(result).map(
    item => parseNumberFields(item, ['amount']) as unknown as Transaction,
  );
};

export const addTransaction = async (
  payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const now = nowIso();
  const id = createId('txn');
  await run(
    `INSERT INTO transactions
      (id, type, categoryId, amount, note, date, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      payload.type,
      payload.categoryId,
      payload.amount,
      payload.note,
      payload.date,
      now,
      now,
    ],
  );
  return id;
};

export const updateTransaction = async (
  id: string,
  payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  await run(
    `UPDATE transactions
     SET type = ?, categoryId = ?, amount = ?, note = ?, date = ?, updatedAt = ?
     WHERE id = ?;`,
    [
      payload.type,
      payload.categoryId,
      payload.amount,
      payload.note,
      payload.date,
      nowIso(),
      id,
    ],
  );
};

export const deleteTransaction = async (id: string) => {
  await run('DELETE FROM transactions WHERE id = ?;', [id]);
};

export const getTransactionBills = async (transactionId: string) => {
  const result = await run(
    'SELECT * FROM transaction_bills WHERE transactionId = ? ORDER BY createdAt DESC;',
    [transactionId],
  );
  return rows<Record<string, unknown>>(result).map(
    item => parseNumberFields(item, ['size']) as unknown as TransactionBillAttachment,
  );
};

export const addTransactionBill = async (
  payload: Omit<TransactionBillAttachment, 'id' | 'createdAt'>,
) => {
  await run(
    `INSERT INTO transaction_bills
     (id, transactionId, fileName, fileUri, mimeType, size, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      createId('bill'),
      payload.transactionId,
      payload.fileName,
      payload.fileUri,
      payload.mimeType,
      payload.size,
      nowIso(),
    ],
  );
};

export const deleteTransactionBill = async (id: string) => {
  await run('DELETE FROM transaction_bills WHERE id = ?;', [id]);
};

export const getPeople = async () => {
  const result = await run('SELECT * FROM people ORDER BY name ASC;');
  return rows<Person>(result);
};

export const addPerson = async (name: string) => {
  const now = nowIso();
  const id = createId('person');
  await run(
    `INSERT INTO people (id, name, createdAt, updatedAt)
     VALUES (?, ?, ?, ?);`,
    [id, name, now, now],
  );
  return id;
};

export const updatePerson = async (personId: string, name: string) => {
  await run(
    `UPDATE people
     SET name = ?, updatedAt = ?
     WHERE id = ?;`,
    [name, nowIso(), personId],
  );
};

export const deletePerson = async (personId: string) => {
  await run('DELETE FROM people WHERE id = ?;', [personId]);
};

export const getDebts = async () => {
  const result = await run('SELECT * FROM debts ORDER BY date DESC, createdAt DESC;');
  return rows<Record<string, unknown>>(result).map(
    item =>
      parseNumberFields(item, ['originalAmount', 'remainingAmount']) as unknown as Debt,
  );
};

export const addDebt = async (
  payload: Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'remainingAmount'>,
) => {
  const now = nowIso();
  const id = createId('debt');
  await run(
    `INSERT INTO debts
      (id, personId, direction, originalAmount, remainingAmount, note, date, dueDate, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      payload.personId,
      payload.direction,
      payload.originalAmount,
      payload.originalAmount,
      payload.note,
      payload.date,
      payload.dueDate,
      'open',
      now,
      now,
    ],
  );
  return id;
};

export const updateDebt = async (
  debtId: string,
  payload: {
    personId: string;
    direction: Debt['direction'];
    originalAmount: number;
    remainingAmount: number;
    note: string;
    date: string;
    dueDate: string;
    status: Debt['status'];
  },
) => {
  await run(
    `UPDATE debts
     SET personId = ?, direction = ?, originalAmount = ?, remainingAmount = ?, note = ?, date = ?, dueDate = ?, status = ?, updatedAt = ?
     WHERE id = ?;`,
    [
      payload.personId,
      payload.direction,
      payload.originalAmount,
      payload.remainingAmount,
      payload.note,
      payload.date,
      payload.dueDate,
      payload.status,
      nowIso(),
      debtId,
    ],
  );
};

export const deleteDebt = async (debtId: string) => {
  await run('DELETE FROM debts WHERE id = ?;', [debtId]);
};

export const updateDebtStatusAndAmount = async (
  debtId: string,
  remainingAmount: number,
  status: 'open' | 'settled',
) => {
  await run(
    `UPDATE debts SET remainingAmount = ?, status = ?, updatedAt = ? WHERE id = ?;`,
    [remainingAmount, status, nowIso(), debtId],
  );
};

export const addDebtPayment = async (
  debtId: string,
  amount: number,
  date: string,
  note: string,
) => {
  const id = createId('pay');
  await run(
    `INSERT INTO debt_payments (id, debtId, amount, date, note, createdAt)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [id, debtId, amount, date, note, nowIso()],
  );
};

export const getDebtPayments = async () => {
  const result = await run(
    'SELECT * FROM debt_payments ORDER BY date DESC, createdAt DESC;',
  );
  return rows<Record<string, unknown>>(result).map(
    item => parseNumberFields(item, ['amount']) as unknown as DebtPayment,
  );
};

export const getGroups = async () => {
  const result = await run('SELECT * FROM groups_table ORDER BY name ASC;');
  return rows<Group>(result);
};

export const addGroup = async (name: string) => {
  const now = nowIso();
  const id = createId('grp');
  await run(
    `INSERT INTO groups_table (id, name, createdAt, updatedAt)
     VALUES (?, ?, ?, ?);`,
    [id, name, now, now],
  );
  return id;
};

export const updateGroup = async (groupId: string, name: string) => {
  await run(
    `UPDATE groups_table
     SET name = ?, updatedAt = ?
     WHERE id = ?;`,
    [name, nowIso(), groupId],
  );
};

export const deleteGroup = async (groupId: string) => {
  await run('DELETE FROM groups_table WHERE id = ?;', [groupId]);
};

export const getSplitExpenses = async () => {
  const result = await run(
    'SELECT * FROM split_expenses ORDER BY date DESC, createdAt DESC;',
  );
  return rows<Record<string, unknown>>(result).map(
    item => parseNumberFields(item, ['totalAmount']) as unknown as SplitExpense,
  );
};

export const getSplitParticipants = async () => {
  const result = await run('SELECT * FROM split_participants;');
  return rows<Record<string, unknown>>(result).map(
    item => parseNumberFields(item, ['shareAmount']) as unknown as SplitParticipant,
  );
};

export const addSplitExpense = async (
  payload: Omit<SplitExpense, 'id' | 'createdAt' | 'updatedAt'>,
  participantPersonIds: string[],
) => {
  const now = nowIso();
  const splitExpenseId = createId('split');
  const uniqueParticipants = Array.from(new Set(participantPersonIds));
  const shareAmount = payload.totalAmount / uniqueParticipants.length;

  const db = await openDb();
  await db.transaction(async (tx: any) => {
    await tx.executeSql(
      `INSERT INTO split_expenses
       (id, groupId, title, payerPersonId, totalAmount, date, note, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        splitExpenseId,
        payload.groupId,
        payload.title,
        payload.payerPersonId,
        payload.totalAmount,
        payload.date,
        payload.note,
        now,
        now,
      ],
    );

    for (const personId of uniqueParticipants) {
      await tx.executeSql(
        `INSERT INTO split_participants
         (id, splitExpenseId, personId, shareAmount, createdAt)
         VALUES (?, ?, ?, ?, ?);`,
        [createId('sp'), splitExpenseId, personId, shareAmount, now],
      );
    }
  });

  return splitExpenseId;
};

export const getSettlements = async () => {
  const result = await run('SELECT * FROM settlements ORDER BY date DESC, createdAt DESC;');
  return rows<Record<string, unknown>>(result).map(
    item => parseNumberFields(item, ['amount']) as unknown as Settlement,
  );
};

export const addSettlement = async (
  payload: Omit<Settlement, 'id' | 'createdAt'>,
) => {
  await run(
    `INSERT INTO settlements
      (id, groupId, fromPersonId, toPersonId, amount, date, note, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      createId('set'),
      payload.groupId,
      payload.fromPersonId,
      payload.toPersonId,
      payload.amount,
      payload.date,
      payload.note,
      nowIso(),
    ],
  );
};

export const getTableDataForExport = async () => {
  const tables = [
    'transactions',
    'transaction_bills',
    'debts',
    'debt_payments',
    'split_expenses',
    'settlements',
    'people',
  ] as const;

  const output: Record<string, Record<string, unknown>[]> = {};

  for (const table of tables) {
    const result = await run(`SELECT * FROM ${table};`);
    output[table] = rows<Record<string, unknown>>(result);
  }

  return output;
};

export const exportFullJsonPayload = async () => {
  const billResult = await run('SELECT * FROM transaction_bills;');
  const theme = await getThemeMode();
  const result = {
    settings: [{ currency: await getCurrency(), theme }],
    categories: await getCategories(),
    transactions: await getTransactions(),
    transaction_bills: rows(billResult),
    people: await getPeople(),
    debts: await getDebts(),
    debt_payments: await getDebtPayments(),
    groups: await getGroups(),
    split_expenses: await getSplitExpenses(),
    split_participants: await getSplitParticipants(),
    settlements: await getSettlements(),
  };

  return result;
};

export const importFullJsonPayload = async (payload: Record<string, unknown>) => {
  const db = await openDb();

  const asArray = (value: unknown) =>
    Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  await db.transaction(async (tx: any) => {
    await tx.executeSql('DELETE FROM split_participants;');
    await tx.executeSql('DELETE FROM split_expenses;');
    await tx.executeSql('DELETE FROM settlements;');
    await tx.executeSql('DELETE FROM groups_table;');
    await tx.executeSql('DELETE FROM transaction_bills;');
    await tx.executeSql('DELETE FROM debt_payments;');
    await tx.executeSql('DELETE FROM debts;');
    await tx.executeSql('DELETE FROM transactions;');
    await tx.executeSql('DELETE FROM people;');
    await tx.executeSql('DELETE FROM categories;');

    for (const row of asArray(payload.categories)) {
      await tx.executeSql(
        'INSERT INTO categories (id, name, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?);',
        [
          String(row.id),
          String(row.name),
          String(row.type),
          String(row.createdAt),
          String(row.updatedAt),
        ],
      );
    }

    for (const row of asArray(payload.transactions)) {
      await tx.executeSql(
        `INSERT INTO transactions
        (id, type, categoryId, amount, note, date, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          String(row.id),
          String(row.type),
          String(row.categoryId),
          Number(row.amount),
          String(row.note || ''),
          String(row.date),
          String(row.createdAt),
          String(row.updatedAt),
        ],
      );
    }

    for (const row of asArray(payload.transaction_bills)) {
      await tx.executeSql(
        `INSERT INTO transaction_bills
        (id, transactionId, fileName, fileUri, mimeType, size, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          String(row.id),
          String(row.transactionId),
          String(row.fileName),
          String(row.fileUri),
          String(row.mimeType || ''),
          Number(row.size || 0),
          String(row.createdAt),
        ],
      );
    }

    for (const row of asArray(payload.people)) {
      await tx.executeSql(
        'INSERT INTO people (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?);',
        [
          String(row.id),
          String(row.name),
          String(row.createdAt),
          String(row.updatedAt),
        ],
      );
    }

    for (const row of asArray(payload.debts)) {
      await tx.executeSql(
        `INSERT INTO debts
        (id, personId, direction, originalAmount, remainingAmount, note, date, dueDate, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          String(row.id),
          String(row.personId),
          String(row.direction),
          Number(row.originalAmount),
          Number(row.remainingAmount),
          String(row.note || ''),
          String(row.date),
          String(row.dueDate || ''),
          String(row.status),
          String(row.createdAt),
          String(row.updatedAt),
        ],
      );
    }

    for (const row of asArray(payload.debt_payments)) {
      await tx.executeSql(
        `INSERT INTO debt_payments
        (id, debtId, amount, date, note, createdAt)
        VALUES (?, ?, ?, ?, ?, ?);`,
        [
          String(row.id),
          String(row.debtId),
          Number(row.amount),
          String(row.date),
          String(row.note || ''),
          String(row.createdAt),
        ],
      );
    }

    for (const row of asArray(payload.groups)) {
      await tx.executeSql(
        'INSERT INTO groups_table (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?);',
        [
          String(row.id),
          String(row.name),
          String(row.createdAt),
          String(row.updatedAt),
        ],
      );
    }

    for (const row of asArray(payload.split_expenses)) {
      await tx.executeSql(
        `INSERT INTO split_expenses
        (id, groupId, title, payerPersonId, totalAmount, date, note, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          String(row.id),
          String(row.groupId),
          String(row.title),
          String(row.payerPersonId),
          Number(row.totalAmount),
          String(row.date),
          String(row.note || ''),
          String(row.createdAt),
          String(row.updatedAt),
        ],
      );
    }

    for (const row of asArray(payload.split_participants)) {
      await tx.executeSql(
        `INSERT INTO split_participants
        (id, splitExpenseId, personId, shareAmount, createdAt)
        VALUES (?, ?, ?, ?, ?);`,
        [
          String(row.id),
          String(row.splitExpenseId),
          String(row.personId),
          Number(row.shareAmount),
          String(row.createdAt),
        ],
      );
    }

    for (const row of asArray(payload.settlements)) {
      await tx.executeSql(
        `INSERT INTO settlements
        (id, groupId, fromPersonId, toPersonId, amount, date, note, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          String(row.id),
          String(row.groupId),
          String(row.fromPersonId),
          String(row.toPersonId),
          Number(row.amount),
          String(row.date),
          String(row.note || ''),
          String(row.createdAt),
        ],
      );
    }
  });

  const importedCurrency =
    asArray(payload.settings)[0]?.currency ||
    asArray(payload.settings)[0]?.value ||
    'AED';

  await setCurrency(String(importedCurrency));

  const importedTheme = asArray(payload.settings)[0]?.theme;
  if (importedTheme === 'dark' || importedTheme === 'light') {
    await setThemeMode(importedTheme);
  }
};
