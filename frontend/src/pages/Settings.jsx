import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Settings as SettingsIcon, Users, Heart, Target, TrendingUp, Save } from 'lucide-react';
import SubscriptionManagement from '../components/SubscriptionManagement';
import HouseholdManagement from '../components/HouseholdManagement';

const Settings = () => {
  const [settings, setSettings] = useState({
    family_size: 1,
    has_children: false,
    primary_goals: [],
    risk_tolerance: 'moderate',
    monthly_income: null,
    credit_score: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/user/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/user/settings', settings);
      setMessage('✅ Settings saved successfully! Generate insights again to see personalized recommendations.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('❌ Failed to save settings. Please try again.');
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const goalOptions = [
    { value: 'save_money', label: 'Save Money' },
    { value: 'pay_debt', label: 'Pay Off Debt' },
    { value: 'build_emergency_fund', label: 'Build Emergency Fund' },
    { value: 'invest', label: 'Start Investing' },
    { value: 'retirement', label: 'Retirement Planning' }
  ];

  const toggleGoal = (goal) => {
    setSettings(prev => ({
      ...prev,
      primary_goals: prev.primary_goals.includes(goal)
        ? prev.primary_goals.filter(g => g !== goal)
        : [...prev.primary_goals, goal]
    }));
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Customize your experience for personalized AI insights
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <Card className={`border-l-4 ${message.includes('✅') ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} dark:bg-opacity-20`}>
          <CardContent className="py-4">
            <p className="font-semibold">{message}</p>
          </CardContent>
        </Card>
      )}

      {/* Subscription Management */}
      <SubscriptionManagement />

      {/* Household & Collaborators Management */}
      <HouseholdManagement />

      {/* Household Info */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-kindling-fire" />
            <span>Household Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Family Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How many people are in your household?
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="10"
                value={settings.family_size}
                onChange={(e) => setSettings({...settings, family_size: parseInt(e.target.value)})}
                className="flex-1"
              />
              <div className="bg-blue-100 dark:bg-blue-900 px-4 py-2 rounded-lg">
                <span className="text-2xl font-bold text-kindling-fire dark:text-blue-300">
                  {settings.family_size}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This helps us calculate savings for family plans (cellular, streaming, groceries)
            </p>
          </div>

          {/* Has Children */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.has_children}
                onChange={(e) => setSettings({...settings, has_children: e.target.checked})}
                className="w-5 h-5 rounded border-gray-300 text-kindling-fire focus:ring-amber-500"
              />
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  I have children
                </span>
              </div>
            </label>
            <p className="text-sm text-gray-500 mt-1 ml-8">
              Helps prioritize family-friendly recommendations and bulk savings
            </p>
          </div>

          {/* Monthly Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Income (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                placeholder="5000"
                value={settings.monthly_income || ''}
                onChange={(e) => setSettings({...settings, monthly_income: parseFloat(e.target.value) || null})}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Helps us provide budget recommendations relative to your income
            </p>
          </div>

          {/* Credit Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Credit Score (Optional)
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="750"
                min="300"
                max="850"
                value={settings.credit_score || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!value || (value >= 300 && value <= 850)) {
                    setSettings({...settings, credit_score: value || null});
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Used to calculate your Financial Health Score (range: 300-850)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Goals */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-600" />
            <span>Financial Goals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select your top financial priorities (choose as many as apply)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goalOptions.map((goal) => (
              <button
                key={goal.value}
                onClick={() => toggleGoal(goal.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  settings.primary_goals.includes(goal.value)
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 hover:border-green-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{goal.label}</span>
                  {settings.primary_goals.includes(goal.value) && (
                    <span className="text-green-600">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Tolerance */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span>Risk Tolerance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            How comfortable are you with financial changes and new services?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['conservative', 'moderate', 'aggressive'].map((risk) => (
              <button
                key={risk}
                onClick={() => setSettings({...settings, risk_tolerance: risk})}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.risk_tolerance === risk
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 hover:border-purple-300 dark:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <p className="font-medium capitalize">{risk}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {risk === 'conservative' && 'Prefer proven, safe options'}
                    {risk === 'moderate' && 'Balance of safe and new'}
                    {risk === 'aggressive' && 'Open to new services'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-kindling-fire to-kindling-blaze hover:from-blue-700 hover:to-indigo-700 shadow-lg px-8"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
