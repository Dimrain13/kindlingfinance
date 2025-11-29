import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatNumber';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3
} from 'lucide-react';
import CashFlowChart from '../components/CashFlowChart';
import ExpenseDonutChart from '../components/ExpenseDonutChart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

// Custom Candlestick component for Recharts
const Candlestick = (props) => {
  const { x, y, width, height, payload, avgIncome } = props;
  
  if (!payload) return null;
  
  const { open, close, high, low, isGreen } = payload;
  
  // Calculate positions
  const bodyTop = Math.min(open, close);
  const bodyBottom = Math.max(open, close);
  const bodyHeight = Math.abs(close - open);
  
  // Colors
  const color = isGreen ? '#10B981' : '#EF4444';
  const wickColor = isGreen ? '#059669' : '#DC2626';
  
  return (
    <g>
      {/* Upper wick (from high to top of body) */}
      <line
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y + height * ((high - bodyBottom) / (high - low))}
        stroke={wickColor}
        strokeWidth={1.5}
      />
      
      {/* Candlestick body */}
      <rect
        x={x + width * 0.2}
        y={y + height * ((high - bodyBottom) / (high - low))}
        width={width * 0.6}
        height={Math.max(2, height * (bodyHeight / (high - low)))}
        fill={color}
        stroke={color}
        strokeWidth={1}
        opacity={0.9}
      />
      
      {/* Lower wick (from bottom of body to low) */}
      <line
        x1={x + width / 2}
        y1={y + height * ((high - bodyTop) / (high - low))}
        x2={x + width / 2}
        y2={y + height}
        stroke={wickColor}
        strokeWidth={1.5}
      />
    </g>
  );
};

