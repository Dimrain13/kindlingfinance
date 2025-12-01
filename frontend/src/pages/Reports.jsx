import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  PieChart as PieChartIcon, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Wallet,
  Download
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { formatCurrency } from '../utils/formatNumber';
import { calculateNetWorth } from '../utils/financialCalculations';
import { CHART_COLORS } from '../utils/constants';

const COLORS = CHART_COLORS;

const Reports = () => {
  const [trends, setTrends] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1month');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      const months = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
      const [trendsResponse, dashboardResponse, accountsResponse] = await Promise.all([
        api.get(`/analytics/spending-trends?months=${months}`),
        api.get('/analytics/dashboard'),
        api.get('/accounts')
      ]);
      setTrends(trendsResponse.data.trends);
      setDashboard(dashboardResponse.data);
      setAccounts(accountsResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
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

  // Calculate net worth using utility function
  const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth(accounts);
  
  // Prepare chart data
  const monthlyTrendData = Object.entries(trends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      expenses: data.total,
      income: dashboard?.total_income || 0,
      ...data.categories
    }));

  const categoryData = dashboard?.spending_by_category?.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage
  })) || [];

  const topCategories = categoryData.slice(0, 5);
  
  // Calculate spending change and savings rate
  const currentMonth = dashboard?.total_expenses || 0;
  const avgMonthly = monthlyTrendData.length > 0 
    ? (monthlyTrendData.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrendData.length)
    : 0;
  const spendingChange = avgMonthly > 0 ? ((currentMonth - avgMonthly) / avgMonthly) * 100 : 0;
  
  const totalIncome = dashboard?.total_income || 0;
  const totalExpenses = dashboard?.total_expenses || 0;
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive insights into your financial health
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '1month', label: 'This Month' },
            { value: '3months', label: '3 Months' },
            { value: '6months', label: '6 Months' },
            { value: '12months', label: '12 Months' }
          ].map(range => (
            <Button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              variant={timeRange === range.value ? 'default' : 'outline'}
              size="sm"
              className={timeRange === range.value 
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' 
                : 'hover:bg-orange-50'
              }
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Net Worth Card */}
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Net Worth</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <Wallet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(netWorth)}</div>
            <p className="text-xs opacity-80 mt-2">{accounts.length} account(s)</p>
          </CardContent>
        </Card>

        {/* This Month Expenses Card */}
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-rose-500 via-red-500 to-pink-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">This Month</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(currentMonth)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
              {spendingChange > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3" />
                  <span>{Math.abs(spendingChange).toFixed(1)}% vs avg</span>
                </>
              ) : spendingChange < 0 ? (
                <>
                  <ArrowDownRight className="h-3 w-3" />
                  <span>{Math.abs(spendingChange).toFixed(1)}% vs avg</span>
                </>
              ) : (
                <span>On average</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Card */}
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Monthly Income</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(dashboard?.total_income || 0)}</div>
            <p className="text-xs opacity-80 mt-2">Current period</p>
          </CardContent>
        </Card>

        {/* Average Monthly Spending Card */}
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Avg Monthly</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(avgMonthly)}</div>
            <p className="text-xs opacity-80 mt-2">Average spending</p>
          </CardContent>
        </Card>

        {/* Savings Rate Card */}
        <Card className={`relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 text-white hover:-translate-y-2 group ${
          savingsRate >= 20 ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600' :
          savingsRate >= 10 ? 'bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600' :
          'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Savings Rate</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{savingsRate.toFixed(1)}%</div>
            <p className="text-xs opacity-80 mt-2">
              {savingsRate >= 20 ? 'Excellent!' : savingsRate >= 10 ? 'Good progress' : 'Keep improving'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expenses Trend */}
      <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-kindling-fire" />
            <span className="text-lg">Income vs Expenses (6 Months)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {monthlyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={monthlyTrendData}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6B7280' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                />
                <YAxis 
                  tick={{ fill: '#6B7280' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  fill="url(#incomeGradient)"
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  fill="url(#expenseGradient)"
                  stroke="#EF4444" 
                  strokeWidth={3}
                  name="Expenses"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <BarChart3 className="h-20 w-20 text-gray-300 mb-4" />
              <p className="text-xl font-semibold">Not enough data yet</p>
              <p className="text-sm mt-2">Connect your accounts and sync transactions to see financial trends</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Pie Chart */}
        <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700">
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="h-6 w-6 text-purple-600" />
              <span className="text-lg">Spending Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={topCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {topCategories.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                <PieChartIcon className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-semibold">No spending data</p>
                <p className="text-sm mt-2">Start tracking expenses to see your breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories Bar Chart */}
        <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-kindling-fire" />
              <span className="text-lg">Top 5 Spending Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {topCategories.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topCategories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      type="number"
                      tick={{ fill: '#6B7280' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={130}
                      tick={{ fill: '#374151', fontSize: 13 }}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 8, 8, 0]}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {topCategories.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6 space-y-2">
                  {topCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(cat.value)}</div>
                        <div className="text-xs text-gray-500">{cat.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                <BarChart3 className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-semibold">No category data</p>
                <p className="text-sm mt-2">Transactions will appear here once synced</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
