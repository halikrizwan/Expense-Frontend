export const createId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
