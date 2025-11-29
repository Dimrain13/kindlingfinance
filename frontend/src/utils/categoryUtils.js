// User-friendly category names
export const CATEGORY_DISPLAY_NAMES = {
  'FOOD_AND_DRINK': 'Food & Dining',
  'GENERAL_MERCHANDISE': 'Shopping',
  'RENT_AND_UTILITIES': 'Utilities',
  'HOME_IMPROVEMENT': 'Home Improvement',
  'ENTERTAINMENT': 'Entertainment',
  'TRANSPORTATION': 'Transportation',
  'TRAVEL': 'Travel',
  'MEDICAL': 'Healthcare',
  'LOAN_PAYMENTS': 'Loan Payments',
  'BANK_FEES': 'Bank Fees',
  'TRANSFER_IN': 'Transfer In',
  'TRANSFER_OUT': 'Transfer Out',
  'INCOME': 'Income',
  'GENERAL_SERVICES': 'Services',
  'GOVERNMENT_AND_NON_PROFIT': 'Government & Taxes',
  'Other': 'Other',
};

// Available categories for recategorization
export const AVAILABLE_CATEGORIES = [
  { value: 'FOOD_AND_DRINK', label: 'Food & Dining' },
  { value: 'GENERAL_MERCHANDISE', label: 'Shopping' },
  { value: 'RENT_AND_UTILITIES', label: 'Utilities' },
  { value: 'HOME_IMPROVEMENT', label: 'Home Improvement' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'MEDICAL', label: 'Healthcare' },
  { value: 'LOAN_PAYMENTS', label: 'Loan Payments' },
  { value: 'BANK_FEES', label: 'Bank Fees' },
  { value: 'INCOME', label: 'Income' },
  { value: 'GENERAL_SERVICES', label: 'Services' },
  { value: 'GOVERNMENT_AND_NON_PROFIT', label: 'Government & Taxes' },
  { value: 'Other', label: 'Other' },
];

// Get friendly display name for a category
export const getCategoryDisplayName = (category) => {
  return CATEGORY_DISPLAY_NAMES[category] || category;
};

// Get category icon emoji
export const getCategoryIcon = (category) => {
  const icons = {
    'FOOD_AND_DRINK': '🍽️',
    'GENERAL_MERCHANDISE': '🛍️',
    'RENT_AND_UTILITIES': '🏠',
    'HOME_IMPROVEMENT': '🔨',
    'ENTERTAINMENT': '🎬',
    'TRANSPORTATION': '🚗',
    'TRAVEL': '✈️',
    'MEDICAL': '⚕️',
    'LOAN_PAYMENTS': '💳',
    'BANK_FEES': '🏦',
    'TRANSFER_IN': '📥',
    'TRANSFER_OUT': '📤',
    'INCOME': '💰',
    'GENERAL_SERVICES': '🔧',
    'GOVERNMENT_AND_NON_PROFIT': '🏛️',
  };
  return icons[category] || '📋';
};
