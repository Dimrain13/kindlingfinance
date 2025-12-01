import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';
import { CHART_COLORS } from '../utils/constants';

const DiversificationScore = () => {
  const [diversification, setDiversification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiversification();
  }, []);

  const loadDiversification = async () => {
    try {
      const response = await api.get('/investments/diversification');
      setDiversification(response.data);
    } catch (error) {
      console.error('Failed to load diversification:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!diversification || diversification.score === 0) {
    return (
      <Card className="shadow-lg border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-yellow-600" />
            Portfolio Diversification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{diversification?.message || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-300' };
    if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-300' };
    return { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-300' };
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'text-green-600 bg-green-100';
    if (grade === 'B') return 'text-kindling-fire bg-blue-100';
    if (grade === 'C') return 'text-yellow-600 bg-yellow-100';
    if (grade === 'D') return 'text-kindling-fire bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const scoreColor = getScoreColor(diversification.score);
  const gradeColor = getGradeColor(diversification.grade);

  // Prepare data for pie chart
  const chartData = diversification.breakdown.map((item, idx) => ({
    name: item.asset_class,
    value: item.value,
    percentage: item.percentage,
    color: CHART_COLORS[idx]
  }));

  return (
    <Card className={`shadow-xl border-2 ${scoreColor.border}`}>
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Portfolio Diversification
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Score Display */}
        <div className="flex items-center justify-between mb-6">
          {/* Score Gauge */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {/* Circular Progress */}
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  stroke="#E5E7EB"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  stroke={diversification.score >= 80 ? '#10B981' : diversification.score >= 60 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(diversification.score / 100) * 327} 327`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor.text}`}>
                  {diversification.score}
                </span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
            </div>

            {/* Grade and Details */}
            <div>
              <div className={`inline-flex items-center px-4 py-2 rounded-lg font-bold text-2xl ${gradeColor} mb-2`}>
                {diversification.grade}
              </div>
              <p className="text-sm text-gray-600 mt-2">{diversification.message}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-600">
                <div>
                  <span className="font-semibold">{diversification.num_asset_classes}</span> asset classes
                </div>
                <div>
                  <span className="font-semibold">{diversification.num_accounts}</span> accounts
                </div>
              </div>
            </div>
          </div>

          {/* Concentration Risk */}
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Max Concentration</p>
            <div className={`text-3xl font-bold ${diversification.concentration_risk > 70 ? 'text-red-600' : diversification.concentration_risk > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
              {diversification.concentration_risk}%
            </div>
            {diversification.concentration_risk > 70 && (
              <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                <AlertTriangle className="h-3 w-3" />
                <span>High Risk</span>
              </div>
            )}
          </div>
        </div>

        {/* Asset Allocation Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Allocation</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset Breakdown</h3>
            <div className="space-y-3">
              {diversification.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[idx] }}
                    ></div>
                    <span className="font-medium text-gray-900">{item.asset_class}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{item.percentage.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{formatCurrency(item.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            {diversification.score >= 80 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            Recommendations
          </h3>
          <div className="space-y-2">
            {diversification.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-sm ${
                  rec.includes('✅')
                    ? 'bg-green-50 text-green-900 border border-green-200'
                    : rec.includes('⚠️')
                    ? 'bg-yellow-50 text-yellow-900 border border-yellow-200'
                    : 'bg-blue-50 text-blue-900 border border-blue-200'
                }`}
              >
                {rec}
              </div>
            ))}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
          <p>
            <strong>How it's calculated:</strong> Diversification score is based on asset allocation across different classes,
            number of accounts, and concentration risk using the Herfindahl-Hirschman Index.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiversificationScore;
