import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertCircle,
  Info,
  ArrowRight,
  Calendar,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const SpendingForecast = () => {
  const [forecast, setForecast] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthsAhead, setMonthsAhead] = useState(1);

  useEffect(() => {
    loadData();
  }, [monthsAhead]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [forecastRes, insightsRes] = await Promise.all([
        api.get(`/analytics/spending-forecast?months_ahead=${monthsAhead}`),
        api.get('/analytics/spending-insights')
      ]);
      setForecast(forecastRes.data);
      setInsights(insightsRes.data);
    } catch (error) {
      console.error('Failed to load forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-amber-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!forecast?.has_data) {
    return (
      <div className="p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent mb-8">
          Spending Forecast
        </h1>
        <Card className="shadow-lg">
          <CardContent className="py-16 text-center">
            <Activity className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Not Enough Data
            </h3>
            <p className="text-gray-600">
              We need at least a few months of transaction history to generate accurate forecasts
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = forecast.forecasts.map(f => ({
    month: f.month_name,
    forecast: f.forecast,
    lower: f.lower_bound,
    upper: f.upper_bound
  }));

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
            Spending Forecast
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI-powered predictions based on your spending patterns
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[3, 6, 12].map(months => (
            <Button
              key={months}
              onClick={() => setMonthsAhead(months)}
              variant={monthsAhead === months ? 'default' : 'outline'}
              size="sm"
              className={monthsAhead === months ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : ''}
            >
              {months} Months
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Monthly</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(forecast.average_monthly_spending)}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          forecast.spending_trend === 'increasing' ? 'from-red-50 to-orange-50 border-red-200' :
          forecast.spending_trend === 'decreasing' ? 'from-green-50 to-emerald-50 border-green-200' :
          'from-gray-50 to-slate-50 border-gray-200'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Trend</p>
                <div className="flex items-center gap-2">
                  {forecast.spending_trend === 'increasing' ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : forecast.spending_trend === 'decreasing' ? (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <Activity className="h-5 w-5 text-gray-600" />
                  )}
                  <p className={`text-xl font-bold capitalize ${
                    forecast.spending_trend === 'increasing' ? 'text-red-600' :
                    forecast.spending_trend === 'decreasing' ? 'text-green-600' :
                    'text-gray-600'
                  }`}>
                    {forecast.spending_trend}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Data Points</p>
                <p className="text-2xl font-bold text-purple-600">
                  {forecast.historical_months} months
                </p>
              </div>
              <BarChart3 className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Confidence</p>
                <p className="text-2xl font-bold text-green-600 capitalize">
                  {forecast.forecasts[0]?.confidence || 'Medium'}
                </p>
              </div>
              <Activity className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Insights */}
      {insights && insights.insights_count > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Spending Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.insights.map((insight, idx) => (
              <Card key={idx} className={`border-l-4 ${getSeverityColor(insight.severity)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(insight.severity)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{insight.message}</p>
                      <p className="text-sm font-medium">{insight.recommendation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      <Card className="shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="text-xl flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-600" />
            {monthsAhead}-Month Spending Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6B7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fill: '#6B7280' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
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
              <Area 
                type="monotone" 
                dataKey="forecast" 
                stroke="#A855F7" 
                strokeWidth={3}
                fill="url(#forecastGradient)"
                name="Predicted Spending"
              />
              <Line 
                type="monotone" 
                dataKey="lower" 
                stroke="#EC4899" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Lower Bound"
              />
              <Line 
                type="monotone" 
                dataKey="upper" 
                stroke="#EC4899" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Upper Bound"
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>How to read this chart:</strong> The purple area shows your predicted spending for upcoming months. 
              The dashed pink lines represent the confidence range (±10%). {forecast.confidence_note}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Forecasts */}
      {forecast.category_forecasts.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl">Category Forecasts</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {forecast.category_forecasts.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                    <span className="font-medium text-gray-900">{cat.category.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600">{formatCurrency(cat.next_month_forecast)}</div>
                    <div className="text-xs text-gray-500">Expected next month</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-600" />
            Tips for Better Forecasts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-700">
              <strong>Consistent tracking:</strong> The more transaction history we have, the more accurate your forecasts become
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-700">
              <strong>Categorize transactions:</strong> Properly categorized transactions help us identify spending patterns
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-700">
              <strong>Review regularly:</strong> Check your forecasts monthly to stay ahead of potential overspending
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpendingForecast;
