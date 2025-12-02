import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatNumber';
import { getCategoryDisplayName } from '../utils/categoryUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import MXConnectWidget from '../components/MXConnectWidget';
import WelcomeOnboarding from '../components/WelcomeOnboarding';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Plus, RefreshCw, Calendar, Sparkles, PieChart as PieChartIcon, Target, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import ModernBillCalendar from '../components/ModernBillCalendar';
import CashFlowChart from '../components/CashFlowChart';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMXConnect, setShowMXConnect] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mxWidgetLoading, setMxWidgetLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState('monthly');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const getPeriodLabel = () => {
    const labels = {
      'monthly': 'This Month',
      'quarterly': 'This Quarter',
      '6months': 'Last 6 Months',
      '12months': 'Last 12 Months',
      'ytd': 'Year to Date'
    };
    return labels[timePeriod] || 'This Month';
  };

  useEffect(() => {
    loadDashboard();
    loadGoals();
    
    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (!onboardingCompleted) {
      // Small delay to let dashboard load first
      setTimeout(() => setShowOnboarding(true), 500);
    }
  }, [timePeriod]);
  
  const loadGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await api.get(`/analytics/dashboard?period=${timePeriod}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMXSuccess = () => {
    setShowMXConnect(false);
    loadDashboard();
    alert('✅ Bank account connected successfully!\n\n💡 Your transactions are being synced!');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/mx/accounts/sync');
      await api.post('/mx/transactions/sync');
      alert('Transactions synced successfully!');
      loadDashboard();
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-kindling-fire mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const chartData = stats?.spending_by_category?.slice(0, 6).map((item) => ({
    name: getCategoryDisplayName(item.category),
    value: item.amount,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-kindling-fire via-kindling-berry to-kindling-plum bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base md:text-lg">
                Welcome back! Here's your financial overview
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button 
                onClick={handleSync} 
                disabled={syncing} 
                variant="outline"
                className="shadow-md hover:shadow-lg transition-all border-kindling-blaze text-amber-700 hover:bg-amber-50"
              >
                <RefreshCw size={18} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button 
                onClick={() => {
                  console.log('Link Account clicked, setting showMXConnect to true');
                  setMxWidgetLoading(true);
                  setShowMXConnect(true);
                }}
                disabled={mxWidgetLoading}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mxWidgetLoading ? (
                  <>
                    <RefreshCw size={18} className="mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus size={18} className="mr-2" />
                    Link Account
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Time Period Selector */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'monthly', label: 'This Month' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: '6months', label: '6 Months' },
              { value: '12months', label: '12 Months' },
              { value: 'ytd', label: 'YTD' }
            ].map(period => (
              <Button
                key={period.value}
                onClick={() => setTimePeriod(period.value)}
                variant={timePeriod === period.value ? 'default' : 'outline'}
                size="sm"
                className={timePeriod === period.value 
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md hover:from-orange-700 hover:to-red-700' 
                  : 'hover:bg-orange-50 dark:hover:bg-gray-700 border-gray-300'
                }
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Cards - Kindling Financial Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {/* Net Worth - First Card */}
          <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-indigo-600 bg-white dark:bg-gray-800 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Net Worth
              </CardTitle>
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-5 w-5 text-kindling-fire dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats?.net_worth || 0)}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Total assets - liabilities</p>
            </CardContent>
          </Card>

          {/* Total Balance - Second Card */}
          <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-teal-600 bg-white dark:bg-gray-800 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Balance
              </CardTitle>
              <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Wallet className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats?.total_balance || 0)}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Across all accounts</p>
            </CardContent>
          </Card>

          {/* Income - Third Card */}
          <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-emerald-600 bg-white dark:bg-gray-800 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {getPeriodLabel()} Income
              </CardTitle>
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats?.total_income || 0)}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Total earned</p>
            </CardContent>
          </Card>

          {/* Monthly Bills - Fourth Card */}
          <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-amber-500 bg-white dark:bg-gray-800 hover:-translate-y-1 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Monthly Bills
              </CardTitle>
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-5 w-5 text-kindling-fire dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(stats?.monthly_bills || 0)}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Recurring expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Link to="/transactions">
                <Button variant="outline" className="shadow-md hover:shadow-lg transition-shadow">
                  <Plus size={16} className="mr-2" />
                  Add Transaction
                </Button>
              </Link>
              <Link to="/budgets">
                <Button variant="outline" className="shadow-md hover:shadow-lg transition-shadow">
                  <PieChartIcon size={16} className="mr-2" />
                  Create Budget
                </Button>
              </Link>
              <Link to="/insights">
                <Button variant="outline" className="shadow-md hover:shadow-lg transition-shadow">
                  <Sparkles size={16} className="mr-2" />
                  View Insights
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Modern Bill Calendar */}
        <ModernBillCalendar />

        {/* Cash Flow Chart */}
        <CashFlowChart compact={true} />

        {/* Financial Goals Widget */}
        {goals.length > 0 && (
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-kindling-fire" />
                <CardTitle className="text-xl">Financial Goals</CardTitle>
              </div>
              <Link to="/goals">
                <Button variant="ghost" size="sm" className="hover:bg-white dark:hover:bg-gray-600">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.slice(0, 3).map((goal) => (
                  <div
                    key={goal.id}
                    className="p-4 rounded-lg border-2 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    style={{ borderColor: goal.color + '40' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{goal.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                          {goal.name}
                        </h3>
                        <p className="text-xs text-gray-500">{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(goal.progress_percentage, 100)}%`,
                            backgroundColor: goal.color
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: goal.color }}>
                          {goal.progress_percentage.toFixed(0)}%
                        </span>
                        {goal.progress_percentage >= 100 && (
                          <span className="text-xs font-semibold text-green-600">✓ Complete</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts and Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
              <CardTitle className="text-xl">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <TrendingUp className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium">No spending data yet</p>
                  <p className="text-sm">Link an account to start tracking</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
              <Link to="/transactions">
                <Button variant="ghost" size="sm" className="hover:bg-white dark:hover:bg-gray-600">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {stats?.recent_transactions?.length > 0 ? (
                  stats.recent_transactions.map((txn) => (
                    <div 
                      key={txn.id} 
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl hover:shadow-md transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{txn.description}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="bg-amber-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-xs font-medium">
                            {txn.category}
                          </span>
                          {' • '}
                          {new Date(txn.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`font-bold text-lg ${
                          txn.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {txn.transaction_type === 'income' ? '+' : ''}{formatCurrency(txn.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <Wallet className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium">No transactions yet</p>
                    <p className="text-sm">Link an account to see your transactions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MX Connect Widget Modal */}
      {showMXConnect && (
        <MXConnectWidget 
          onSuccess={handleMXSuccess}
          onClose={() => {
            setShowMXConnect(false);
            setMxWidgetLoading(false);
          }}
          onLoad={() => setMxWidgetLoading(false)}
        />
      )}

      {/* Welcome Onboarding Modal */}
      {showOnboarding && (
        <WelcomeOnboarding onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
};

export default Dashboard;
