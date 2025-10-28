// Secure logger utility
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// Mask sensitive data
export const maskAddress = (address) => {
  if (!address || typeof address !== 'string') return 'N/A';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const maskTxId = (txId) => {
  if (!txId || typeof txId !== 'string') return 'N/A';
  if (txId.length < 10) return txId;
  return `${txId.slice(0, 8)}...${txId.slice(-6)}`;
};

// Safe logging functions
export const log = (...args) => {
  if (isDev) console.log(...args);
};

export const warn = (...args) => {
  if (!isProd) console.warn(...args);
};

export const error = (...args) => {
  if (!isProd) console.error(...args);
};

export const info = (...args) => {
  if (!isProd) console.info(...args);
};

// Production-safe logger for important events
export const logEvent = (event, data = {}) => {
  const maskedData = { ...data };
  
  // Mask sensitive fields
  if (maskedData.address) maskedData.address = maskAddress(maskedData.address);
  if (maskedData.txId) maskedData.txId = maskTxId(maskedData.txId);
  if (maskedData.walletAddress) maskedData.walletAddress = maskAddress(maskedData.walletAddress);
  if (maskedData.account) maskedData.account = maskAddress(maskedData.account);
  
  console.log(`[${event}]`, maskedData);
};