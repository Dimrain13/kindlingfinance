import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatCurrency } from '../utils/formatNumber';
import { RefreshCw, Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

const Subscriptions = () => {
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecurring();
  }, []);

  const loadRecurring = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions/recurring');
      setRecurring(response.data);
    } catch (error) {
      console.error('Failed to load recurring transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscriptions = recurring.filter(r => r.is_subscription);
  const otherRecurring = recurring.filter(r => !r.is_subscription);

  // Group subscriptions by type
  const groupedSubscriptions = subscriptions.reduce((groups, sub) => {
    const type = sub.subscription_type || 'Other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(sub);
    return groups;
  }, {});

  const totalMonthly = recurring
    .filter(r => r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.average_amount, 0);

  const totalAnnual = recurring.reduce((sum, r) => {
    const monthly = r.frequency === 'monthly' ? r.average_amount :
                   r.frequency === 'weekly' ? r.average_amount * 4 :
                   r.frequency === 'quarterly' ? r.average_amount / 3 :
                   r.average_amount / 12;
    return sum + (monthly * 12);
  }, 0);

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions & Recurring</h1>
          <p className="text-gray-600 mt-1">
            Track your recurring expenses and subscriptions
          </p>
        </div>
        <Button onClick={loadRecurring} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Monthly Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalMonthly)}</p>
                <p className="text-xs text-gray-500 mt-1">Recurring monthly</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Annual Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAnnual)}</p>
                <p className="text-xs text-gray-500 mt-1">Per year</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Items</p>
                <p className="text-2xl font-bold text-gray-900">{recurring.length}</p>
                <p className="text-xs text-gray-500 mt-1">{subscriptions.length} subscriptions</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Analyzing transactions...</p>
        </div>
      ) : (
        <>
          {/* Subscriptions by Category */}
          {subscriptions.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Subscriptions ({subscriptions.length})
              </h2>
              {Object.entries(groupedSubscriptions).map(([type, subs]) => (
                <Card key={type} className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                      <span>{type} ({subs.length})</span>
                      <span className="text-sm font-normal text-gray-600">
                        {formatCurrency(subs.reduce((sum, s) => sum + s.average_amount, 0))}/mo
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {subs.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-bold text-amber-600">
                                {item.merchant_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{item.merchant_name}</p>
                              <p className="text-sm text-gray-500">{item.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(item.average_amount)}</p>
                            <div className="flex items-center space-x-1 mt-1">
                              <span className="text-xs text-gray-500 capitalize">{item.frequency}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{item.transaction_count}x</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Other Recurring */}
          {otherRecurring.length > 0 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Other Recurring ({otherRecurring.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {otherRecurring.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-amber-600">
                            {item.merchant_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.merchant_name}</p>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(item.average_amount)}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="text-xs text-gray-500 capitalize">{item.frequency}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{item.transaction_count}x</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {recurring.length === 0 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No recurring transactions detected</p>
                  <p className="text-sm text-gray-500">
                    We need at least 3 transactions from the same merchant to detect patterns
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Subscriptions;
