/**
 * Secure Logger to protect against confidential data leaks
 * Masks addresses, transaction hashes and prevents logging of secrets
 */

/**
 * Masks VeChain address, showing only first 6 and last 4 characters
 * @param {string} address - VeChain address to mask
 * @returns {string} Masked address
 */
function maskAddress(address) {
  if (!address || typeof address !== 'string') return '[INVALID_ADDRESS]';
  if (address.length < 10) return '[SHORT_ADDRESS]';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Masks transaction ID, showing only first 8 and last 6 characters
 * @param {string} txId - Transaction ID to mask
 * @returns {string} Masked transaction ID
 */
function maskTxId(txId) {
  if (!txId || typeof txId !== 'string') return '[INVALID_TXID]';
  if (txId.length < 14) return '[SHORT_TXID]';
  return `${txId.substring(0, 8)}...${txId.substring(txId.length - 6)}`;
}

/**
 * Determines logging level based on environment
 */
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'error' : 'debug';

/**
 * Safe logging function
 */
function log(...args) {
  if (LOG_LEVEL === 'debug') {
    console.log(...args);
  }
}

/**
 * Safe warning function
 */
function warn(...args) {
  if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'warn') {
    console.warn(...args);
  }
}

/**
 * Safe error function (always logged)
 */
function error(...args) {
  console.error(...args);
}

/**
 * Safe info function
 */
function info(...args) {
  if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info') {
    console.info(...args);
  }
}

/**
 * Safe event logging with automatic masking
 * @param {string} message - Message to log
 * @param {Object} data - Data to log (will be cleaned of secrets)
 */
function logEvent(message, data = {}) {
  if (LOG_LEVEL === 'production') return;

  // Create safe copy of data
  const safeData = { ...data };
  
  // Mask sensitive fields
  if (safeData.walletAddress) {
    safeData.walletAddress = maskAddress(safeData.walletAddress);
  }
  if (safeData.address) {
    safeData.address = maskAddress(safeData.address);
  }
  if (safeData.txId) {
    safeData.txId = maskTxId(safeData.txId);
  }
  if (safeData.transactionHash) {
    safeData.transactionHash = maskTxId(safeData.transactionHash);
  }
  
  // Remove any potentially dangerous fields
  delete safeData.privateKey;
  delete safeData.MODERATOR_KEY;
  delete safeData.VECHAIN_PRIVATE_KEY;
  delete safeData.password;
  delete safeData.secret;
  delete safeData.token;

  console.log(message, Object.keys(safeData).length > 0 ? safeData : '');
}

/**
 * Checks environment variable loading without exposing them
 * @param {string} varName - Environment variable name
 * @returns {string} Safe status message
 */
function checkEnvVar(varName) {
  return process.env[varName] ? 'LOADED' : 'MISSING';
}

export {
  maskAddress,
  maskTxId,
  log,
  warn,
  error,
  info,
  logEvent,
  checkEnvVar
};