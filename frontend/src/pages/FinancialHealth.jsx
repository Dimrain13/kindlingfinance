import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle, XCircle, Info, Lightbulb } from 'lucide-react';
import HealthScoreGauge from '../components/HealthScoreGauge';

const FinancialHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadHealthScore();
  }, []);

  const loadHealthScore = async () => {
    setLoading(true);
    try {
      const response = await api.get('/financial-health');
      setHealthData(response.data);
    } catch (error) {
      console.error('Failed to load health score:', error);
    } finally {
      setLoading(false);
    }
  };

  const recalculate = async () => {
    setCalculating(true);
    try {
      const response = await api.get('/financial-health');
      setHealthData(response.data);
    } catch (error) {
      console.error('Failed to recalculate:', error);
    } finally {
      setCalculating(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'Excellent' || status === 'On Track' || status === 'Very Stable' || status === 'Well Diversified') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (status === 'Good' || status === 'Stable' || status === 'Moderately Diversified' || status === 'Making Progress') {
      return <TrendingUp className="h-5 w-5 text-yellow-600" />;
    } else if (status === 'Fair' || status === 'Behind' || status === 'Limited Diversification') {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Excellent' || status === 'On Track' || status === 'Very Stable' || status === 'Well Diversified') {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (status === 'Good' || status === 'Stable' || status === 'Moderately Diversified' || status === 'Making Progress') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (status === 'Fair' || status === 'Behind' || status === 'Limited Diversification') {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    } else {
      return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-kindling-fire mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Calculating your financial health...</p>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="p-6">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Calculate Health Score</h2>
              <p className="text-gray-600 mb-4">
                Make sure you have linked your accounts and have transaction data.
              </p>
              <Button onClick={recalculate} className="bg-gradient-to-r from-kindling-fire to-kindling-blaze">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const factors = healthData.factors;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-kindling-fire to-kindling-blaze bg-clip-text text-transparent">
              Financial Health Score
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Your comprehensive financial wellness assessment
            </p>
          </div>
          <Button 
            onClick={recalculate} 
            disabled={calculating}
            className="bg-gradient-to-r from-kindling-fire to-kindling-blaze shadow-lg"
          >
            {calculating ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-2" />
                Recalculate
              </>
            )}
          </Button>
        </div>

        {/* Overall Score Card */}
        <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              <div className="flex-shrink-0">
                <HealthScoreGauge score={healthData.score} size={240} />
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Your Financial Health
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Last calculated: {new Date(healthData.calculated_at).toLocaleDateString()} at{' '}
                    {new Date(healthData.calculated_at).toLocaleTimeString()}
                  </p>
                </div>

                {/* Improvement Tips */}
                {healthData.improvement_tips && healthData.improvement_tips.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                          Top Improvement Tips
                        </h3>
                        <ul className="space-y-1">
                          {healthData.improvement_tips.map((tip, index) => (
                            <li key={index} className="text-sm text-purple-800 dark:text-purple-200">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Factor Breakdown */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Score Breakdown
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(factors).map(([key, factor]) => (
              <Card 
                key={key} 
                className="shadow-lg border-0 bg-white dark:bg-gray-800 hover:shadow-xl transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(factor.status)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {factor.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {factor.description}
                        </p>
                      </div>
                    </div>
                    <Badge className={`ml-2 ${getStatusColor(factor.status)}`}>
                      {factor.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Score</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.score} / {factor.max_score}
                      </span>
                    </div>
                    <Progress 
                      value={(factor.score / factor.max_score) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Additional metrics based on factor type */}
                  {factor.percentage !== undefined && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Rate: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.percentage}%
                      </span>
                    </div>
                  )}
                  {factor.months_covered !== undefined && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Coverage: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.months_covered} months
                      </span>
                    </div>
                  )}
                  {factor.debt_to_income_ratio !== undefined && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Debt-to-Income: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.debt_to_income_ratio}%
                      </span>
                    </div>
                  )}
                  {factor.credit_score && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Credit Score: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.credit_score}
                      </span>
                    </div>
                  )}
                  {factor.growth_percentage !== undefined && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Growth: </span>
                      <span className={`font-semibold ${factor.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {factor.growth_percentage >= 0 ? '+' : ''}{factor.growth_percentage}%
                      </span>
                    </div>
                  )}
                  {factor.account_count !== undefined && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Investment Accounts: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.account_count}
                      </span>
                    </div>
                  )}
                  {factor.variability !== undefined && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Income Variability: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.variability}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  About Your Financial Health Score
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your Financial Health Score is calculated based on 9 key factors that represent different aspects of your financial wellness. 
                  Each factor is weighted based on its importance to overall financial health. The score ranges from 0 to 100, with higher scores 
                  indicating better financial health. Recalculate your score regularly to track improvements over time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialHealth;
