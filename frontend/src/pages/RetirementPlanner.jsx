import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const RetirementPlanner = () => {
  const [inputs, setInputs] = useState({
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    monthlyContribution: 500,
    expectedReturn: 7,
    retirementExpenses: 50000,
    lifeExpectancy: 90
  });

  const [projections, setProjections] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    calculateProjections();
  }, [inputs]);

  const calculateProjections = () => {
    const {
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      expectedReturn,
      retirementExpenses,
      lifeExpectancy
    } = inputs;

    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = lifeExpectancy - retirementAge;
    const monthlyReturn = expectedReturn / 100 / 12;

    // Calculate savings at retirement using compound interest
    let balance = currentSavings;
    const projectionData = [];

    // Accumulation phase
    for (let year = 0; year <= yearsToRetirement; year++) {
      const age = currentAge + year;
      projectionData.push({
        age,
        balance: Math.round(balance),
        phase: 'accumulation'
      });

      // Add monthly contributions with compound interest for one year
      for (let month = 0; month < 12; month++) {
        balance = balance * (1 + monthlyReturn) + monthlyContribution;
      }
    }

    // Withdrawal phase
    const savingsAtRetirement = balance;
    for (let year = 1; year <= yearsInRetirement; year++) {
      const age = retirementAge + year;
      balance = balance * (1 + expectedReturn / 100) - retirementExpenses;
      
      projectionData.push({
        age,
        balance: Math.round(Math.max(0, balance)),
        phase: 'withdrawal'
      });

      if (balance <= 0) break;
    }

    setProjections(projectionData);

    // Calculate summary metrics
    const totalContributions = currentSavings + (monthlyContribution * 12 * yearsToRetirement);
    const projectedSavings = savingsAtRetirement;
    const yearsOfFunding = balance > 0 ? yearsInRetirement : projectionData.filter(p => p.phase === 'withdrawal' && p.balance > 0).length;
    const shortfall = yearsOfFunding < yearsInRetirement ? (yearsInRetirement - yearsOfFunding) * retirementExpenses : 0;

    setSummary({
      totalContributions,
      projectedSavings,
      yearsOfFunding,
      shortfall,
      isOnTrack: yearsOfFunding >= yearsInRetirement
    });
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
          Retirement Planner
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Project your retirement savings and plan for a secure future
        </p>
      </div>

      {/* Status Banner */}
      {summary && (
        <Card className={`border-2 ${summary.isOnTrack ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {summary.isOnTrack ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">You're on track!</p>
                    <p className="text-sm text-green-700">
                      Your projected savings should last through retirement ({summary.yearsOfFunding} years of funding)
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-kindling-fire" />
                  <div>
                    <p className="font-semibold text-orange-900">Action needed</p>
                    <p className="text-sm text-orange-700">
                      Your savings may run out {Math.round((summary.yearsOfFunding / (inputs.lifeExpectancy - inputs.retirementAge)) * 100)}% through retirement. 
                      Consider increasing contributions or reducing expenses.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              At Retirement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kindling-fire">
              {summary ? formatCurrency(summary.projectedSavings) : '-'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Age {inputs.retirementAge}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary ? formatCurrency(summary.totalContributions) : '-'}
            </div>
            <p className="text-xs text-gray-500 mt-1">{inputs.retirementAge - inputs.currentAge} years</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Years of Funding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary?.isOnTrack ? 'text-green-600' : 'text-kindling-fire'}`}>
              {summary ? summary.yearsOfFunding : '-'} years
            </div>
            <p className="text-xs text-gray-500 mt-1">Of {inputs.lifeExpectancy - inputs.retirementAge} needed</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kindling-fire">
              {inputs.expectedReturn}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Annual return</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs Panel */}
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="text-lg">Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Current Age</Label>
              <Input
                type="number"
                value={inputs.currentAge}
                onChange={(e) => handleInputChange('currentAge', e.target.value)}
                min="18"
                max="100"
              />
            </div>

            <div>
              <Label>Retirement Age</Label>
              <Input
                type="number"
                value={inputs.retirementAge}
                onChange={(e) => handleInputChange('retirementAge', e.target.value)}
                min={inputs.currentAge}
                max="100"
              />
            </div>

            <div>
              <Label>Life Expectancy</Label>
              <Input
                type="number"
                value={inputs.lifeExpectancy}
                onChange={(e) => handleInputChange('lifeExpectancy', e.target.value)}
                min={inputs.retirementAge}
                max="120"
              />
            </div>

            <div className="border-t pt-4">
              <Label>Current Savings</Label>
              <Input
                type="number"
                value={inputs.currentSavings}
                onChange={(e) => handleInputChange('currentSavings', e.target.value)}
                min="0"
                step="1000"
              />
            </div>

            <div>
              <Label>Monthly Contribution</Label>
              <Input
                type="number"
                value={inputs.monthlyContribution}
                onChange={(e) => handleInputChange('monthlyContribution', e.target.value)}
                min="0"
                step="50"
              />
            </div>

            <div>
              <Label>Expected Annual Return (%)</Label>
              <Input
                type="number"
                value={inputs.expectedReturn}
                onChange={(e) => handleInputChange('expectedReturn', e.target.value)}
                min="0"
                max="20"
                step="0.5"
              />
              <p className="text-xs text-gray-500 mt-1">Historical average: 7-10%</p>
            </div>

            <div className="border-t pt-4">
              <Label>Annual Retirement Expenses</Label>
              <Input
                type="number"
                value={inputs.retirementExpenses}
                onChange={(e) => handleInputChange('retirementExpenses', e.target.value)}
                min="0"
                step="1000"
              />
              <p className="text-xs text-gray-500 mt-1">Estimated yearly spending</p>
            </div>
          </CardContent>
        </Card>

        {/* Projection Chart */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="text-lg">Retirement Savings Projection</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {projections.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={projections}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="age" 
                    tick={{ fill: '#6B7280' }}
                    label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: '#6B7280' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    label={{ value: 'Balance', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
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
                    dataKey="balance" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    fill="url(#balanceGradient)"
                    name="Account Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <p>Enter your information to see projections</p>
              </div>
            )}

            {/* Key Milestones */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Years to Retirement</p>
                <p className="text-2xl font-bold text-kindling-fire">{inputs.retirementAge - inputs.currentAge}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-900">Monthly Savings Needed</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(inputs.monthlyContribution)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips & Recommendations */}
      <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-kindling-fire" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Maximize employer match</p>
              <p className="text-sm text-gray-600">If available, contribute enough to get full employer 401(k) matching - it's free money!</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Consider tax-advantaged accounts</p>
              <p className="text-sm text-gray-600">IRA and 401(k) contributions can reduce taxable income and grow tax-deferred.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-gray-900">Review and adjust annually</p>
              <p className="text-sm text-gray-600">Increase contributions as your income grows and adjust assumptions based on actual returns.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetirementPlanner;
