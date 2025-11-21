import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Lightbulb, RefreshCw, Sparkles, TrendingUp, AlertCircle, CheckCircle, Zap } from 'lucide-react';

const Insights = () => {
  const [insights, setInsights] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  useEffect(() => {
    loadInsights();
    loadSuggestions();
  }, []);

  const loadInsights = async () => {
    try {
      const response = await api.get('/ai/insights');
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get('/ai/savings-suggestions');
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const categorizeAll = async () => {
    setCategorizing(true);
    try {
      const response = await api.post('/ai/categorize-all');
      alert(`Successfully categorized ${response.data.total} transactions!`);
      loadSuggestions();
      // Reload to see updated categories
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      alert('Failed to categorize transactions');
    } finally {
      setCategorizing(false);
    }
  };

  const generateInsights = async () => {
    console.log('Generate Insights button clicked');
    setLoading(true);
    try {
      console.log('Making API call to /ai/generate-insights');
      const response = await api.post('/ai/generate-insights');
      console.log('API call successful:', response);
      loadInsights();
      alert('Insights generated successfully!');
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    if (priority >= 4) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (priority >= 3) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-green-500 bg-green-50 dark:bg-green-900/20';
  };

  const getPriorityIcon = (priority) => {
    if (priority >= 4) return <AlertCircle className="h-5 w-5 text-red-600" />;
    if (priority >= 3) return <TrendingUp className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Powered by ChatGPT</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={categorizeAll} 
              disabled={categorizing}
              variant="outline"
              className="shadow-md"
            >
              <Sparkles size={16} className={`mr-2 ${categorizing ? 'animate-spin' : ''}`} />
              {categorizing ? 'Re-categorizing...' : 'Re-categorize Existing'}
            </Button>
            <Button 
              onClick={generateInsights} 
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">💡 AI-Powered Savings Finder</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Link your bank accounts to get personalized insights! AI analyzes your transactions to find subscriptions, price increases, and ways to save money each month.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Insights */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-6 w-6 text-yellow-500" />
              <h2 className="text-2xl font-bold">Financial Insights</h2>
            </div>

            {insights.length > 0 ? (
              insights.map((insight) => (
                <Card 
                  key={insight.id} 
                  className={`shadow-lg border-l-4 ${getPriorityColor(insight.priority)} transition-all hover:shadow-xl`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          {getPriorityIcon(insight.priority)}
                          <span>{insight.title}</span>
                        </CardTitle>
                        {insight.monthly_savings > 0 && (
                          <div className="mt-2 inline-flex items-center bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                            <span className="text-green-700 dark:text-green-300 font-bold text-lg">
                              ${insight.monthly_savings.toFixed(0)}/mo
                            </span>
                            <span className="text-green-600 dark:text-green-400 text-xs ml-2">savings</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white dark:bg-gray-800">
                          Priority {insight.priority}/5
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
                    
                    {/* Affiliate Link Button */}
                    {insight.affiliate_link && (
                      <div className="mt-4">
                        <a 
                          href={insight.affiliate_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {insight.affiliate_text || 'Learn More'}
                        </a>
                      </div>
                    )}
                    
                    <div className="mt-3 flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 capitalize">
                        {insight.insight_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-lg">
                <CardContent className="text-center py-12">
                  <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl font-medium text-gray-600 mb-2">No insights yet</p>
                  <p className="text-gray-500 mb-4">Generate insights to get personalized financial advice</p>
                  <Button 
                    onClick={generateInsights}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <Sparkles size={16} className="mr-2" />
                    Generate Your First Insight
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Savings Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-green-500" />
              <h2 className="text-2xl font-bold">Savings Suggestions</h2>
            </div>

            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>AI-Powered Money Saving Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {suggestions.length > 0 ? (
                  <ul className="space-y-4">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-sm font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 flex-1">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No suggestions available yet</p>
                    <p className="text-sm text-gray-500 mt-1">Categorize transactions to get personalized tips</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">AI Analysis</p>
                    <p className="text-2xl font-bold mt-2">
                      {insights.length} Insights
                    </p>
                    <p className="text-sm opacity-90 mt-1">
                      {suggestions.length} Saving Tips
                    </p>
                  </div>
                  <Sparkles className="h-16 w-16 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Total Potential Savings */}
            {insights.some(i => i.monthly_savings > 0) && (
              <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Potential Monthly Savings</p>
                      <p className="text-3xl font-bold mt-2">
                        ${insights.reduce((sum, i) => sum + (i.monthly_savings || 0), 0).toFixed(0)}
                      </p>
                      <p className="text-sm opacity-90 mt-1">
                        =${(insights.reduce((sum, i) => sum + (i.monthly_savings || 0), 0) * 12).toFixed(0)}/year
                      </p>
                    </div>
                    <TrendingUp className="h-16 w-16 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* How It Works */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <CardTitle>How AI Insights Work</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Categorize</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI analyzes transaction descriptions and automatically assigns categories
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">2. Analyze</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Identifies spending patterns, trends, and potential savings opportunities
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Recommend</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Provides actionable insights and personalized money-saving recommendations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Insights;
