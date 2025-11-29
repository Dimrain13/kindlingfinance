/**
 * Financial Calculations Utility
 * Single source of truth for all financial calculations across the app
 */

// Account types that represent liabilities (debts)
export const LIABILITY_TYPES = ['credit_card', 'mortgage', 'loan'];

// Account types that represent assets
export const ASSET_TYPES = ['checking', 'savings', 'investment', 'crypto', 'manual'];

/**
 * Calculate net worth from accounts
 * Net Worth = Total Assets - Total Liabilities
 * 
 * @param {Array} accounts - Array of account objects with balance and account_type
 * @returns {Object} { totalAssets, totalLiabilities, netWorth }
 */
export const calculateNetWorth = (accounts = []) => {
  if (!Array.isArray(accounts)) {
    console.error('calculateNetWorth: accounts must be an array');
    return { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
  }

  const totalAssets = accounts
    .filter(acc => !LIABILITY_TYPES.includes(acc.account_type))
    .reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  const totalLiabilities = accounts
    .filter(acc => LIABILITY_TYPES.includes(acc.account_type))
    .reduce((sum, acc) => sum + Math.abs(acc.balance || 0), 0);
  
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities
  };
};

/**
 * Calculate total balance (sum of all accounts including negative balances)
 * This is different from net worth - it's just a raw sum
 * 
 * @param {Array} accounts - Array of account objects
 * @returns {Number} Total balance
 */
export const calculateTotalBalance = (accounts = []) => {
  if (!Array.isArray(accounts)) {
    return 0;
  }
  return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
};

/**
 * Separate accounts into assets and liabilities
 * 
 * @param {Array} accounts - Array of account objects
 * @returns {Object} { assets: [], liabilities: [] }
 */
export const separateAccountsByType = (accounts = []) => {
  if (!Array.isArray(accounts)) {
    return { assets: [], liabilities: [] };
  }

  const assets = accounts.filter(acc => !LIABILITY_TYPES.includes(acc.account_type));
  const liabilities = accounts.filter(acc => LIABILITY_TYPES.includes(acc.account_type));
  
  return { assets, liabilities };
};

/**
 * Calculate portfolio value (investment + savings + crypto only)
 * Used on Portfolio page
 * 
 * @param {Array} accounts - Array of account objects
 * @returns {Number} Total portfolio value
 */
export const calculatePortfolioValue = (accounts = []) => {
  if (!Array.isArray(accounts)) {
    return 0;
  }

  const portfolioTypes = ['investment', 'savings', 'crypto'];
  return accounts
    .filter(acc => portfolioTypes.includes(acc.account_type))
    .reduce((sum, acc) => sum + (acc.balance || 0), 0);
};

/**
 * Check if an account is a liability
 * 
 * @param {Object} account - Account object
 * @returns {Boolean}
 */
export const isLiability = (account) => {
  return LIABILITY_TYPES.includes(account?.account_type);
};

/**
 * Ensure liability balances are negative
 * Call this when creating/updating liability accounts
 * 
 * @param {Number} balance - Balance value
 * @param {String} accountType - Account type
 * @returns {Number} Properly signed balance
 */
export const ensureProperSign = (balance, accountType) => {
  const numBalance = parseFloat(balance) || 0;
  
  if (LIABILITY_TYPES.includes(accountType)) {
    // Liabilities should be negative or zero
    return numBalance > 0 ? -Math.abs(numBalance) : numBalance;
  } else {
    // Assets should be positive or zero
    return Math.abs(numBalance);
  }
};

/**
 * Format account balance with proper sign for display
 * 
 * @param {Object} account - Account object
 * @returns {Number} Display balance
 */
export const getDisplayBalance = (account) => {
  if (!account) return 0;
  
  // For liabilities, show as positive in debt displays
  if (LIABILITY_TYPES.includes(account.account_type)) {
    return Math.abs(account.balance || 0);
  }
  
  return account.balance || 0;
};
