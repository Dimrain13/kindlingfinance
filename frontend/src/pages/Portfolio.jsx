import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatNumber';
import { calculateNetWorth, calculatePortfolioValue } from '../utils/financialCalculations';
import { CHART_COLORS } from '../utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, PiggyBank, Bitcoin, Briefcase, DollarSign, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import NetWorthChart from '../components/NetWorthChart';
import CryptoHoldings from '../components/CryptoHoldings';
import InvestmentPerformanceEnhanced from '../components/InvestmentPerformanceEnhanced';
import DiversificationScore from '../components/DiversificationScore';

const Portfolio = () => {
  const [accounts, setAccounts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
    loadProperties();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await api.get('/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  // Categorize accounts
  const savingsAccounts = accounts.filter(acc => acc.account_type === 'savings');
  const investmentAccounts = accounts.filter(acc => acc.account_type === 'investment');
  const cryptoAccounts = accounts.filter(acc => acc.account_type === 'crypto');
  const checkingAccounts = accounts.filter(acc => acc.account_type === 'checking');
  const retirementAccounts = investmentAccounts.filter(acc => 
    acc.name.toLowerCase().includes('401k') || 
    acc.name.toLowerCase().includes('ira') || 
    acc.name.toLowerCase().includes('retirement')
  );

  // Calculate property values (use EQUITY, not full value)
  const totalPropertyEquity = properties.reduce((sum, prop) => {
    // If property has a mortgage, use equity. Otherwise use full value
    return sum + (prop.equity !== undefined ? prop.equity : prop.current_value);
  }, 0);
  const totalRealEstate = totalPropertyEquity; // Use equity for portfolio calculations

  // Calculate totals
  const totalChecking = checkingAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalInvestments = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalCrypto = cryptoAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalRetirement = retirementAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  // Portfolio value using utility (investment + savings + crypto + real estate)
  const totalPortfolio = calculatePortfolioValue(accounts) + totalRealEstate;
  
  // Net worth using utility (all assets - liabilities + real estate)
  const { netWorth, totalAssets, totalLiabilities } = calculateNetWorth(accounts);
  const netWorthWithRealEstate = netWorth + totalPropertyEquity;

  // Chart data - include real estate equity in portfolio breakdown
  const portfolioData = [
    { name: 'Real Estate Equity', value: totalRealEstate, color: '#10B981' }, // green
    { name: 'Savings', value: totalSavings, color: CHART_COLORS[1] },
    { name: 'Investments', value: totalInvestments, color: CHART_COLORS[0] },
    { name: 'Crypto', value: totalCrypto, color: CHART_COLORS[2] },
  ].filter(item => item.value > 0);

  const COLORS = CHART_COLORS;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-kindling-fire to-kindling-blaze bg-clip-text text-transparent">
            Portfolio
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your savings, investments, and assets
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-pink-500 via-rose-500 to-red-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Real Estate Equity</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(totalRealEstate)}</div>
            <p className="text-xs opacity-80 mt-2">{properties.length} propert{properties.length === 1 ? 'y' : 'ies'} (net equity)</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Savings</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <PiggyBank className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(totalSavings)}</div>
            <p className="text-xs opacity-80 mt-2">{savingsAccounts.length} account(s)</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Investments</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(totalInvestments)}</div>
            <p className="text-xs opacity-80 mt-2">{investmentAccounts.length} account(s)</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Crypto</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <Bitcoin className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(totalCrypto)}</div>
            <p className="text-xs opacity-80 mt-2">{cryptoAccounts.length} account(s)</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 text-white hover:-translate-y-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Portfolio</CardTitle>
            <div className="bg-white bg-opacity-20 p-2 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{formatCurrency(totalPortfolio)}</div>
            <p className="text-xs opacity-80 mt-2">All assets combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Tracking */}
      <NetWorthChart />

      {/* Investment Performance Analysis */}
      <InvestmentPerformanceEnhanced />

      {/* Diversification Score */}
      <DiversificationScore />

      {/* Crypto Holdings */}
      <CryptoHoldings />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation */}
        {portfolioData.length > 0 && (
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-kindling-fire" />
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={portfolioData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {portfolioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Retirement Accounts */}
        <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-kindling-fire" />
              Retirement Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {retirementAccounts.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="font-semibold">Total Retirement</span>
                  <span className="text-2xl font-bold text-kindling-fire">{formatCurrency(totalRetirement)}</span>
                </div>
                {retirementAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-sm text-gray-500">{acc.institution_name}</p>
                    </div>
                    <span className="font-bold">{formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No retirement accounts linked yet</p>
                <p className="text-sm mt-2">Connect your 401(k) or IRA</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Savings Accounts */}
        {savingsAccounts.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <PiggyBank className="h-5 w-5" />
                Savings Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savingsAccounts.map(acc => (
                  <div key={acc.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{acc.name}</p>
                        <p className="text-xs text-gray-500">{acc.institution_name}</p>
                      </div>
                      <span className="font-bold text-green-600">{formatCurrency(acc.balance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Investment Accounts */}
        {investmentAccounts.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-kindling-fire">
                <TrendingUp className="h-5 w-5" />
                Investment Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {investmentAccounts.map(acc => (
                  <div key={acc.id} className="p-3 bg-amber-50 dark:bg-blue-900/20 rounded-lg hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{acc.name}</p>
                        <p className="text-xs text-gray-500">{acc.institution_name}</p>
                      </div>
                      <span className="font-bold text-kindling-fire">{formatCurrency(acc.balance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Crypto Accounts */}
        {cryptoAccounts.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-kindling-fire">
                <Bitcoin className="h-5 w-5" />
                Crypto Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cryptoAccounts.map(acc => (
                  <div key={acc.id} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{acc.name}</p>
                        <p className="text-xs text-gray-500">{acc.institution_name}</p>
                      </div>
                      <span className="font-bold text-kindling-fire">{formatCurrency(acc.balance)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {totalPortfolio === 0 && (
        <Card className="shadow-xl">
          <CardContent className="text-center py-12">
            <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Portfolio Assets Yet</h3>
            <p className="text-gray-500 mb-6">
              Connect your savings, investment, and crypto accounts to track your portfolio
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Portfolio;
