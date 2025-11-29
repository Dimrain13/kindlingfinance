// Budget category templates with emojis and colors
export const BUDGET_CATEGORIES = [
  // Essential Living
  { name: 'Housing & Rent', emoji: '🏠', color: '#3B82F6', group: 'Essential' },
  { name: 'Utilities', emoji: '💡', color: '#10B981', group: 'Essential' },
  { name: 'Groceries', emoji: '🛒', color: '#F59E0B', group: 'Essential' },
  { name: 'Transportation', emoji: '🚗', color: '#EF4444', group: 'Essential' },
  { name: 'Healthcare', emoji: '🏥', color: '#8B5CF6', group: 'Essential' },
  { name: 'Insurance', emoji: '🛡️', color: '#14B8A6', group: 'Essential' },
  
  // Lifestyle
  { name: 'Dining Out', emoji: '🍽️', color: '#F97316', group: 'Lifestyle' },
  { name: 'Entertainment', emoji: '🎬', color: '#EC4899', group: 'Lifestyle' },
  { name: 'Shopping', emoji: '🛍️', color: '#06B6D4', group: 'Lifestyle' },
  { name: 'Subscriptions', emoji: '📺', color: '#8B5CF6', group: 'Lifestyle' },
  { name: 'Personal Care', emoji: '💅', color: '#EC4899', group: 'Lifestyle' },
  { name: 'Fitness', emoji: '💪', color: '#10B981', group: 'Lifestyle' },
  
  // Financial
  { name: 'Savings', emoji: '💰', color: '#10B981', group: 'Financial' },
  { name: 'Investments', emoji: '📈', color: '#3B82F6', group: 'Financial' },
  { name: 'Debt Payments', emoji: '💳', color: '#EF4444', group: 'Financial' },
  
  // Other
  { name: 'Travel', emoji: '✈️', color: '#06B6D4', group: 'Other' },
  { name: 'Gifts', emoji: '🎁', color: '#EC4899', group: 'Other' },
  { name: 'Education', emoji: '🎓', color: '#8B5CF6', group: 'Other' },
  { name: 'Pets', emoji: '🐾', color: '#F59E0B', group: 'Other' },
  { name: 'Other', emoji: '📌', color: '#6B7280', group: 'Other' },
];

export const getBudgetCategoryInfo = (categoryName) => {
  const category = BUDGET_CATEGORIES.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  return category || { name: categoryName, emoji: '💰', color: '#3B82F6', group: 'Other' };
};

export const BUDGET_GROUPS = [
  { name: 'Essential', description: 'Necessary living expenses', color: '#3B82F6' },
  { name: 'Lifestyle', description: 'Discretionary spending', color: '#F59E0B' },
  { name: 'Financial', description: 'Savings and investments', color: '#10B981' },
  { name: 'Other', description: 'Everything else', color: '#6B7280' },
];
