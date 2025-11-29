import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Download, DollarSign, ShoppingBag, BarChart3, 
  PieChart as PieChartIcon, Wallet, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { formatCurrency } from '../utils/formatNumber';
import { calculateNetWorth } from '../utils/financialCalculations';
import { CHART_COLORS } from '../utils/constants';

const COLORS = CHART_COLORS;

const AnalyticsEnhanced = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1month');
  
  // Overview data
  const [monthlyComparison, setMonthlyComparison] = useState(null);
  const [incomeVsExpenses, setIncomeVsExpenses] = useState(null);
  const [topMerchants, setTopMerchants] = useState([]);
  const [spendingByCategory, setSpendingByCategory] = useState(null);
  
  // Trends data
  const [trends, setTrends] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const months = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
      
      const [comparison, incomeData, merchants, categoryData, trendsResponse, dashboardResponse, accountsResponse] = await Promise.all([
        api.get('/analytics/monthly-comparison').catch(() => ({ data: null })),
        api.get(`/analytics/income-vs-expenses?months=${months}`).catch(() => ({ data: null })),
        api.get(`/analytics/top-merchants?months=3&limit=10`).catch(() => ({ data: [] })),
        api.get(`/analytics/spending-by-category?months=${months}`).catch(() => ({ data: null })),
        api.get(`/analytics/spending-trends?months=${months}`),
        api.get('/analytics/dashboard'),
        api.get('/accounts')
      ]);

      setMonthlyComparison(comparison.data);
      setIncomeVsExpenses(incomeData.data);
      setTopMerchants(merchants.data);
      setSpendingByCategory(categoryData.data);
      setTrends(trendsResponse.data.trends);
      setDashboard(dashboardResponse.data);
      setAccounts(accountsResponse.data);
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
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export transactions');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate metrics using utility function
  const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth(accounts);
  const totalIncome = dashboard?.total_income || 0;
  const totalExpenses = dashboard?.total_expenses || 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const monthlyTrendData = Object.entries(trends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      expenses: data.total,
      income: totalIncome / Object.keys(trends).length,
      ...data.categories
    }));

  const categoryData = dashboard?.spending_by_category?.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage
  })) || [];

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Analytics & Reports
          </h1>
          <p className="text-gray-600 mt-2">Comprehensive financial insights and reporting</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
          <Button onClick={exportTransactions}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Spending Trends</TabsTrigger>
          <TabsTrigger value="merchants">Top Merchants</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-gray-500 mt-1">Last {timeRange === '3months' ? '3' : timeRange === '12months' ? '12' : '6'} months</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-gray-500 mt-1">Last {timeRange === '3months' ? '3' : timeRange === '12months' ? '12' : '6'} months</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Net Savings</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalIncome - totalExpenses)}</div>
                <p className="text-xs text-gray-500 mt-1">{savingsRate.toFixed(1)}% savings rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Net Worth</CardTitle>
                <Wallet className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(netWorth)}</div>
                <p className="text-xs text-gray-500 mt-1">Assets: {formatCurrency(totalAssets)} | Liabilities: {formatCurrency(totalLiabilities)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Spending by Category */}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.slice(0, 10).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(cat.value)}</div>
                      <div className="text-sm text-gray-500">{cat.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Spending Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topMerchants.slice(0, 15).map((merchant, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{merchant.merchant_name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{merchant.transaction_count} transactions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(merchant.total_amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsEnhanced;
