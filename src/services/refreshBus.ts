type RefreshChannel =
  | 'dashboard'
  | 'transactions'
  | 'debts'
  | 'splits'
  | 'settings';

const listeners: Record<RefreshChannel, Set<() => void>> = {
  dashboard: new Set(),
  transactions: new Set(),
  debts: new Set(),
  splits: new Set(),
  settings: new Set(),
};

export const emitRefresh = (channel: RefreshChannel) => {
  listeners[channel].forEach(listener => listener());
};

export const subscribeRefresh = (channel: RefreshChannel, callback: () => void) => {
  listeners[channel].add(callback);
  return () => {
    listeners[channel].delete(callback);
  };
};

