/**
 * Format numbers in American standard with commas
 * Examples: 1,000 | 10,000 | 1,234.56
 */

export const formatCurrency = (amount, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
};

export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export default { formatCurrency, formatNumber };
