import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, DollarSign, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const Reports = () => {
  const [trends, setTrends] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [trendsResponse, dashboardResponse] = await Promise.all([
        api.get('/analytics/spending-trends?months=6'),
        api.get('/analytics/dashboard')
      ]);
      setTrends(trendsResponse.data.trends);
      setDashboard(dashboardResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Prepare chart data
  const monthlyTrendData = Object.entries(trends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      total: data.total,
      ...data.categories
    }));

  const categoryData = dashboard?.spending_by_category?.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage
  })) || [];

  const topCategories = categoryData.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Visualize your spending patterns and trends
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                  <p className="text-2xl font-bold mt-1">${dashboard?.total_expenses?.toFixed(2) || '0.00'}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Income</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    ${dashboard?.total_income?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
                  <p className="text-2xl font-bold mt-1">{categoryData.length}</p>
                </div>
                <PieChartIcon className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg/Month</p>
                  <p className="text-2xl font-bold mt-1">
                    ${monthlyTrendData.length > 0 
                      ? (monthlyTrendData.reduce((sum, m) => sum + m.total, 0) / monthlyTrendData.length).toFixed(2)
                      : '0.00'
                    }
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spending Trends Line Chart */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>6-Month Spending Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="Total Spending"
                    dot={{ fill: '#3B82F6', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <TrendingUp className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg">Not enough data for trend analysis</p>
                <p className="text-sm">Link accounts and sync transactions to see trends</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown Pie Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
              <CardTitle className="flex items-center space-x-2">
                <PieChartIcon className="h-5 w-5" />
                <span>Spending by Category</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <p>No category data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Categories Bar Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Top 5 Categories</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topCategories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="value" fill="#3B82F6">
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <p>No category data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
