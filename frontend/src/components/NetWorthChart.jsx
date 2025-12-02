import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const NetWorthChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // Default to 1 month
  const [currentNetWorth, setCurrentNetWorth] = useState(0);
  const [currentAssets, setCurrentAssets] = useState(0);
  const [currentLiabilities, setCurrentLiabilities] = useState(0);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch current accounts for real-time net worth calculation
      const accountsResponse = await api.get('/accounts');
      const accounts = accountsResponse.data;
      
      // Fetch properties to include equity in net worth
      const propertiesResponse = await api.get('/properties');
      const properties = propertiesResponse.data;
      
      // Calculate property equity
      const propertyEquity = properties.reduce((sum, prop) => {
        return sum + (prop.equity !== undefined ? prop.equity : prop.current_value);
      }, 0);
      
      // Calculate net worth from accounts
      const { calculateNetWorth } = await import('../utils/financialCalculations');
      const { netWorth, totalAssets, totalLiabilities } = calculateNetWorth(accounts);
      
      // Add property equity to assets and net worth
      const totalAssetsWithEquity = totalAssets + propertyEquity;
      const netWorthWithEquity = netWorth + propertyEquity;
      
      setCurrentNetWorth(netWorthWithEquity);
      setCurrentAssets(totalAssetsWithEquity);
      setCurrentLiabilities(totalLiabilities);
      
      // Fetch calculated historical data based on transactions
      const historyResponse = await api.get(`/networth/calculated-history?days=${timeRange}`);
      const formattedData = historyResponse.data.map(snapshot => ({
        date: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: snapshot.snapshot_date,
        netWorth: snapshot.net_worth,
        assets: snapshot.total_assets,
        liabilities: snapshot.total_liabilities
      }));
      
      setData(formattedData);
    } catch (error) {
      console.error('Failed to load net worth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async () => {
    try {
      await api.post('/networth/snapshot');
      loadData();
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    }
  };

  const previousNetWorth = data.length > 1 ? data[0].netWorth : currentNetWorth;
  const change = currentNetWorth - previousNetWorth;
  const changePercent = previousNetWorth !== 0 ? ((change / Math.abs(previousNetWorth)) * 100).toFixed(2) : 0;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Net Worth Over Time</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(currentNetWorth)}</span>
              {change !== 0 && (
                <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? '+' : ''}{changePercent}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={createSnapshot}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Update
            </Button>
          </div>
        </div>
        <div className="flex space-x-2 mt-4">
          {[30, 90, 180, 365].map(days => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days === 30 ? '1M' : days === 90 ? '3M' : days === 180 ? '6M' : '1Y'}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <TrendingUp className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No net worth data yet</p>
            <Button onClick={createSnapshot} className="mt-4" size="sm">
              Create First Snapshot
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(value) => value}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-900 mb-1">{payload[0].payload.date}</p>
                        <p className="text-sm text-gray-700">Net Worth: <span className="font-semibold">{formatCurrency(payload[0].value)}</span></p>
                        <p className="text-xs text-green-600 mt-1">Assets: {formatCurrency(payload[0].payload.assets)}</p>
                        <p className="text-xs text-red-600">Liabilities: {formatCurrency(payload[0].payload.liabilities)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="netWorth" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fill="url(#colorNetWorth)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default NetWorthChart;
