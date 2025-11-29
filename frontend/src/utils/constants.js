/**
 * Application-wide constants
 * Single source of truth for shared values
 */

// Time Periods
export const DEFAULT_TIME_PERIOD = '6months';

export const TIME_PERIODS = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SIX_MONTHS: '6months',
  TWELVE_MONTHS: '12months',
  YTD: 'ytd'
};

export const TIME_PERIOD_LABELS = {
  [TIME_PERIODS.MONTHLY]: 'This Month',
  [TIME_PERIODS.QUARTERLY]: 'This Quarter',
  [TIME_PERIODS.SIX_MONTHS]: 'Last 6 Months',
  [TIME_PERIODS.TWELVE_MONTHS]: 'Last 12 Months',
  [TIME_PERIODS.YTD]: 'Year to Date'
};

// Chart Colors (consistent across all charts)
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16'  // Lime
];

// Account Types
export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT_CARD: 'credit_card',
  INVESTMENT: 'investment',
  MORTGAGE: 'mortgage',
  LOAN: 'loan',
  CRYPTO: 'crypto',
  MANUAL: 'manual'
};

export const ACCOUNT_TYPE_LABELS = {
  [ACCOUNT_TYPES.CHECKING]: 'Checking',
  [ACCOUNT_TYPES.SAVINGS]: 'Savings',
  [ACCOUNT_TYPES.CREDIT_CARD]: 'Credit Card',
  [ACCOUNT_TYPES.INVESTMENT]: 'Investment',
  [ACCOUNT_TYPES.MORTGAGE]: 'Mortgage',
  [ACCOUNT_TYPES.LOAN]: 'Loan',
  [ACCOUNT_TYPES.CRYPTO]: 'Crypto',
  [ACCOUNT_TYPES.MANUAL]: 'Manual'
};

// Transaction Categories
export const DEFAULT_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food & Dining',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Personal Care',
  'Education',
  'Travel',
  'Insurance',
  'Savings & Investments',
  'Debt Payments',
  'Income',
  'Other'
];
