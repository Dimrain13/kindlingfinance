import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Lightbulb, RefreshCw, Sparkles } from 'lucide-react';

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
    } catch (error) {
      alert('Failed to categorize transactions');
    } finally {
      setCategorizing(false);
    }
  };

  const generateInsights = async () => {
    setLoading(true);
    try {
      await api.post('/ai/generate-insights');
      loadInsights();
    } catch (error) {
      alert('Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Insights</h1>
          <p className="text-gray-600 mt-1">Powered by ChatGPT</p>
        </div>
        <Button onClick={generateInsights} disabled={loading}>
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Generate New Insights
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Lightbulb className="mr-2 text-yellow-500" />
            Financial Insights
          </h2>
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {insight.title}
                  <span className="text-sm font-normal text-gray-500">
                    Priority: {insight.priority}/5
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
                <p className="text-xs text-gray-500 mt-2">Type: {insight.insight_type}</p>
              </CardContent>
            </Card>
          ))}
          {insights.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No insights yet. Generate some to get started!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Savings Suggestions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Sparkles className="mr-2 text-green-500" />
            Savings Suggestions
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                  </li>
                ))}
              </ul>
              {suggestions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No suggestions available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Insights;