const CashFlow = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('thismonth');
  const [candlestickRange, setCandlestickRange] = useState('30days');
  const [cashFlowData, setCashFlowData] = useState([]);
  const [candlestickData, setCandlestickData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    avgMonthlyIncome: 0,
    avgMonthlyExpenses: 0,
    avgDailyIncome: 0,
    trend: 'neutral'
  });

  useEffect(() => {
    loadData();
  }, [timeRange]);
  
  useEffect(() => {
    if (transactions.length > 0 && accounts.length > 0) {
      processCandlestickData(transactions, accounts);
    }
  }, [candlestickRange, transactions, accounts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txnResponse, accountsResponse] = await Promise.all([
        api.get('/transactions?limit=1000'),
        api.get('/accounts')
      ]);
      const txns = txnResponse.data;
      const accts = accountsResponse.data;
      setTransactions(txns);
      setAccounts(accts);
      processCashFlowData(txns, accts);
      processCandlestickData(txns, accts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCashFlowData = (txns, accts) => {
    // Get date range based on selection
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'thismonth':
        // Current calendar month (e.g., Nov 1 - Nov 28)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '1month':
        // Last 30 days
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '12months':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filter transactions by date range
    const filteredTxns = txns.filter(txn => new Date(txn.date) >= startDate);
    
    // Update filtered transactions for donut chart
    setFilteredTransactions(filteredTxns);

    // Group by month
    const monthlyData = {};
    
    filteredTxns.forEach(txn => {
      const date = new Date(txn.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          income: 0,
          expenses: 0,
          netFlow: 0,
          transactionCount: 0
        };
      }

      monthlyData[monthKey].transactionCount++;
      
      // Correctly assign income and expenses based on transaction_type
      const txnType = txn.transaction_type || txn.type || '';
      
      if (txnType === 'income') {
        monthlyData[monthKey].income += Math.abs(txn.amount);
      } else {
        monthlyData[monthKey].expenses += Math.abs(txn.amount);
      }
    });

    // Calculate net flow and format data
    const chartData = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(month => ({
        ...month,
        netFlow: month.income - month.expenses,
        monthLabel: new Date(month.month + '-01').toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        })
      }));

    setCashFlowData(chartData);

    // Calculate summary
    const totalIncome = chartData.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = chartData.reduce((sum, m) => sum + m.expenses, 0);
    const netCashFlow = totalIncome - totalExpenses;
    const avgMonthlyIncome = chartData.length > 0 ? totalIncome / chartData.length : 0;
    const avgMonthlyExpenses = chartData.length > 0 ? totalExpenses / chartData.length : 0;
    
    // Calculate average daily income from all income accounts
    const totalAccountBalance = accts.reduce((sum, acc) => sum + acc.balance, 0);
    const daysInPeriod = filteredTxns.length > 0 
      ? Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)))
      : 1;
    const avgDailyIncome = totalIncome / daysInPeriod;

    // Determine trend
    let trend = 'neutral';
    if (chartData.length >= 2) {
      const recentFlow = chartData[chartData.length - 1].netFlow;
      const previousFlow = chartData[chartData.length - 2].netFlow;
      if (recentFlow > previousFlow) trend = 'up';
      else if (recentFlow < previousFlow) trend = 'down';
    }

    setSummary({
      totalIncome,
      totalExpenses,
      netCashFlow,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      avgDailyIncome,
      trend
    });
  };

  const processCandlestickData = (txns, accts) => {
    // Get date range for candlestick (last 30, 60, or 90 days)
    const now = new Date();
    let startDate = new Date();
    
    switch (candlestickRange) {
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '60days':
        startDate.setDate(now.getDate() - 60);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Filter to only cash/checking accounts (liquid cash flow)
    const cashAccounts = accts.filter(acc => {
      const accountType = acc.account_type || acc.type || '';
      return accountType === 'checking' || 
             accountType === 'depository' ||
             accountType === 'savings' ||
             (acc.subtype && (acc.subtype.includes('checking') || acc.subtype.includes('savings')));
    });
    
    // Filter transactions by date range and only from cash accounts
    const cashAccountIds = cashAccounts.map(a => a.id);
    const filteredTxns = txns.filter(txn => 
      new Date(txn.date) >= startDate && 
      cashAccountIds.includes(txn.account_id)
    );
    
    // Calculate TOTAL SPENDING and INCOME for the period
    const totalSpending = filteredTxns
      .filter(txn => {
        const txnType = txn.transaction_type || txn.type || '';
        return txnType === 'expense';
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    
    const totalIncome = filteredTxns
      .filter(txn => {
        const txnType = txn.transaction_type || txn.type || '';
        return txnType === 'income';
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    
    const daysInRange = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
    const avgDailySpending = totalSpending / daysInRange;
    const avgDailyIncome = totalIncome / daysInRange;

    console.log(`Average daily income: $${avgDailyIncome.toFixed(2)}, spending: $${avgDailySpending.toFixed(2)} over ${daysInRange} days`);
    
    // Group transactions by DAY
    const dailyData = {};
    
    // Create all days in range (even if no transactions)
    let currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = {
        date: dateKey,
        spending: 0,
        income: 0,
        transactions: []
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Fill in transaction data
    filteredTxns.forEach(txn => {
      const dateKey = txn.date.split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].transactions.push(txn);
        
        const txnType = txn.transaction_type || txn.type || '';
        if (txnType === 'expense') {
          dailyData[dateKey].spending += Math.abs(txn.amount);
        } else if (txnType === 'income') {
          dailyData[dateKey].income += Math.abs(txn.amount);
        }
      }
    });

    // Convert to array and create OHLC candlestick data
    // Y-axis will be centered at avgDailyIncome with a range of ±150
    const yAxisMax = avgDailyIncome + 150;
    const yAxisMin = Math.max(0, avgDailyIncome - 150);
    
    const candlestickArray = Object.values(dailyData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(day => {
        // OHLC Candlestick values for trading-style chart:
        // In trading: Green = Close > Open (price went up), Red = Close < Open (price went down)
        // For spending: Green = spending < avg (saved), Red = spending > avg (overspent)
        
        const baseline = avgDailyIncome;
        const actualSpending = day.spending;
        const displaySpending = Math.min(actualSpending, yAxisMax);
        const isCapped = actualSpending > yAxisMax;
        
        // Green candle: spending < average (good day - saved money)
        // Red candle: spending > average (bad day - overspent)
        const isGreen = actualSpending <= baseline;
        
        // In proper OHLC:
        // - Green candle: Open at bottom, Close at top
        // - Red candle: Open at top, Close at bottom
        let open, close, high, low;
        
        if (isGreen) {
          // Green: spending less than average
          // Open = spending (bottom), Close = baseline (top)
          open = displaySpending;
          close = baseline;
          low = displaySpending;
          high = baseline;
        } else {
          // Red: spending more than average
          // Open = baseline (top), Close = spending (bottom)
          open = baseline;
          close = displaySpending;
          low = baseline;
          high = displaySpending;
        }
        
        const difference = actualSpending - baseline;
        
        const dayLabel = new Date(day.date).toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric'
        });
        
        return {
          date: day.date,
          dateLabel: dayLabel,
          // Raw values
          spending: actualSpending,
          income: day.income,
          avgDailyIncome: avgDailyIncome,
          avgSpending: avgDailySpending,
          difference: difference,
          isGreen: isGreen,
          isCapped: isCapped,
          transactions: day.transactions,
          // OHLC values for candlestick
          open: open,
          close: close,
          high: high,
          low: low
        };
      });

    console.log('Candlestick data generated:', candlestickArray.length, 'days');
    console.log('Sample candlestick data:', candlestickArray.slice(0, 3));
    setCandlestickData(candlestickArray);

    return candlestickArray;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Cash Flow
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your income and expenses over time
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[
            { value: 'thismonth', label: 'This Month' },
            { value: '1month', label: '1M' },
            { value: '3months', label: '3M' },
            { value: '6months', label: '6M' },
            { value: '12months', label: '12M' },
            { value: 'ytd', label: 'YTD' }
          ].map(range => (
            <Button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              variant={timeRange === range.value ? 'default' : 'outline'}
              size="sm"
              className={timeRange === range.value ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md' : 'hover:bg-orange-50'}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income Card */}
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Income</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(summary.totalIncome)}</div>
            <p className="text-xs opacity-80 mt-2">Avg: {formatCurrency(summary.avgMonthlyIncome)}/mo</p>
          </CardContent>
        </Card>

        {/* Total Expenses Card */}
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Expenses</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <TrendingDown className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(summary.totalExpenses)}</div>
            <p className="text-xs opacity-80 mt-2">Avg: {formatCurrency(summary.avgMonthlyExpenses)}/mo</p>
          </CardContent>
        </Card>

        {/* Net Cash Flow Card */}
        <Card className={`relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 text-white hover:-translate-y-2 group ${
          summary.netCashFlow >= 0 
            ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600' 
            : 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Net Cash Flow</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">
              {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
              {summary.trend === 'up' ? (
                <>
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Trending up</span>
                </>
              ) : summary.trend === 'down' ? (
                <>
                  <ArrowDownRight className="h-3 w-3" />
                  <span>Trending down</span>
                </>
              ) : (
                <span>Stable</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Savings Rate Card */}
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Savings Rate</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">
              {summary.totalIncome > 0 
                ? `${((summary.netCashFlow / summary.totalIncome) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs opacity-80 mt-2">
              {summary.netCashFlow >= 0 ? 'Great job saving!' : 'Spending > Income'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <span className="text-lg">Income vs Expenses Over Time</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={cashFlowData}>
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
                  dataKey="monthLabel" 
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
              <p className="text-xl font-semibold">No data yet</p>
              <p className="text-sm mt-2">Connect your accounts to see cash flow analysis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Cash Flow Trend */}
      <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-amber-600" />
            <span className="text-lg">Net Cash Flow Trend</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="monthLabel" 
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  tick={{ fill: '#6B7280' }}
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
                <Area 
                  type="monotone" 
                  dataKey="netFlow" 
                  fill="url(#netFlowGradient)"
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Net Cash Flow"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Cash Flow Candlestick Chart */}
      <CashFlowChart />

      {/* Monthly Breakdown Table */}
      <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-gray-600" />
            <span className="text-lg">Monthly Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {cashFlowData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Month</th>
                    <th className="text-right py-3 px-4 font-semibold">Income</th>
                    <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                    <th className="text-right py-3 px-4 font-semibold">Net Flow</th>
                    <th className="text-center py-3 px-4 font-semibold">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowData.map((month, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4 font-medium">{month.monthLabel}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-semibold">
                        {formatCurrency(month.income)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 font-semibold">
                        {formatCurrency(month.expenses)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        month.netFlow >= 0 ? 'text-amber-600' : 'text-orange-600'
                      }`}>
                        {month.netFlow >= 0 ? '+' : ''}{formatCurrency(month.netFlow)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {month.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No monthly data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Breakdown Donut Chart */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Expense Breakdown
        </h2>
        <ExpenseDonutChart
          transactions={filteredTransactions}
          onCategoryClick={setSelectedCategory}
          selectedCategory={selectedCategory}
        />
      </div>
    </div>
  );
};

export default CashFlow;
