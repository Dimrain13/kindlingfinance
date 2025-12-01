import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  CreditCard, 
  TrendingDown, 
  Plus,
  Trash2,
  Calculator,
  DollarSign,
  Calendar,
  Zap,
  Target,
  Info,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const DebtPayoff = () => {
  const [debts, setDebts] = useState([]);
  const [extraPayment, setExtraPayment] = useState('');
  const [strategy, setStrategy] = useState('avalanche');
  const [results, setResults] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debtSummary, setDebtSummary] = useState(null);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [chunkingAnalysis, setChunkingAnalysis] = useState(null);
  const [showChunking, setShowChunking] = useState(false);
  const [chunkingParams, setChunkingParams] = useState({
    monthlyIncome: '',
    monthlyExpenses: '',
    helocRate: '11',
    helocAvailable: '',
    customChunkSize: '',
    yearsRemaining: ''
  });
  const chunkingResultsRef = React.useRef(null);

  useEffect(() => {
    loadDebtSummary();
  }, []);

  // Auto-scroll to results when chunking analysis completes
  useEffect(() => {
    if (chunkingAnalysis && showChunking && chunkingResultsRef.current) {
      setTimeout(() => {
        chunkingResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [chunkingAnalysis, showChunking]);

  const loadDebtSummary = async () => {
    try {
      setLoadingDebts(true);
      const response = await api.get('/debt/summary');
      setDebtSummary(response.data);
      
      // Auto-populate debts from connected accounts
      if (response.data.debt_accounts && response.data.debt_accounts.length > 0) {
        const autoDebts = response.data.debt_accounts.map((account, idx) => ({
          id: Date.now() + idx,
          name: account.lender,
          balance: account.estimated_balance || '',
          interestRate: account.estimated_apr || '',
          minimumPayment: account.estimated_monthly_payment || '',
          fromAccount: true
        }));
        setDebts(autoDebts);
      } else {
        // No debts found, start with one empty form
        setDebts([{ id: 1, name: '', balance: '', interestRate: '', minimumPayment: '', fromAccount: false }]);
      }
    } catch (error) {
      console.error('Failed to load debt summary:', error);
      setDebts([{ id: 1, name: '', balance: '', interestRate: '', minimumPayment: '', fromAccount: false }]);
    } finally {
      setLoadingDebts(false);
    }
  };

  const addDebt = () => {
    setDebts([...debts, { 
      id: Date.now(), 
      name: '', 
      balance: '', 
      interestRate: '', 
      minimumPayment: '' 
    }]);
  };

  const removeDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const updateDebt = (id, field, value) => {
    console.log(`Updating debt ${id}: ${field} = ${value}`);
    setDebts(debts.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const calculatePayoff = async () => {
    const validDebts = debts.filter(d => 
      d.balance && d.interestRate && d.minimumPayment
    ).map(d => ({
      name: d.name || 'Debt',
      balance: parseFloat(d.balance),
      interest_rate: parseFloat(d.interestRate),
      minimum_payment: parseFloat(d.minimumPayment)
    }));

    if (validDebts.length === 0) {
      alert('Please add at least one debt with all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/debt/calculate-payoff', 
        validDebts,
        {
          params: {
            extra_payment: parseFloat(extraPayment) || 0,
            strategy: strategy
          }
        }
      );
      setResults(response.data);
    } catch (error) {
      console.error('Failed to calculate payoff:', error);
      alert('Failed to calculate debt payoff');
    } finally {
      setLoading(false);
    }
  };

  const compareStrategies = async () => {
    const validDebts = debts.filter(d => 
      d.balance && d.interestRate && d.minimumPayment
    ).map(d => ({
      name: d.name || 'Debt',
      balance: parseFloat(d.balance),
      interest_rate: parseFloat(d.interestRate),
      minimum_payment: parseFloat(d.minimumPayment)
    }));

    if (validDebts.length === 0) {
      alert('Please add at least one debt');
      return;
    }

    try {
      setLoading(true);
      setComparing(true);
      
      const [avalanche, snowball, minimum] = await Promise.all([
        api.post('/debt/calculate-payoff', validDebts, {
          params: { extra_payment: parseFloat(extraPayment) || 0, strategy: 'avalanche' }
        }),
        api.post('/debt/calculate-payoff', validDebts, {
          params: { extra_payment: parseFloat(extraPayment) || 0, strategy: 'snowball' }
        }),
        api.post('/debt/calculate-payoff', validDebts, {
          params: { extra_payment: 0, strategy: 'minimum' }
        })
      ]);

      setResults({
        avalanche: avalanche.data,
        snowball: snowball.data,
        minimum: minimum.data
      });
    } catch (error) {
      console.error('Failed to compare strategies:', error);
      alert('Failed to compare strategies');
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = debts.reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0);
  const totalMinimum = debts.reduce((sum, d) => sum + (parseFloat(d.minimumPayment) || 0), 0);

  // Find mortgage debt for chunking analysis
  const mortgageDebt = debts.find(d => 
    d.name.toLowerCase().includes('mortgage') || 
    d.name.toLowerCase().includes('home')
  );

  const analyzeChunking = async () => {
    console.log('🔍 Chunking Analysis Started');
    console.log('All Debts:', debts);
    console.log('Mortgage Debt:', mortgageDebt);
    console.log('Chunking Params:', chunkingParams);
    
    if (!mortgageDebt) {
      alert('⚠️ No mortgage debt found.\n\nPlease add a debt with "mortgage" or "home" in the name.');
      return;
    }
    
    if (!mortgageDebt.balance || !mortgageDebt.interestRate || !mortgageDebt.minimumPayment) {
      alert(`⚠️ Mortgage details incomplete:\n\n` +
            `Balance: ${mortgageDebt.balance || '❌ Missing'}\n` +
            `Interest Rate: ${mortgageDebt.interestRate || '❌ Missing'}%\n` +
            `Monthly Payment: ${mortgageDebt.minimumPayment || '❌ Missing'}`);
      return;
    }

    const income = parseFloat(chunkingParams.monthlyIncome);
    const expenses = parseFloat(chunkingParams.monthlyExpenses);

    if (!income || income <= 0) {
      alert('⚠️ Please enter your monthly income (after tax).\n\nExample: If you take home $8,000/month, enter 8000');
      return;
    }

    if (!expenses || expenses <= 0) {
      alert('⚠️ Please enter your total monthly expenses.\n\nExample: If you spend $5,000/month including mortgage, enter 5000');
      return;
    }

    if (expenses >= income) {
      alert('⚠️ Your expenses meet or exceed your income.\n\nChunking strategy requires positive cash flow to work effectively.');
      return;
    }

    try {
      setLoading(true);
      
      const apiParams = {
        mortgage_balance: parseFloat(mortgageDebt.balance),
        mortgage_rate: parseFloat(mortgageDebt.interestRate),
        mortgage_payment: parseFloat(mortgageDebt.minimumPayment),
        monthly_income: parseFloat(chunkingParams.monthlyIncome),
        monthly_expenses: parseFloat(chunkingParams.monthlyExpenses),
        heloc_rate: parseFloat(chunkingParams.helocRate),
        heloc_available: chunkingParams.helocAvailable ? parseFloat(chunkingParams.helocAvailable) : null,
        custom_chunk_size: chunkingParams.customChunkSize ? parseFloat(chunkingParams.customChunkSize) : null,
        years_remaining: chunkingParams.yearsRemaining ? parseFloat(chunkingParams.yearsRemaining) : null
      };
      
      console.log('📡 Making API call to /debt/analyze-chunking...');
      console.log('📊 API Parameters:', apiParams);
      
      const response = await api.post('/debt/analyze-chunking', null, {
        params: apiParams
      });
      console.log('✅ API Response:', response.data);
      setChunkingAnalysis(response.data);
      setShowChunking(true);
      console.log('✅ State updated, results should render');
      
      // Show success alert
      alert(`Analysis Complete! Your strategy is ${response.data.recommendation}. You can save $${response.data.savings.interest_saved.toLocaleString()} and ${response.data.savings.time_saved_years} years!`);
    } catch (error) {
      console.error('❌ Failed to analyze chunking:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to analyze chunking strategy: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">
          Debt Payoff Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a strategic plan to become debt-free faster
        </p>
      </div>

      {/* Debt Summary from Account */}
      {debtSummary && debtSummary.active_debts > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Debt from Accounts</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(debtSummary.total_debt_balance)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {debtSummary.active_debts} active debt account{debtSummary.active_debts > 1 ? 's' : ''} • 
                  {formatCurrency(debtSummary.monthly_debt_payment)}/month
                </p>
              </div>
              <CreditCard className="h-16 w-16 text-red-200" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-600" />
                  Your Debts
                </span>
                <div className="flex gap-2">
                  <Button onClick={loadDebtSummary} size="sm" variant="outline" disabled={loadingDebts}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingDebts ? 'animate-spin' : ''}`} />
                    Reload from Accounts
                  </Button>
                  <Button onClick={addDebt} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Manually
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {loadingDebts ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-kindling-fire mx-auto mb-2" />
                  <p className="text-gray-600">Loading your debt accounts...</p>
                </div>
              ) : debts.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No debt accounts found</p>
                  <Button onClick={addDebt} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Debt Manually
                  </Button>
                </div>
              ) : null}
              {debts.map((debt, index) => (
                <div key={debt.id} className={`p-4 border-2 rounded-lg space-y-3 ${
                  debt.fromAccount 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Debt #{index + 1}</h3>
                      {debt.fromAccount && (
                        <span className="text-xs bg-kindling-fire text-white px-2 py-0.5 rounded-full">
                          From Account
                        </span>
                      )}
                    </div>
                    {debts.length > 1 && (
                      <Button
                        onClick={() => removeDebt(debt.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Debt Name (optional)</Label>
                      <Input
                        value={debt.name}
                        onChange={(e) => updateDebt(debt.id, 'name', e.target.value)}
                        placeholder="e.g., Credit Card, Student Loan"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Current Balance *</Label>
                      <Input
                        type="number"
                        value={debt.balance}
                        onChange={(e) => updateDebt(debt.id, 'balance', e.target.value)}
                        placeholder="10000"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Interest Rate (%) *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={debt.interestRate}
                        onChange={(e) => updateDebt(debt.id, 'interestRate', e.target.value)}
                        placeholder="18.5"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Minimum Payment *</Label>
                      <Input
                        type="number"
                        value={debt.minimumPayment}
                        onChange={(e) => updateDebt(debt.id, 'minimumPayment', e.target.value)}
                        placeholder="200"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Strategy & Extra Payment */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-kindling-fire" />
                Payoff Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Extra Monthly Payment</Label>
                <Input
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Additional amount to pay each month</p>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Repayment Strategy</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setStrategy('avalanche')}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      strategy === 'avalanche' 
                        ? 'border-kindling-fire bg-blue-50 ring-2 ring-blue-300' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-kindling-fire mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Avalanche Method</p>
                        <p className="text-sm text-gray-600">Pay highest interest rate first • Saves the most money</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setStrategy('snowball')}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      strategy === 'snowball' 
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-300' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Snowball Method</p>
                        <p className="text-sm text-gray-600">Pay smallest balance first • Quick psychological wins</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={calculatePayoff}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-kindling-fire to-kindling-blaze text-white"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {loading ? 'Calculating...' : 'Calculate Payoff'}
                </Button>
                
                <Button
                  onClick={compareStrategies}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  Compare Strategies
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-lg bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-lg">Debt Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Debt</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(totalBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Min. Payment</p>
                <p className="text-2xl font-bold text-kindling-fire">{formatCurrency(totalMinimum)}/mo</p>
              </div>
              {parseFloat(extraPayment) > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Total Monthly Payment</p>
                  <p className="text-2xl font-bold text-kindling-fire">
                    {formatCurrency(totalMinimum + parseFloat(extraPayment))}/mo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-kindling-fire" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-gray-700">
                <strong>Avalanche:</strong> Best for saving money on interest
              </p>
              <p className="text-gray-700">
                <strong>Snowball:</strong> Best for motivation and quick wins
              </p>
              <p className="text-gray-700">
                <strong>Extra Payments:</strong> Even $50/month makes a big difference!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Section */}
      {results && !comparing && (
        <Card className="shadow-2xl border-4 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-2xl">Your Debt Payoff Plan</CardTitle>
            <p className="text-blue-100 mt-2 capitalize">{results.strategy} Method</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Debt-Free In</p>
                <p className="text-2xl font-bold text-green-600">{results.years_to_payoff} years</p>
                <p className="text-xs text-gray-500">{results.months_to_payoff} months</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <DollarSign className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Interest Paid</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(results.total_interest_paid)}</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <TrendingDown className="h-8 w-8 text-kindling-fire mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-kindling-fire">{formatCurrency(results.total_amount_paid)}</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Extra Payment</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(results.extra_monthly_payment)}/mo</p>
              </div>
            </div>

            {/* Payoff Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Debt Reduction Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={results.schedule}>
                  <defs>
                    <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" label={{ value: 'Months', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area 
                    type="monotone" 
                    dataKey="remaining_balance" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    fill="url(#debtGradient)"
                    name="Remaining Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {results && comparing && (
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="text-2xl">Strategy Comparison</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['avalanche', 'snowball', 'minimum'].map((strat) => (
                <Card key={strat} className="border-2">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-lg capitalize">{strat} Method</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Time to Payoff</p>
                      <p className="text-xl font-bold">{results[strat].years_to_payoff} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Interest Paid</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(results[strat].total_interest_paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Paid</p>
                      <p className="text-xl font-bold">{formatCurrency(results[strat].total_amount_paid)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chunking Strategy Section */}
      {!mortgageDebt && (
        <Card className="shadow-lg border-l-4 border-kindling-fire">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Zap className="h-6 w-6 text-kindling-fire" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">
                  HELOC Chunking Strategy (Velocity Banking)
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  The HELOC Chunking calculator is an advanced mortgage payoff strategy using a Home Equity Line of Credit.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    <strong>To use this calculator:</strong>
                  </p>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Connect a bank account with a mortgage through Plaid</li>
                    <li>Or manually add a mortgage goal in the Goals section</li>
                  </ul>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                    💡 This strategy helps homeowners pay off their mortgage faster by strategically using HELOC funds to reduce principal.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {mortgageDebt && (
        <Card className="shadow-2xl border-4 border-kindling-fire">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Zap className="h-6 w-6" />
              HELOC Chunking Strategy (Velocity Banking)
            </CardTitle>
            <p className="text-orange-100 mt-2">
              Advanced mortgage payoff using a Home Equity Line of Credit
            </p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Monthly Income (After Tax) *</Label>
                <Input
                  type="number"
                  value={chunkingParams.monthlyIncome}
                  onChange={(e) => setChunkingParams({...chunkingParams, monthlyIncome: e.target.value})}
                  placeholder="Enter your monthly income (e.g., 8000)"
                  className="border-purple-300"
                />
                <p className="text-xs text-gray-500 mt-1">Your total monthly take-home pay</p>
              </div>
              <div>
                <Label>Monthly Expenses (All) *</Label>
                <Input
                  type="number"
                  value={chunkingParams.monthlyExpenses}
                  onChange={(e) => setChunkingParams({...chunkingParams, monthlyExpenses: e.target.value})}
                  placeholder="Enter your monthly expenses (e.g., 5000)"
                  className="border-purple-300"
                />
                <p className="text-xs text-gray-500 mt-1">All expenses including mortgage payment</p>
              </div>
              <div>
                <Label>HELOC Interest Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={chunkingParams.helocRate}
                  onChange={(e) => setChunkingParams({...chunkingParams, helocRate: e.target.value})}
                  placeholder="11"
                />
              </div>
              <div>
                <Label>HELOC Available (Optional)</Label>
                <Input
                  type="number"
                  value={chunkingParams.helocAvailable}
                  onChange={(e) => setChunkingParams({...chunkingParams, helocAvailable: e.target.value})}
                  placeholder="Auto-calculated if blank"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to estimate based on home value</p>
              </div>
              <div>
                <Label>Custom Chunk Size (Optional)</Label>
                <Input
                  type="number"
                  value={chunkingParams.customChunkSize}
                  onChange={(e) => setChunkingParams({...chunkingParams, customChunkSize: e.target.value})}
                  placeholder="Use optimal if blank"
                />
                <p className="text-xs text-gray-500 mt-1">Override the calculated optimal chunk size</p>
              </div>
              <div>
                <Label>Years Remaining on Mortgage (Optional)</Label>
                <Input
                  type="number"
                  value={chunkingParams.yearsRemaining}
                  onChange={(e) => setChunkingParams({...chunkingParams, yearsRemaining: e.target.value})}
                  placeholder="e.g., 28"
                />
                <p className="text-xs text-gray-500 mt-1">For accurate traditional payoff calculation</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Status indicator */}
              {!chunkingParams.monthlyIncome || !chunkingParams.monthlyExpenses ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Please fill in your monthly income and expenses above to analyze your strategy
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Ready to analyze! Click the button below
                  </p>
                </div>
              )}
              
              <Button
                onClick={analyzeChunking}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {loading ? 'Analyzing...' : 'Analyze Chunking Strategy'}
              </Button>
              {loading && (
                <p className="text-sm text-purple-600 text-center animate-pulse">
                  Calculating your strategy...
                </p>
              )}
            </div>

            {/* Results - MOVED TO APPEAR RIGHT AFTER BUTTON */}
            {chunkingAnalysis && showChunking && (
              <div ref={chunkingResultsRef} className="space-y-6">
                {/* Viability Banner */}
                <Card className={`border-2 ${
                  chunkingAnalysis.recommendation === 'highly recommended' ? 'bg-green-50 border-green-300' :
                  chunkingAnalysis.recommendation === 'recommended' ? 'bg-blue-50 border-blue-300' :
                  chunkingAnalysis.recommendation === 'moderately beneficial' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-red-50 border-red-300'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      {chunkingAnalysis.viable ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      )}
                      <div>
                        <h3 className="text-xl font-bold capitalize">{chunkingAnalysis.recommendation}</h3>
                        <p className="text-sm mt-1">
                          {chunkingAnalysis.viable 
                            ? `Save $${chunkingAnalysis.savings.interest_saved.toLocaleString()} and ${chunkingAnalysis.savings.time_saved_years} years!`
                            : chunkingAnalysis.reason || 'Not recommended for your situation'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {chunkingAnalysis.viable && (
                  <>
                    {/* Comparison Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-2 border-gray-300">
                        <CardHeader className="bg-gray-100">
                          <CardTitle className="text-lg">Traditional Payoff</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Time to Payoff</p>
                            <p className="text-2xl font-bold">{chunkingAnalysis.traditional_payoff.years} years</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Interest</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(chunkingAnalysis.traditional_payoff.total_interest)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Paid</p>
                            <p className="text-xl font-bold">
                              {formatCurrency(chunkingAnalysis.traditional_payoff.total_paid)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-purple-500">
                        <CardHeader className="bg-purple-100">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5 text-purple-600" />
                            With Chunking
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Time to Payoff</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {chunkingAnalysis.chunking_payoff.years} years
                              <span className="text-sm text-green-600 ml-2">
                                (Save {chunkingAnalysis.savings.time_saved_years}y)
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Interest</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(chunkingAnalysis.chunking_payoff.total_interest)}
                              <span className="text-sm ml-2">
                                (Save {formatCurrency(chunkingAnalysis.savings.interest_saved)})
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Paid</p>
                            <p className="text-xl font-bold">
                              {formatCurrency(chunkingAnalysis.chunking_payoff.total_paid)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Strategy Details */}
                    <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
                      <CardHeader>
                        <CardTitle>Your Chunking Strategy</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600">
                              {chunkingAnalysis.using_custom_chunk ? 'Your Chunk Size' : 'Optimal Chunk'}
                            </p>
                            <p className="text-xl font-bold text-purple-600">
                              {formatCurrency(chunkingAnalysis.optimal_chunk_size)}
                            </p>
                            {chunkingAnalysis.using_custom_chunk && chunkingAnalysis.calculated_optimal_chunk && (
                              <p className="text-xs text-gray-500 mt-1">
                                (Optimal: {formatCurrency(chunkingAnalysis.calculated_optimal_chunk)})
                              </p>
                            )}
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600">Chunks Needed</p>
                            <p className="text-xl font-bold text-purple-600">
                              {chunkingAnalysis.chunks_needed}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600">Monthly Cash Flow</p>
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(chunkingAnalysis.monthly_cashflow)}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-sm text-gray-600">Interest Savings</p>
                            <p className="text-xl font-bold text-green-600">
                              {chunkingAnalysis.savings.savings_percentage}%
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-white rounded-lg">
                          <h4 className="font-semibold mb-3">Step-by-Step Process:</h4>
                          <div className="space-y-2">
                            {chunkingAnalysis.how_it_works.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <span className="text-purple-600 font-bold">{step.split('.')[0]}.</span>
                                <span className="text-gray-700">{step.split('.').slice(1).join('.')}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {chunkingAnalysis.risk_factors && chunkingAnalysis.risk_factors.length > 0 && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5" />
                              Important Considerations:
                            </h4>
                            <ul className="space-y-1 text-sm text-yellow-800">
                              {chunkingAnalysis.risk_factors.map((risk, idx) => (
                                <li key={idx}>• {risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Debug Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-xs text-blue-900 font-mono">
                  <strong>Debug:</strong> Mortgage detected: {mortgageDebt ? `"${mortgageDebt.name}"` : 'None'} 
                  {mortgageDebt && ` | Balance: $${mortgageDebt.balance} | Rate: ${mortgageDebt.interestRate}% | Payment: $${mortgageDebt.minimumPayment}`}
                </p>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-purple-600" />
                  How HELOC Chunking Works
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>Step 1:</strong> Take a "chunk" from your HELOC (e.g., $20,000)</p>
                  <p><strong>Step 2:</strong> Apply it as a lump sum payment to your mortgage principal</p>
                  <p><strong>Step 3:</strong> Deposit all income into the HELOC to pay it down quickly</p>
                  <p><strong>Step 4:</strong> Once HELOC is paid off, repeat with another chunk</p>
                  <p className="pt-2 text-purple-900 font-medium">
                    💡 This works because you're replacing mortgage interest with shorter-term HELOC debt that you pay off quickly with your cash flow.
                  </p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DebtPayoff;
