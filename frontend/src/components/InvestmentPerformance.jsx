import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Activity, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '../utils/formatNumber';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

const InvestmentPerformance = () => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    try {
      const response = await api.get('/investments/performance');
      setPerformance(response.data);
    } catch (error) {
      console.error('Failed to load investment performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!performance || performance.total_value === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-kindling-fire" />
            Investment Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <TrendingUp className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-lg font-semibold">No investment accounts found</p>
            <p className="text-sm mt-2">Connect your investment accounts to see performance metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = performance.total_gain_loss >= 0;

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <Card className={`shadow-xl border-2 ${isPositive ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-kindling-fire" />
            Investment Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Value */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-kindling-fire" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-kindling-fire">{formatCurrency(performance.total_value)}</p>
            </div>

            {/* Cost Basis */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Cost Basis</p>
              <p className="text-2xl font-bold text-gray-700">{formatCurrency(performance.total_cost_basis)}</p>
            </div>

            {/* Gain/Loss */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-2">
                {isPositive ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Gain/Loss</p>
              <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{formatCurrency(performance.total_gain_loss)}
              </p>
            </div>

            {/* Return % */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Return</p>
              <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{performance.total_return_percentage.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-kindling-fire mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Note on Performance Calculations</p>
              <p>Performance metrics are estimated based on current account values. For more accurate tracking, consider linking detailed investment holdings or manually entering cost basis information.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation by Account Type */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Asset Allocation by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {performance.asset_allocation.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performance.asset_allocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type} ${percentage.toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performance.asset_allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {performance.asset_allocation.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                        <span className="font-medium text-gray-700">{item.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatCurrency(item.value)}</div>
                        <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <p>No allocation data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Breakdown */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-kindling-fire" />
              Investment Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {performance.accounts.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performance.accounts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      type="number" 
                      tick={{ fill: '#6B7280' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      dataKey="account_name" 
                      type="category" 
                      width={150}
                      tick={{ fill: '#374151', fontSize: 12 }}
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
                    <Bar dataKey="current_value" radius={[0, 8, 8, 0]} fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {performance.accounts.map((acc, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{acc.account_name}</p>
                          <p className="text-xs text-gray-500">{acc.institution}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-kindling-fire">{formatCurrency(acc.current_value)}</div>
                          <div className="text-xs text-gray-500">{acc.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <p>No account data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-kindling-fire" />
            Investment Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Diversify your portfolio</p>
              <p className="text-sm text-gray-600">Spread investments across different asset classes to reduce risk.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Monitor fees</p>
              <p className="text-sm text-gray-600">High expense ratios and fees can significantly impact long-term returns.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Rebalance periodically</p>
              <p className="text-sm text-gray-600">Review and adjust your asset allocation quarterly or annually to maintain your target mix.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentPerformance;
