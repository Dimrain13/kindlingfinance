import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/formatNumber';

const ExpenseDonutChart = ({ transactions, onCategoryClick, selectedCategory }) => {
  // Calculate expenses by category
  const expenseData = useMemo(() => {
    const categoryTotals = {};
    
    // Transfer categories that should not be counted as expenses
    const transferCategories = ['TRANSFER', 'TRANSFER_IN', 'TRANSFER_OUT', 'CREDIT_CARD_PAYMENT', 'LOAN_PAYMENT', 'LOAN_PAYMENTS'];
    
    transactions
      .filter(t => t.transaction_type === 'expense' && !transferCategories.includes(t.category))
      .forEach(txn => {
        const category = txn.category || 'Other';
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += Math.abs(txn.amount);
      });

    // Convert to array and sort by amount
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);

  // Color palette - vibrant colors similar to the reference image
  const COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
  ];

  const handleCategoryClick = (data) => {
    if (onCategoryClick) {
      onCategoryClick(data.category);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.amount / totalExpenses) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{data.category}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {formatCurrency(data.amount)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry) => {
    const percentage = ((entry.amount / totalExpenses) * 100).toFixed(1);
    return percentage >= 5 ? `${percentage}%` : '';
  };

  return (
    <Card className="shadow-lg border-0 bg-white dark:bg-gray-800 h-full">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="amount"
                  label={renderCustomLabel}
                  labelLine={false}
                  onClick={handleCategoryClick}
                  style={{ cursor: 'pointer' }}
                >
                  {expenseData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      opacity={selectedCategory && selectedCategory !== entry.category ? 0.3 : 1}
                      stroke={selectedCategory === entry.category ? '#000' : 'none'}
                      strokeWidth={selectedCategory === entry.category ? 3 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalExpenses)}
              </p>
              {selectedCategory && (
                <button
                  onClick={() => onCategoryClick(null)}
                  className="mt-2 text-sm text-kindling-fire hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          {/* Category List */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Expense Breakdown
            </h3>
            <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2">
              {expenseData.map((item, index) => {
                const percentage = ((item.amount / totalExpenses) * 100).toFixed(1);
                const isSelected = selectedCategory === item.category;
                
                return (
                  <button
                    key={item.category}
                    onClick={() => handleCategoryClick(item)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-amber-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className={`text-sm font-medium text-left truncate ${
                        isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <span className={`text-sm font-semibold ${
                        isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {percentage}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseDonutChart;
