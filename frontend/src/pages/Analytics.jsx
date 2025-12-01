import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, TrendingDown, Download, Calendar, 
  DollarSign, ShoppingBag, BarChart3, PieChart 
} from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [monthlyComparison, setMonthlyComparison] = useState(null);
  const [incomeVsExpenses, setIncomeVsExpenses] = useState(null);
  const [topMerchants, setTopMerchants] = useState([]);
  const [spendingByCategory, setSpendingByCategory] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [comparison, incomeData, merchants, categoryData] = await Promise.all([
        api.get('/analytics/monthly-comparison'),
        api.get('/analytics/income-vs-expenses?months=6'),
        api.get('/analytics/top-merchants?months=3&limit=10'),
        api.get('/analytics/spending-by-category?months=6')
      ]);

      setMonthlyComparison(comparison.data);
      setIncomeVsExpenses(incomeData.data);
      setTopMerchants(merchants.data);
      setSpendingByCategory(categoryData.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = async () => {
    try {
      const response = await api.get('/analytics/export/transactions', {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export transactions:', error);
      alert('Failed to export transactions');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kindling-fire mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Deep insights into your financial data</p>
        </div>
        <Button onClick={exportTransactions} className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Monthly Comparison */}
      {monthlyComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Income */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Income</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(monthlyComparison.current_month.income)}
                </div>
                <div className="text-xs text-gray-500">
                  vs {formatCurrency(monthlyComparison.last_month.income)} last month
                </div>
                <div className={`flex items-center text-sm ${
                  monthlyComparison.changes.income_change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyComparison.changes.income_change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(monthlyComparison.changes.income_change).toFixed(1)}%
                </div>
              </div>

              {/* Expenses */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Expenses</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(monthlyComparison.current_month.expenses)}
                </div>
                <div className="text-xs text-gray-500">
                  vs {formatCurrency(monthlyComparison.last_month.expenses)} last month
                </div>
                <div className={`flex items-center text-sm ${
                  monthlyComparison.changes.expenses_change <= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyComparison.changes.expenses_change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(monthlyComparison.changes.expenses_change).toFixed(1)}%
                </div>
              </div>

              {/* Net */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Net (Savings)</div>
                <div className={`text-2xl font-bold ${
                  monthlyComparison.current_month.net >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(monthlyComparison.current_month.net)}
                </div>
                <div className="text-xs text-gray-500">
                  vs {formatCurrency(monthlyComparison.last_month.net)} last month
                </div>
                <div className={`flex items-center text-sm ${
                  monthlyComparison.changes.net_change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyComparison.changes.net_change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(monthlyComparison.changes.net_change).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income vs Expenses Chart */}
      {incomeVsExpenses && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Income vs Expenses (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incomeVsExpenses.months.map((month, idx) => (
                <div key={month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{month}</span>
                    <span className={`font-bold ${
                      incomeVsExpenses.net[idx] >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(incomeVsExpenses.net[idx])}
                    </span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-green-500 opacity-70"
                      style={{ 
                        width: `${(incomeVsExpenses.income[idx] / Math.max(...incomeVsExpenses.income)) * 100}%` 
                      }}
                    />
                    <div
                      className="absolute left-0 h-full bg-red-500 opacity-50"
                      style={{ 
                        width: `${(incomeVsExpenses.expenses[idx] / Math.max(...incomeVsExpenses.income)) * 100}%` 
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium text-white">
                      <span>{formatCurrency(incomeVsExpenses.income[idx])}</span>
                      <span>{formatCurrency(incomeVsExpenses.expenses[idx])}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Total Income</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(incomeVsExpenses.total_income)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Total Expenses</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(incomeVsExpenses.total_expenses)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Avg Monthly Savings</div>
                  <div className={`text-lg font-bold ${
                    incomeVsExpenses.average_monthly_savings >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(incomeVsExpenses.average_monthly_savings)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Merchants & Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Merchants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Top Merchants (Last 3 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMerchants.map((merchant, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{merchant.merchant}</div>
                    <div className="text-xs text-gray-600">
                      {merchant.transaction_count} transactions • Avg: {formatCurrency(merchant.average_transaction)}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(merchant.total_spent)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spending by Category */}
        {spendingByCategory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(spendingByCategory.category_totals).map(([category, amount], idx) => {
                  const total = Object.values(spendingByCategory.category_totals).reduce((a, b) => a + b, 0);
                  const percentage = (amount / total) * 100;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{category}</span>
                        <span className="text-gray-900 font-bold">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Analytics;
