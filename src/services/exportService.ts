import dayjs from 'dayjs';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import * as XLSX from 'xlsx';
import { exportFullApi, importFullApi } from './backend';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const normalizeDateField = (item: Record<string, unknown>) => {
  const output = { ...item };
  if (typeof output.date === 'string') {
    output.date = dayjs(output.date).format('YYYY-MM-DD');
  }
  if (typeof output.createdAt === 'string') {
    output.createdAt = dayjs(output.createdAt).format('YYYY-MM-DD HH:mm');
  }
  if (typeof output.updatedAt === 'string') {
    output.updatedAt = dayjs(output.updatedAt).format('YYYY-MM-DD HH:mm');
  }
  return output;
};

export const exportToExcel = async () => {
  const data = await exportFullApi();

  const workbook = XLSX.utils.book_new();

  const sheets: Array<[string, Record<string, unknown>[]]> = [
    ['Transactions', (data.transactions as Record<string, unknown>[]) || []],
    ['Debts', (data.debts as Record<string, unknown>[]) || []],
    ['Debt Payments', (data.debt_payments as Record<string, unknown>[]) || []],
    ['Splits', (data.split_expenses as Record<string, unknown>[]) || []],
    ['Settlements', (data.settlements as Record<string, unknown>[]) || []],
    ['People', (data.people as Record<string, unknown>[]) || []],
  ];

  sheets.forEach(([sheetName, rows]) => {
    const normalizedRows = rows.map(normalizeDateField);
    const worksheet = XLSX.utils.json_to_sheet(normalizedRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const base64 = XLSX.write(workbook, {
    type: 'base64',
    bookType: 'xlsx',
  });

  const filename = `Finance_Audit_${dayjs().format('YYYY-MM-DD')}.xlsx`;
  const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;
  await RNFS.writeFile(filePath, base64, 'base64');

  await Share.open({
    title: 'Export Finance Audit',
    url: `file://${filePath}`,
    type: XLSX_MIME,
    failOnCancel: false,
    saveToFiles: true,
    filename,
  });

  return filePath;
};

export const exportDebtSummaryToExcel = exportToExcel;

export const exportToJson = async () => {
  const payload = await exportFullApi();
  const filename = `Finance_Backup_${dayjs().format('YYYY-MM-DD_HH-mm')}.json`;
  const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;

  await RNFS.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');

  await Share.open({
    title: 'Export Finance Backup',
    url: `file://${filePath}`,
    type: 'application/json',
    failOnCancel: false,
    saveToFiles: true,
    filename,
  });

  return filePath;
};

export const importFromJson = async () => {
  try {
    const [file] = await pick({
      type: [types.json, types.plainText, types.allFiles],
      mode: 'import',
      allowMultiSelection: false,
    });

    if (!file?.uri) {
      throw new Error('Cannot read selected file.');
    }

    const normalizedPath = file.uri.replace('file://', '');
    const content = await RNFS.readFile(normalizedPath, 'utf8');
    const payload = JSON.parse(content) as Record<string, unknown>;

    await importFullApi(payload);
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return;
    }
    throw error;
  }
};
