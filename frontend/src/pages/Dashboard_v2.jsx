import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { usePlaidLink } from 'react-plaid-link';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [plaidError, setPlaidError] = useState(null);

  useEffect(() => {
    loadDashboard();
    createLinkToken();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLinkToken = async () => {
    try {
      setPlaidError(null);
      const response = await api.post('/plaid/create-link-token');
      setLinkToken(response.data.link_token);
    } catch (error) {
      console.error('Failed to create link token:', error);
      setPlaidError(error.response?.data?.detail || 'Failed to initialize Plaid');
    }
  };

  const onSuccess = useCallback(async (publicToken) => {
    try {
      await api.post('/plaid/exchange-token', { public_token: publicToken });
      alert('Account linked successfully!');
      loadDashboard();
      createLinkToken();
    } catch (error) {
      console.error('Failed to exchange token:', error);
      alert('Failed to link account. Please try again.');
    }
  }, []);

  const config = {
    token: linkToken,
    onSuccess,
    onExit: (err, metadata) => {
      if (err) {
        console.error('Plaid Link exited with error:', err);
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/plaid/sync');
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const chartData = stats?.spending_by_category?.slice(0, 6).map((item) => ({
    name: item.category,
    value: item.amount,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Welcome back! Here's your financial overview
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleSync} 
              disabled={syncing} 
              variant="outline"
              className="shadow-md hover:shadow-lg transition-all"
            >
              <RefreshCw size={18} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button 
              onClick={() => ready && open()} 
              disabled={!ready}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus size={18} className="mr-2" />
              Link Account
            </Button>
          </div>
        </div>

        {/* Plaid Error Alert */}
        {plaidError && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-lg flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Plaid Connection Issue
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {plaidError}
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-200 border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                Total Balance
              </CardTitle>
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Wallet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats?.total_balance?.toFixed(2) || '0.00'}</div>
              <p className="text-xs opacity-80 mt-2">Across all accounts</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-200 border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                This Month Income
              </CardTitle>
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats?.total_income?.toFixed(2) || '0.00'}</div>
              <p className="text-xs opacity-80 mt-2">Total earned</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-200 border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                This Month Expenses
              </CardTitle>
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <TrendingDown className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats?.total_expenses?.toFixed(2) || '0.00'}</div>
              <p className="text-xs opacity-80 mt-2">Total spent</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-200 border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                Net Worth
              </CardTitle>
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats?.net_worth?.toFixed(2) || '0.00'}</div>
              <p className="text-xs opacity-80 mt-2">Total assets</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
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
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 flex flex-row items-center justify-between">
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
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-xs font-medium">
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
                        {txn.transaction_type === 'income' ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
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
    </div>
  );
};

export default Dashboard;
