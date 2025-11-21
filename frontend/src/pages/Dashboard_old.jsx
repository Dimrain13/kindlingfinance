import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { usePlaidLink } from 'react-plaid-link';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Plus, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState(null);
  const [syncing, setSyncing] = useState(false);

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
      const response = await api.post('/plaid/create-link-token');
      setLinkToken(response.data.link_token);
    } catch (error) {
      console.error('Failed to create link token:', error);
    }
  };

  const onSuccess = async (publicToken) => {
    try {
      await api.post('/plaid/exchange-token', { public_token: publicToken });
      alert('Account linked successfully!');
      loadDashboard();
    } catch (error) {
      console.error('Failed to exchange token:', error);
      alert('Failed to link account');
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const chartData = stats?.spending_by_category?.slice(0, 6).map((item) => ({
    name: item.category,
    value: item.amount,
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your financial overview</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Transactions
          </Button>
          <Button onClick={() => ready && open()} disabled={!ready}>
            <Plus size={16} className="mr-2" />
            Link Bank Account
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.total_balance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              This Month Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats?.total_income?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              This Month Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${stats?.total_expenses?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Net Worth
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.net_worth?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
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
              <div className="flex items-center justify-center h-64 text-gray-500">
                No spending data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link to="/transactions">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recent_transactions?.length > 0 ? (
                stats.recent_transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {txn.category} • {new Date(txn.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
                        txn.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {txn.transaction_type === 'income' ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  No transactions yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
