import dayjs from 'dayjs';

export const formatCurrency = (amount: number, currency = 'AED') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
};

export const formatDate = (value: string | Date, format = 'YYYY-MM-DD') =>
  dayjs(value).format(format);

export const nowIso = () => dayjs().toISOString();
