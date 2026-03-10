import { addTransactionBillApi, deleteTransactionBillApi } from './backend';
import { TransactionBillAttachment } from '../types/entities';

export interface PickedBillFile {
  uri: string;
  name?: string | null;
  type?: string | null;
  size?: number | null;
}

const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export const persistBillsForTransaction = async (
  transactionId: string,
  files: PickedBillFile[],
) => {
  if (!files.length) return;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeName = sanitize(file.name || `bill_${Date.now()}_${index}.jpg`);

    await addTransactionBillApi(transactionId, {
      fileName: safeName,
      fileUri: file.uri,
      mimeType: file.type || '',
      size: Number(file.size || 0),
    });
  }
};

export const removeStoredBill = async (bill: TransactionBillAttachment) => {
  await deleteTransactionBillApi(bill.transactionId, bill.id);
};
