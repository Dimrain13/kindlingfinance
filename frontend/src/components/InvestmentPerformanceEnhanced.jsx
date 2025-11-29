import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle, 
  Edit2, Check, X, BarChart3, LineChart as LineChartIcon
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { formatCurrency } from '../utils/formatNumber';
import { CHART_COLORS } from '../utils/constants';

const InvestmentPerformanceEnhanced = () => {
  const [performance, setPerformance] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('30'); // days - default to 1 month
  const [editingCostBasis, setEditingCostBasis] = useState(null);
  const [costBasisValue, setCostBasisValue] = useState('');

  useEffect(() => {
    loadData();
  }, [timePeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [perfResponse, benchmarkResponse] = await Promise.all([
        api.get('/investments/performance/enhanced'),
        api.get(`/investments/benchmark/sp500?days=${timePeriod}`)
      ]);
      
      setPerformance(perfResponse.data);
      setBenchmark(benchmarkResponse.data);
    } catch (error) {
      console.error('Failed to load investment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async () => {
    try {
      await api.post('/investments/snapshots/create');
      await loadData();
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    }
  };

  const startEditCostBasis = (account) => {
    setEditingCostBasis(account.account_name);
    setCostBasisValue(account.cost_basis.toString());
  };

  const saveCostBasis = async (accountName) => {
    try {
      const account = performance.accounts.find(a => a.account_name === accountName);
      if (!account) return;
      
      // Find account ID from name
      const accountsResponse = await api.get('/accounts');
      const fullAccount = accountsResponse.data.find(a => a.name === accountName);
      
      if (fullAccount) {
        const url = `/investments/accounts/${fullAccount.id}/cost-basis?cost_basis=${parseFloat(costBasisValue)}`;
        await api.patch(url);
        await loadData();
      }
      
      setEditingCostBasis(null);
      setCostBasisValue('');
    } catch (error) {
      console.error('Failed to update cost basis:', error);
      alert('Failed to update cost basis');
    }
  };

  const cancelEdit = () => {
    setEditingCostBasis(null);
    setCostBasisValue('');
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 bg-gray-200 rounded-lg"></div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!performance || performance.current_value === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-600" />
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

  // Prepare chart data
  const chartData = performance.historical_performance.map((point, idx) => {
    const benchmarkPoint = benchmark?.data?.find(b => b.date === point.date);
    return {
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      portfolio: point.value,
      benchmark: benchmarkPoint ? benchmarkPoint.value : null
    };
  });

  // Normalize benchmark to portfolio start value for comparison
  if (chartData.length > 0 && chartData[0].benchmark) {
    const portfolioStart = chartData[0].portfolio;
    const benchmarkStart = chartData[0].benchmark;
    const scaleFactor = portfolioStart / benchmarkStart;
    
    chartData.forEach(point => {
      if (point.benchmark) {
        point.benchmark = point.benchmark * scaleFactor;
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Investment Performance</h2>
        <div className="flex gap-2">
          {[
            { label: '1M', days: '30' },
            { label: '3M', days: '90' },
            { label: '6M', days: '180' },
            { label: '1Y', days: '365' },
            { label: 'All', days: '1825' }
          ].map(period => (
            <Button
              key={period.days}
              variant={timePeriod === period.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod(period.days)}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <Card className={`shadow-xl border-2 ${isPositive ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-amber-600" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Value */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Current Value</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(performance.current_value)}</p>
            </div>

            {/* Cost Basis */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Cost Basis</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold text-gray-700">{formatCurrency(performance.total_cost_basis)}</p>
                {!performance.has_real_cost_basis && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Est</span>
                )}
              </div>
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

          {/* Warning for estimated cost basis */}
          {!performance.has_real_cost_basis && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-1">Cost Basis is Estimated</p>
                <p>We're using an 80% estimate for cost basis. Add your actual purchase prices below for accurate returns.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Performance Chart */}
      {chartData.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-amber-600" />
              Performance Over Time
              {benchmark && !benchmark.using_dummy_data && (
                <span className="text-sm font-normal text-gray-600 ml-2">vs S&P 500</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6B7280', fontSize: 12 }}
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
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="portfolio" 
                  name="Your Portfolio"
                  stroke={CHART_COLORS[0]} 
                  strokeWidth={3}
                  dot={false}
                />
                {benchmark && !benchmark.using_dummy_data && (
                  <Line 
                    type="monotone" 
                    dataKey="benchmark" 
                    name="S&P 500 (Scaled)"
                    stroke={CHART_COLORS[3]} 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            
            {performance.snapshot_count < 7 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                <p><strong>Note:</strong> Performance tracking started recently. More data will be available as time goes on.</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={createSnapshot}
                  className="mt-2"
                >
                  Create Snapshot Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Breakdown with Cost Basis Editing */}
      <Card className="shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Investment Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {performance.accounts.map((acc, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{acc.account_name}</p>
                    <p className="text-sm text-gray-600">{acc.institution}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-600">{formatCurrency(acc.current_value)}</div>
                    <div className="text-sm text-gray-600">{acc.percentage_of_portfolio.toFixed(1)}% of portfolio</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  {/* Cost Basis */}
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-600">Cost Basis</p>
                      {!acc.has_real_cost_basis && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => startEditCostBasis(acc)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {editingCostBasis === acc.account_name ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={costBasisValue}
                          onChange={(e) => setCostBasisValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded"
                          autoFocus
                        />
                        <Button size="sm" className="h-6 w-6 p-0" onClick={() => saveCostBasis(acc.account_name)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{formatCurrency(acc.cost_basis)}</p>
                        {!acc.has_real_cost_basis && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">Est</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Gain/Loss */}
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Gain/Loss</p>
                    <p className={`font-semibold ${acc.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {acc.gain_loss >= 0 ? '+' : ''}{formatCurrency(acc.gain_loss)}
                    </p>
                  </div>
                  
                  {/* Return % */}
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Return %</p>
                    <p className={`font-semibold ${acc.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {acc.return_percentage >= 0 ? '+' : ''}{acc.return_percentage.toFixed(2)}%
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="bg-white p-3 rounded-lg flex items-center justify-center">
                    {acc.has_real_cost_basis ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditCostBasis(acc)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startEditCostBasis(acc)}
                      >
                        Add Cost Basis
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentPerformanceEnhanced;
